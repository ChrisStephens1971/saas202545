import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

/**
 * Types for Free Use Bible API response structure.
 * API: https://bible.helloao.org/api/{translation}/{book}/{chapter}.json
 */
interface BibleVersePart {
  text?: string;
  heading?: string;
  lineBreak?: boolean;
  footnote?: unknown;
}

interface BibleVerseNode {
  type: 'verse' | 'heading' | string;
  number?: number;
  content?: (string | BibleVersePart)[];
}

interface BibleChapterData {
  chapter?: {
    number?: number;
    content?: BibleVerseNode[];
  };
}

// Input schema for scripture fetch
const ScriptureFetchInput = z.object({
  reference: z.string().trim().min(1), // e.g. "John 3:16-18"
  version: z.string().trim().optional(), // e.g. "eng-kjv" or translation ID
});

// Default translation if none specified
// BSB = Berean Standard Bible (free, no restrictions)
const DEFAULT_TRANSLATION = 'BSB';

// Helper to normalize translation ID
// Strips "(default)" and other extra text, returns uppercase ID
function normalizeTranslationId(raw?: string | null): string {
  if (!raw) return DEFAULT_TRANSLATION;

  // Strip things like "(default)" / extra text
  let cleaned = raw.trim();
  // Drop anything after the first space or "("
  cleaned = cleaned.split('(')[0].trim().split(/\s+/)[0].trim();
  if (!cleaned) return DEFAULT_TRANSLATION;
  return cleaned.toUpperCase();
}

