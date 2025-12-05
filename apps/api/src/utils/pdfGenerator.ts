import { chromium, Browser } from 'playwright';

let browserInstance: Browser | null = null;

/**
 * Get or create a singleton browser instance
 * This avoids repeatedly launching/closing browsers which is expensive
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    console.log('[PDF] Launching Chromium browser...');
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    console.log('[PDF] Browser launched successfully');
  }
  return browserInstance;
}

/**
 * Generate PDF from a URL using headless Chromium
 * @param url - Full URL to the page to convert to PDF
 * @param cookieHeader - Optional cookie header string to pass authentication
 * @returns PDF as Buffer
 */
export async function createPdfFromUrl(
  url: string,
  cookieHeader?: string
): Promise<Buffer> {
  console.log('[PDF] Starting PDF generation for URL:', url);
  console.log('[PDF] Has cookies:', !!cookieHeader);
  console.log('[PDF] Cookie header length:', cookieHeader?.length || 0);

  const browser = await getBrowser();

  // Create context with auth cookies if provided
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 },
    extraHTTPHeaders: cookieHeader
      ? { cookie: cookieHeader }
      : undefined,
  });
  const page = await context.newPage();

  try {
    console.log('[PDF] Navigating to URL...');
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000, // 30 second timeout
    });

    // Detect if we landed on the login page instead of the bulletin
    const pageUrl = page.url();
    const html = await page.content();

    if (
      pageUrl.includes('/login') ||
      pageUrl.includes('/auth/') ||
      (html.toLowerCase().includes('sign in') && html.toLowerCase().includes('password')) ||
      html.includes('name="login"')
    ) {
      console.error('[PDF] Detected login page instead of bulletin', {
        requestedUrl: url,
        actualUrl: pageUrl,
      });
      throw new Error('AUTHENTICATION_FAILED');
    }

    console.log('[PDF] Page loaded, waiting for bulletin data to render...');

    // Wait for the bulletin data to be fully loaded and rendered
    // The print page sets data-print-ready="true" when all TRPC queries complete
    try {
      await page.waitForSelector('[data-print-ready="true"]', {
        timeout: 15000, // 15 second timeout
        state: 'attached',
      });
      console.log('[PDF] Bulletin data ready, generating PDF...');
    } catch (waitError) {
      console.error('[PDF] Timeout waiting for bulletin data to load', {
        requestedUrl: url,
        error: waitError,
      });
      throw new Error('BULLETIN_DATA_TIMEOUT');
    }

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    console.log('[PDF] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
  } catch (error) {
    console.error('[PDF] Error generating PDF:', error);
    throw error;
  } finally {
    await page.close();
    await context.close();
  }
}

/**
 * Close the browser instance (call on app shutdown if needed)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('[PDF] Closing browser...');
    await browserInstance.close();
    browserInstance = null;
  }
}
