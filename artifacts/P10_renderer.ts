/**
 * Elder-First Church Platform - Playwright Render Service
 * Version: 1.0
 *
 * This service uses Playwright (headless Chromium) to render bulletin templates
 * into multiple output formats: PDF, JPG slides, MP4 loop video, and email HTML.
 *
 * Container: Azure Container App (Node 20 + Playwright + FFmpeg)
 * Storage: Azure Blob Storage + CDN
 */

import { chromium, Browser, Page } from 'playwright';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import juice from 'juice'; // Inline CSS for email
import QRCode from 'qrcode';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Playwright
  viewport: {
    width: 1280,
    height: 720,
  },
  viewport_large_print: {
    width: 1536, // 1280 × 1.2
    height: 864,  // 720 × 1.2
  },
  timeout: 120000, // 2 minutes
  retries: 3,

  // Azure Blob Storage
  blob_connection_string: process.env.AZURE_STORAGE_CONNECTION_STRING!,
  blob_container: 'bulletins',
  cdn_endpoint: process.env.AZURE_CDN_ENDPOINT || 'https://cdn.elderfirst.app',

  // PDF Options
  pdf: {
    format: 'Letter' as const,
    printBackground: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    preferCSSPageSize: true,
  },

  // Slide Options
  slides: {
    width: 1920,
    height: 1080,
    quality: 85, // JPEG quality
  },

  // Video Options
  video: {
    fps: 30,
    duration_per_slide: 10, // seconds
    fade_duration: 1, // seconds
  },
};

// ============================================================================
// Types
// ============================================================================

interface RenderOptions {
  issueId: string;
  tenantId: string;
  html: string;
  brandPack?: BrandPack;
  watermark?: 'PROOF' | 'UPDATED';
  watermarkTimestamp?: Date;
}

interface BrandPack {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  church_name: string;
  church_website: string;
}

interface RenderResult {
  url: string;
  hash: string;
  size_bytes: number;
}

interface SlidesResult {
  slides: RenderResult[];
  total_slides: number;
}

// ============================================================================
// Browser Management
// ============================================================================

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Docker memory fix
        '--disable-web-security', // Allow cross-origin fonts
      ],
    });
  }
  return browserInstance;
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// Cleanup on process exit
process.on('exit', () => {
  closeBrowser();
});

// ============================================================================
// Retry Logic
// ============================================================================

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = CONFIG.retries,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;

    console.warn(`Retry failed, ${retries} attempts remaining`, error);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
  }
}

// ============================================================================
// Render PDF
// ============================================================================

/**
 * Render bulletin HTML to PDF
 * @param options - Render options including HTML, watermark, brand pack
 * @returns PDF file URL and metadata
 */
export async function renderPdf(options: RenderOptions): Promise<RenderResult> {
  return withRetry(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage({
      viewport: CONFIG.viewport,
    });

    try {
      // Set content with fonts loaded
      await page.setContent(options.html, { waitUntil: 'networkidle' });

      // Add watermark if needed
      if (options.watermark) {
        await addWatermark(page, options.watermark, options.watermarkTimestamp);
      }

      // Generate PDF
      const pdfBuffer = await page.pdf(CONFIG.pdf);

      // Upload to Blob Storage
      const filename = `bulletin-${new Date().toISOString().split('T')[0]}.pdf`;
      const result = await uploadToBlob(
        pdfBuffer,
        filename,
        options.issueId,
        options.tenantId,
        'application/pdf'
      );

      return result;
    } finally {
      await page.close();
    }
  });
}

/**
 * Render large-print PDF (120% scale)
 */
export async function renderLargePrintPdf(
  options: RenderOptions
): Promise<RenderResult> {
  return withRetry(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage({
      viewport: CONFIG.viewport_large_print,
    });

    try {
      await page.setContent(options.html, { waitUntil: 'networkidle' });

      // Apply 120% scale
      await page.addStyleTag({
        content: `
          .bulletin-layout {
            transform: scale(1.2);
            transform-origin: top left;
          }
        `,
      });

      // Add watermark if needed
      if (options.watermark) {
        await addWatermark(page, options.watermark, options.watermarkTimestamp);
      }

      const pdfBuffer = await page.pdf(CONFIG.pdf);

      const filename = `bulletin-${new Date().toISOString().split('T')[0]}-large.pdf`;
      const result = await uploadToBlob(
        pdfBuffer,
        filename,
        options.issueId,
        options.tenantId,
        'application/pdf'
      );

      return result;
    } finally {
      await page.close();
    }
  });
}