// Helper to parse Bible reference into components
function parseBibleReference(reference: string): {
  bookId: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
} {
  // Simple parser for references like "John 3:16-18" or "John 3:16"
  // Format: Book Chapter:StartVerse-EndVerse or Book Chapter:Verse

  const match = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid reference format. Use format like "John 3:16" or "John 3:16-18"',
    });
  }

  const [, bookName, chapterStr, startVerseStr, endVerseStr] = match;
  const chapter = parseInt(chapterStr, 10);
  const startVerse = parseInt(startVerseStr, 10);
  const endVerse = endVerseStr ? parseInt(endVerseStr, 10) : startVerse;

  // Map book names to Free Use Bible API IDs
  // Using 3-letter abbreviations (UPPERCASE as required by API)
  const bookMap: Record<string, string> = {
    'genesis': 'GEN', 'gen': 'GEN',
    'exodus': 'EXO', 'exo': 'EXO',
    'leviticus': 'LEV', 'lev': 'LEV',
    'numbers': 'NUM', 'num': 'NUM',
    'deuteronomy': 'DEU', 'deu': 'DEU',
    'joshua': 'JOS', 'jos': 'JOS',
    'judges': 'JDG', 'jdg': 'JDG',
    'ruth': 'RUT', 'rut': 'RUT',
    '1 samuel': '1SA', '1sa': '1SA', '1 sam': '1SA',
    '2 samuel': '2SA', '2sa': '2SA', '2 sam': '2SA',
    '1 kings': '1KI', '1ki': '1KI', '1 kg': '1KI',
    '2 kings': '2KI', '2ki': '2KI', '2 kg': '2KI',
    '1 chronicles': '1CH', '1ch': '1CH', '1 chr': '1CH',
    '2 chronicles': '2CH', '2ch': '2CH', '2 chr': '2CH',
    'ezra': 'EZR', 'ezr': 'EZR',
    'nehemiah': 'NEH', 'neh': 'NEH',
    'esther': 'EST', 'est': 'EST',
    'job': 'JOB',
    'psalms': 'PSA', 'psa': 'PSA', 'psalm': 'PSA', 'ps': 'PSA',
    'proverbs': 'PRO', 'pro': 'PRO', 'prov': 'PRO',
    'ecclesiastes': 'ECC', 'ecc': 'ECC', 'eccl': 'ECC',
    'song of solomon': 'SNG', 'sng': 'SNG', 'song': 'SNG',
    'isaiah': 'ISA', 'isa': 'ISA',
    'jeremiah': 'JER', 'jer': 'JER',
    'lamentations': 'LAM', 'lam': 'LAM',
    'ezekiel': 'EZK', 'ezk': 'EZK',
    'daniel': 'DAN', 'dan': 'DAN',
    'hosea': 'HOS', 'hos': 'HOS',
    'joel': 'JOL', 'jol': 'JOL',
    'amos': 'AMO', 'amo': 'AMO',
    'obadiah': 'OBA', 'oba': 'OBA',
    'jonah': 'JON', 'jon': 'JON',
    'micah': 'MIC', 'mic': 'MIC',
    'nahum': 'NAM', 'nam': 'NAM',
    'habakkuk': 'HAB', 'hab': 'HAB',
    'zephaniah': 'ZEP', 'zep': 'ZEP',
    'haggai': 'HAG', 'hag': 'HAG',
    'zechariah': 'ZEC', 'zec': 'ZEC',
    'malachi': 'MAL', 'mal': 'MAL',
    'matthew': 'MAT', 'mat': 'MAT', 'matt': 'MAT', 'mt': 'MAT',
    'mark': 'MRK', 'mrk': 'MRK', 'mk': 'MRK',
    'luke': 'LUK', 'luk': 'LUK', 'lk': 'LUK',
    'john': 'JHN', 'jhn': 'JHN', 'jn': 'JHN',
    'acts': 'ACT', 'act': 'ACT',
    'romans': 'ROM', 'rom': 'ROM', 'rm': 'ROM',
    '1 corinthians': '1CO', '1co': '1CO', '1 cor': '1CO',
    '2 corinthians': '2CO', '2co': '2CO', '2 cor': '2CO',
    'galatians': 'GAL', 'gal': 'GAL',
    'ephesians': 'EPH', 'eph': 'EPH',
    'philippians': 'PHP', 'php': 'PHP', 'phil': 'PHP',
    'colossians': 'COL', 'col': 'COL',
    '1 thessalonians': '1TH', '1th': '1TH', '1 thess': '1TH',
    '2 thessalonians': '2TH', '2th': '2TH', '2 thess': '2TH',
    '1 timothy': '1TI', '1ti': '1TI', '1 tim': '1TI',
    '2 timothy': '2TI', '2ti': '2TI', '2 tim': '2TI',
    'titus': 'TIT', 'tit': 'TIT',
    'philemon': 'PHM', 'phm': 'PHM',
    'hebrews': 'HEB', 'heb': 'HEB',
    'james': 'JAS', 'jas': 'JAS', 'jam': 'JAS',
    '1 peter': '1PE', '1pe': '1PE', '1 pet': '1PE',
    '2 peter': '2PE', '2pe': '2PE', '2 pet': '2PE',
    '1 john': '1JN', '1jn': '1JN',
    '2 john': '2JN', '2jn': '2JN',
    '3 john': '3JN', '3jn': '3JN',
    'jude': 'JUD', 'jud': 'JUD',
    'revelation': 'REV', 'rev': 'REV',
  };

  const normalizedBookName = bookName.trim().toLowerCase();
  const bookId = bookMap[normalizedBookName];

  if (!bookId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Unknown book: "${bookName}". Please use standard book names (e.g. "John", "1 Corinthians").`,
    });
  }

  return {
    bookId,
    chapter,
    startVerse,
    endVerse,
  };
}

// Helper to build Free Use Bible API URL
function buildFreeUseBibleUrl(
  translation: string,
  bookId: string,
  chapter: number
): string {
  // Free Use Bible API endpoint format:
  // https://bible.helloao.org/api/{translation}/{book}/{chapter}.json
  return `https://bible.helloao.org/api/${translation}/${bookId}/${chapter}.json`;
}

