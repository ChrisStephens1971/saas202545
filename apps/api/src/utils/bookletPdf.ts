import { PDFDocument, PDFPage } from 'pdf-lib';

/**
 * Create a 4-page booklet PDF with proper imposition
 *
 * CONSTRAINTS:
 * - Maximum 4 logical pages (enforced)
 * - Shorter bulletins get blank slots (null pages, rendered as white space)
 * - Oversized bulletins (>4 pages) throw error with code 'BULLETIN_TOO_LONG'
 *
 * IMPOSITION MAPPING:
 * - Front sheet (landscape): Page 4 (left) | Page 1 (right)
 * - Back sheet (landscape):  Page 2 (left) | Page 3 (right)
 *
 * When printed double-sided (flip on short edge) and folded in half,
 * the pages appear in correct reading order: 1, 2, 3, 4
 *
 * BLANK PAGE HANDLING:
 * - Blank pages are represented as null (not actual PDF pages)
 * - This avoids "Can't embed page with missing Contents" errors
 * - Blank slots are rendered as white space on the landscape spread
 *
 * EXAMPLE OUTPUTS:
 * - 1-page input → Front: [blank|1], Back: [blank|blank]
 * - 2-page input → Front: [blank|1], Back: [2|blank]
 * - 3-page input → Front: [blank|1], Back: [2|3]
 * - 4-page input → Front: [4|1], Back: [2|3]
 * - 5-page input → Throws BULLETIN_TOO_LONG error
 *
 * @param normalPdfBuffer - Buffer containing a portrait PDF (1-4 pages from Playwright)
 * @returns Buffer containing 2-page landscape booklet PDF
 * @throws Error with code 'BULLETIN_TOO_LONG' if input has more than 4 pages
 */
export async function createFourPageBookletPdf(normalPdfBuffer: Buffer): Promise<Buffer> {
  console.log('[Booklet] Loading input PDF...');
  const srcDoc = await PDFDocument.load(normalPdfBuffer);
  const srcPageCount = srcDoc.getPageCount();

  console.log('[Booklet] Input PDF has', srcPageCount, 'pages');

  // Enforce max 4 pages for booklet mode
  if (srcPageCount > 4) {
    const error = new Error(
      `This bulletin is too long for a 4-page booklet (got ${srcPageCount} pages). ` +
      `Please remove some content (fewer announcements or a shorter order of service) and try again.`
    );
    // Add error code for programmatic handling (Node.js style)
    (error as Error & { code: string }).code = 'BULLETIN_TOO_LONG';
    throw error;
  }

  // Create booklet output document
  const bookletDoc = await PDFDocument.create();

  // Copy ALL REAL pages from source PDF to booklet PDF
  console.log('[Booklet] Copying', srcPageCount, 'real page(s) from source PDF...');
  const realPages = await bookletDoc.copyPages(
    srcDoc,
    Array.from({ length: srcPageCount }, (_, i) => i)
  );
  console.log('[Booklet] Pages copied successfully');

  // Build logical pages array of length 4: real pages first, then nulls as blanks
  type MaybePage = PDFPage | null;
  const logicalPages: MaybePage[] = [null, null, null, null];
  for (let i = 0; i < srcPageCount; i++) {
    logicalPages[i] = realPages[i];
  }

  // Log which pages are real vs blank
  for (let i = 0; i < 4; i++) {
    if (logicalPages[i]) {
      console.log(`[Booklet] Logical page ${i + 1}: real content`);
    } else {
      console.log(`[Booklet] Logical page ${i + 1}: blank`);
    }
  }

  const [page1, page2, page3, page4] = logicalPages;

  // Define spreads for booklet imposition
  // Front sheet: page 4 (left) | page 1 (right)
  // Back sheet: page 2 (left) | page 3 (right)
  const spreads: [MaybePage, MaybePage][] = [
    [page4, page1], // front: 4 | 1
    [page2, page3], // back: 2 | 3
  ];

  console.log('[Booklet] Creating landscape spreads...');

  // US Letter landscape dimensions (11 x 8.5 inches)
  const inch = 72; // PDF points per inch
  const pageWidth = 11 * inch;
  const pageHeight = 8.5 * inch;

  /**
   * Helper to draw two portrait pages side by side on a landscape sheet
   * Handles null pages by leaving that half blank
   */
  async function addSpread(leftPage: PDFPage | null, rightPage: PDFPage | null) {
    const spread = bookletDoc.addPage([pageWidth, pageHeight]);
    const halfWidth = pageWidth / 2;

    // LEFT SIDE
    if (leftPage) {
      // Embed the page before drawing it (required by pdf-lib API)
      const embeddedLeft = await bookletDoc.embedPage(leftPage);

      const leftSize = leftPage.getSize();
      const leftScale = Math.min(
        halfWidth / leftSize.width,
        pageHeight / leftSize.height
      );

      const scaledLeftWidth = leftSize.width * leftScale;
      const scaledLeftHeight = leftSize.height * leftScale;

      // Center left page vertically and horizontally in left half
      const leftX = (halfWidth - scaledLeftWidth) / 2;
      const leftY = (pageHeight - scaledLeftHeight) / 2;

      spread.drawPage(embeddedLeft, {
        x: leftX,
        y: leftY,
        xScale: leftScale,
        yScale: leftScale,
      });
    }
    // Else: leave left half blank (no drawing)

    // RIGHT SIDE
    if (rightPage) {
      // Embed the page before drawing it (required by pdf-lib API)
      const embeddedRight = await bookletDoc.embedPage(rightPage);

      const rightSize = rightPage.getSize();
      const rightScale = Math.min(
        halfWidth / rightSize.width,
        pageHeight / rightSize.height
      );

      const scaledRightWidth = rightSize.width * rightScale;
      const scaledRightHeight = rightSize.height * rightScale;

      // Center right page vertically and horizontally in right half
      const rightX = halfWidth + (halfWidth - scaledRightWidth) / 2;
      const rightY = (pageHeight - scaledRightHeight) / 2;

      spread.drawPage(embeddedRight, {
        x: rightX,
        y: rightY,
        xScale: rightScale,
        yScale: rightScale,
      });
    }
    // Else: leave right half blank (no drawing)
  }

  // Add each spread to the booklet
  for (let i = 0; i < spreads.length; i++) {
    const [left, right] = spreads[i];
    const spreadNum = i + 1;

    // Determine page numbers for logging
    let leftPageNum: number | string = 'blank';
    let rightPageNum: number | string = 'blank';

    if (left === page4) leftPageNum = 4;
    else if (left === page2) leftPageNum = 2;

    if (right === page1) rightPageNum = 1;
    else if (right === page3) rightPageNum = 3;

    console.log(`[Booklet] Adding spread ${spreadNum}: page ${leftPageNum} (left) + page ${rightPageNum} (right)`);
    await addSpread(left, right);
  }

  console.log('[Booklet] Saving booklet PDF...');
  const outBytes = await bookletDoc.save();

  console.log('[Booklet] Booklet PDF created, size:', outBytes.length, 'bytes');
  return Buffer.from(outBytes);
}