// ============================================================================
// Render Slides (JPG Set)
// ============================================================================

/**
 * Render bulletin as presentation slides (1920x1080 JPGs)
 * @param options - Render options
 * @returns Array of slide URLs
 */
export async function renderSlides(
  options: RenderOptions & { slideBlocks: string[] }
): Promise<SlidesResult> {
  return withRetry(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage({
      viewport: {
        width: CONFIG.slides.width,
        height: CONFIG.slides.height,
      },
    });

    const slides: RenderResult[] = [];

    try {
      for (const [index, blockHTML] of options.slideBlocks.entries()) {
        // Set slide content
        await page.setContent(
          wrapSlideHTML(blockHTML, options.brandPack),
          { waitUntil: 'networkidle' }
        );

        // Screenshot
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: CONFIG.slides.quality,
          fullPage: false, // Fixed viewport
        });

        // Upload
        const filename = `slide-${String(index + 1).padStart(2, '0')}.jpg`;
        const result = await uploadToBlob(
          screenshot,
          filename,
          options.issueId,
          options.tenantId,
          'image/jpeg'
        );

        slides.push(result);
      }

      return {
        slides,
        total_slides: slides.length,
      };
    } finally {
      await page.close();
    }
  });
}

/**
 * Wrap slide block in full HTML template
 */
function wrapSlideHTML(blockHTML: string, brandPack?: BrandPack): string {
  const bgColor = brandPack?.primary_color || '#0052A3';
  const textColor = '#FFFFFF';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          width: 1920px;
          height: 1080px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${bgColor};
          color: ${textColor};
          font-family: 'Inter', Arial, sans-serif;
          font-size: 48px;
          line-height: 1.5;
          text-align: center;
          padding: 80px;
        }
        .slide-content {
          max-width: 1600px;
        }
        h1, h2, h3 {
          margin-bottom: 40px;
          font-weight: 700;
        }
        h1 { font-size: 96px; }
        h2 { font-size: 72px; }
        h3 { font-size: 60px; }
        p { font-size: 48px; margin-bottom: 30px; }
        ul { list-style: none; }
        li { margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="slide-content">
        ${blockHTML}
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// Render Loop Video (MP4)
// ============================================================================

/**
 * Stitch slide JPGs into looping MP4 video
 * @param slideUrls - Array of slide image URLs
 * @param issueId - Bulletin issue ID
 * @param tenantId - Tenant ID
 * @returns Video file URL and metadata
 */
export async function renderLoopVideo(
  slideUrls: string[],
  issueId: string,
  tenantId: string
): Promise<RenderResult> {
  return withRetry(async () => {
    // Download slides to temp directory
    const tempDir = path.join('/tmp', `bulletin-${issueId}-video`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Download all slides
      for (const [index, url] of slideUrls.entries()) {
        const response = await fetch(url);
        const buffer = Buffer.from(await response.arrayBuffer());
        const filename = `slide-${String(index + 1).padStart(2, '0')}.jpg`;
        await fs.writeFile(path.join(tempDir, filename), buffer);
      }

      // Generate video with FFmpeg
      const videoPath = path.join(tempDir, 'loop.mp4');

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(path.join(tempDir, 'slide-%02d.jpg'))
          .inputFPS(1 / CONFIG.video.duration_per_slide) // 1 frame per 10 seconds
          .outputOptions([
            '-vf',
            `fade=t=in:st=0:d=${CONFIG.video.fade_duration},fade=t=out:st=${
              CONFIG.video.duration_per_slide - CONFIG.video.fade_duration
            }:d=${CONFIG.video.fade_duration}`,
            '-c:v',
            'libx264',
            '-pix_fmt',
            'yuv420p',
            '-r',
            String(CONFIG.video.fps),
            '-movflags',
            '+faststart', // Web-optimized
          ])
          .save(videoPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      // Upload video
      const videoBuffer = await fs.readFile(videoPath);
      const result = await uploadToBlob(
        videoBuffer,
        'loop.mp4',
        issueId,
        tenantId,
        'video/mp4'
      );

      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });

      return result;
    } catch (error) {
      // Cleanup on error
      await fs.rm(tempDir, { recursive: true, force: true });
      throw error;
    }
  });
}

// ============================================================================
// Render Email HTML
// ============================================================================

/**
 * Generate email-friendly HTML with inlined CSS
 * @param options - Render options
 * @returns Inlined HTML string and upload result
 */