// Helper to extract verses from chapter JSON
function extractVersesFromChapterJson(
  data: BibleChapterData,
  startVerse: number,
  endVerse: number
): string {
  // Free Use Bible API actual response structure:
  // {
  //   translation: { ... },
  //   chapter: {
  //     number: 3,
  //     content: [
  //       { type: 'verse', number: 1, content: [...] },
  //       { type: 'verse', number: 2, content: [...] },
  //       ...
  //     ]
  //   }
  // }

  const content = data?.chapter?.content;
  if (!Array.isArray(content)) {
    console.error('[scripture.fetch] Unexpected chapter structure:', JSON.stringify(data).slice(0, 500));
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected API response format from Scripture provider. Check server logs for details.',
    });
  }

  const lines: string[] = [];

  for (const node of content) {
    // Only process verse nodes
    if (node?.type !== 'verse') continue;

    const verseNum = node.number;
    if (typeof verseNum !== 'number') continue;

    // Filter to requested verse range
    if (verseNum < startVerse || verseNum > endVerse) continue;

    // Flatten verse content array into text
    // content is an array that can contain: strings, FormattedText, InlineHeading, etc.
    const parts = (node.content ?? []).map((part) => {
      // Plain string
      if (typeof part === 'string') return part;

      // Object with various types
      if (part && typeof part === 'object') {
        // FormattedText: { text: "...", ... }
        if ('text' in part && typeof part.text === 'string') {
          return part.text;
        }
        // InlineHeading: { heading: "..." }
        if ('heading' in part && typeof part.heading === 'string') {
          return part.heading;
        }
        // InlineLineBreak: { lineBreak: true }
        if ('lineBreak' in part) {
          return '\n';
        }
        // VerseFootnoteReference: ignore for now
        if ('footnote' in part) {
          return '';
        }
      }
      return '';
    });

    const verseText = parts.join('').replace(/\s+/g, ' ').trim();
    if (verseText) {
      lines.push(`${verseNum} ${verseText}`);
    }
  }

  if (!lines.length) {
    const verseNodes = content
      .filter((n): n is BibleVerseNode => n?.type === 'verse')
      .map((n) => n.number);
    console.error('[scripture.fetch] No verses found in range', {
      startVerse,
      endVerse,
      contentLength: content.length,
      verseNodes
    });
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Could not find verses ${startVerse}-${endVerse} in this chapter. Check the verse numbers.`,
    });
  }

  return lines.join('\n');
}

// Scripture router
export const scriptureRouter = router({
  fetch: publicProcedure
    .input(ScriptureFetchInput)
    .mutation(async ({ input }) => {
      // Normalize translation ID (strips "(default)" and other extra text)
      const translation = normalizeTranslationId(input.version);

      // Parse the reference
      const { bookId, chapter, startVerse, endVerse } = parseBibleReference(
        input.reference
      );

      // Build API URL
      const apiUrl = buildFreeUseBibleUrl(translation, bookId, chapter);

      // Fetch from API with logging
      console.log('[scripture.fetch] Fetching URL:', apiUrl);
      const res = await fetch(apiUrl);

      // Log response details
      const contentType = res.headers.get('content-type');
      console.log('[scripture.fetch] Response status:', res.status, 'content-type:', contentType);

      // Check response status
      if (!res.ok) {
        const body = await res.text();
        console.error('[scripture.fetch] Non-OK response body:', body.slice(0, 500));
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Scripture API error ${res.status}: ${res.statusText}. Translation "${translation}" may not be available.`,
        });
      }

      // CRITICAL: Check content-type before calling .json()
      // This prevents "Unexpected token '<'" error when API returns HTML
      if (!contentType?.includes('application/json')) {
        const body = await res.text();
        console.error('[scripture.fetch] Expected JSON but got:', contentType, 'body:', body.slice(0, 500));
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Scripture API returned non-JSON content (likely docs or an error page). Check that the translation and book exist.',
        });
      }

      const data = await res.json() as BibleChapterData;

      // Extract the verses
      const passageText = extractVersesFromChapterJson(
        data,
        startVerse,
        endVerse
      );

      return {
        reference: input.reference,
        version: translation,
        text: passageText,
      };
    }),
});
