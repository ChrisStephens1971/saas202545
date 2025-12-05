import { describe, it, expect } from '@jest/globals';
import { PDFDocument } from 'pdf-lib';
import { createFourPageBookletPdf } from './bookletPdf';

/**
 * Tests for 4-page booklet PDF generation
 *
 * These tests verify:
 * - Short bulletins (1-3 pages) are padded with blanks and succeed
 * - Normal bulletins (4 pages) succeed
 * - Oversized bulletins (>4 pages) throw BULLETIN_TOO_LONG error
 */

describe('createFourPageBookletPdf', () => {
  /**
   * Helper to create a simple test PDF with N pages
   */
  async function createTestPdf(pageCount: number): Promise<Buffer> {
    const doc = await PDFDocument.create();

    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage([612, 792]); // US Letter portrait

      // Add some text to make it a real page with content
      page.drawText(`Page ${i + 1}`, {
        x: 50,
        y: 750,
        size: 24,
      });
    }

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  it('should handle 2-page bulletin (short, needs blanks)', async () => {
    const inputPdf = await createTestPdf(2);

    const result = await createFourPageBookletPdf(inputPdf);

    // Should return a non-empty PDF
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    // Verify it's a valid PDF
    const bookletDoc = await PDFDocument.load(result);

    // Should have exactly 2 pages (landscape spreads)
    expect(bookletDoc.getPageCount()).toBe(2);

    // Both pages should be landscape (11" x 8.5" = 792 x 612 points)
    const page1 = bookletDoc.getPage(0);
    const page2 = bookletDoc.getPage(1);

    expect(page1.getWidth()).toBeCloseTo(792, 1); // 11 inches
    expect(page1.getHeight()).toBeCloseTo(612, 1); // 8.5 inches
    expect(page2.getWidth()).toBeCloseTo(792, 1);
    expect(page2.getHeight()).toBeCloseTo(612, 1);
  });

  it('should handle 4-page bulletin (perfect fit)', async () => {
    const inputPdf = await createTestPdf(4);

    const result = await createFourPageBookletPdf(inputPdf);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    const bookletDoc = await PDFDocument.load(result);
    expect(bookletDoc.getPageCount()).toBe(2);
  });

  it('should handle 1-page bulletin (minimal, mostly blanks)', async () => {
    const inputPdf = await createTestPdf(1);

    const result = await createFourPageBookletPdf(inputPdf);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    const bookletDoc = await PDFDocument.load(result);
    expect(bookletDoc.getPageCount()).toBe(2);
  });

  it('should throw BULLETIN_TOO_LONG for 5-page bulletin', async () => {
    const inputPdf = await createTestPdf(5);

    await expect(async () => {
      await createFourPageBookletPdf(inputPdf);
    }).rejects.toThrow(/too long for a 4-page booklet/);

    // Verify the error has the correct code
    try {
      await createFourPageBookletPdf(inputPdf);
      fail('Should have thrown an error');
    } catch (error: unknown) {
      // Type guard for Error with code property (Node.js style errors)
      const err = error as Error & { code?: string };
      expect(err.code).toBe('BULLETIN_TOO_LONG');
      expect(err.message).toContain('got 5 pages');
    }
  });

  it('should throw BULLETIN_TOO_LONG for 10-page bulletin', async () => {
    const inputPdf = await createTestPdf(10);

    await expect(async () => {
      await createFourPageBookletPdf(inputPdf);
    }).rejects.toThrow(/too long for a 4-page booklet/);

    try {
      await createFourPageBookletPdf(inputPdf);
      fail('Should have thrown an error');
    } catch (error: unknown) {
      // Type guard for Error with code property (Node.js style errors)
      const err = error as Error & { code?: string };
      expect(err.code).toBe('BULLETIN_TOO_LONG');
      expect(err.message).toContain('got 10 pages');
    }
  });

  it('should handle 3-page bulletin', async () => {
    const inputPdf = await createTestPdf(3);

    const result = await createFourPageBookletPdf(inputPdf);

    expect(result).toBeDefined();
    const bookletDoc = await PDFDocument.load(result);
    expect(bookletDoc.getPageCount()).toBe(2);
  });
});