export async function renderEmailHTML(
  options: RenderOptions
): Promise<{ html: string; result: RenderResult }> {
  return withRetry(async () => {
    // Inline CSS using Juice
    const inlinedHTML = juice(options.html, {
      removeStyleTags: true,
      preserveMediaQueries: false,
      preserveFontFaces: false,
    });

    // Wrap in email template
    const emailHTML = wrapEmailHTML(inlinedHTML, options.brandPack);

    // Upload as .html file
    const buffer = Buffer.from(emailHTML, 'utf-8');
    const result = await uploadToBlob(
      buffer,
      'bulletin-email.html',
      options.issueId,
      options.tenantId,
      'text/html'
    );

    return {
      html: emailHTML,
      result,
    };
  });
}

/**
 * Wrap content in email-safe HTML template
 */
function wrapEmailHTML(content: string, brandPack?: BrandPack): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Weekly Bulletin - ${brandPack?.church_name || 'Church'}</title>
      <style type="text/css">
        /* Email-safe reset */
        body {
          margin: 0;
          padding: 0;
          width: 100% !important;
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        table {
          border-collapse: collapse;
        }
        img {
          border: 0;
          height: auto;
          line-height: 100%;
          outline: none;
          text-decoration: none;
        }
      </style>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
      <!-- Preheader (hidden preview text) -->
      <div style="display: none; max-height: 0; overflow: hidden;">
        This week's bulletin from ${brandPack?.church_name || 'Church'}
      </div>

      <!-- Main Container -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <!-- Content Table (600px width for email clients) -->
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px;">
                  ${content}
                </td>
              </tr>
            </table>

            <!-- Footer -->
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
              <tr>
                <td align="center" style="color: #999; font-size: 12px; padding: 20px;">
                  <p>${brandPack?.church_name || 'Church'} | ${brandPack?.church_website || ''}</p>
                  <p><a href="{{unsubscribe}}" style="color: #999; text-decoration: underline;">Unsubscribe</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ============================================================================
// Watermark Utilities
// ============================================================================

async function addWatermark(
  page: Page,
  type: 'PROOF' | 'UPDATED',
  timestamp?: Date
): Promise<void> {
  if (type === 'PROOF') {
    await page.addStyleTag({
      content: `
        body::before {
          content: 'PROOF';
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          font-weight: bold;
          color: rgba(0, 0, 0, 0.08);
          pointer-events: none;
          z-index: 9999;
          user-select: none;
        }
      `,
    });
  } else if (type === 'UPDATED' && timestamp) {
    const formattedDate = timestamp.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    await page.addStyleTag({
      content: `
        body::after {
          content: 'UPDATED ${formattedDate}';
          position: fixed;
          bottom: 0.5in;
          left: 50%;
          transform: translateX(-50%);
          background: #C8102E;
          color: white;
          padding: 8px 16px;
          font-size: 10pt;
          font-weight: bold;
          border-radius: 4px;
          z-index: 9998;
        }
      `,
    });
  }
}

// ============================================================================
// QR Code Generation
// ============================================================================

export async function generateQRCode(url: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrDataURL; // Returns base64 data URL
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw error;
  }
}

// ============================================================================
// Azure Blob Storage Upload
// ============================================================================

async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  issueId: string,
  tenantId: string,
  contentType: string
): Promise<RenderResult> {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    CONFIG.blob_connection_string
  );

  const containerClient = blobServiceClient.getContainerClient(
    CONFIG.blob_container
  );

  // Ensure container exists
  await containerClient.createIfNotExists({
    access: 'blob', // Public read access
  });

  // Blob path: bulletins/{tenantId}/{issueId}/{filename}
  const blobName = `${tenantId}/${issueId}/${filename}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // Upload with metadata
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: contentType,
      blobCacheControl: 'public, max-age=31536000', // 1 year cache
    },
    metadata: {
      issue_id: issueId,
      tenant_id: tenantId,
      uploaded_at: new Date().toISOString(),
    },
  });

  // Generate content hash (SHA-256)
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    url: `${CONFIG.cdn_endpoint}/${CONFIG.blob_container}/${blobName}`,
    hash: `sha256:${hash}`,
    size_bytes: buffer.length,
  };
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Health check endpoint for Container App
 */
export async function healthCheck(): Promise<{ status: string; browser: boolean }> {
  try {
    const browser = await getBrowser();
    return {
      status: 'healthy',
      browser: browser.isConnected(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      browser: false,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  renderPdf,
  renderLargePrintPdf,
  renderSlides,
  renderLoopVideo,
  renderEmailHTML,
  generateQRCode,
  healthCheck,
  closeBrowser,
};
