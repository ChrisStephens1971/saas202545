/**
 * Bulletin formatting utilities
 *
 * Provides consistent formatting for service items across all bulletin views
 * (Canvas editor, print/PDF, digital, etc.)
 */

/**
 * Service item with optional song metadata from the API
 */
export interface ServiceItemWithSongMeta {
  title?: string | null;
  type?: string;
  songId?: string | null;
  songTitle?: string | null;
  songHymnNumber?: string | null;
  songHymnalCode?: string | null;
  songCcliNumber?: string | null;
}

/**
 * Formats a service item title with song metadata when available.
 *
 * Priority:
 * 1. If hymn number + hymnal code exist: "Hymn {hymnNumber} — {songTitle} ({hymnalCode})"
 * 2. If hymn number only: "Hymn {hymnNumber} — {songTitle}"
 * 3. If songTitle exists (no hymn number): "{songTitle}"
 * 4. Fallback to the existing service item title
 * 5. Final fallback to type or empty string
 *
 * @param item - Service item with optional song metadata
 * @returns Formatted title string
 *
 * @example
 * // With hymn number and hymnal code
 * formatServiceItemTitle({ songTitle: "Great Is Thy Faithfulness", songHymnNumber: "140", songHymnalCode: "UMH" })
 * // => "Hymn 140 — Great Is Thy Faithfulness (UMH)"
 *
 * @example
 * // With hymn number only
 * formatServiceItemTitle({ songTitle: "Amazing Grace", songHymnNumber: "378" })
 * // => "Hymn 378 — Amazing Grace"
 *
 * @example
 * // With song title only (contemporary song)
 * formatServiceItemTitle({ songTitle: "10,000 Reasons" })
 * // => "10,000 Reasons"
 *
 * @example
 * // No song metadata, use item title
 * formatServiceItemTitle({ title: "Call to Worship" })
 * // => "Call to Worship"
 */
export function formatServiceItemTitle(item: ServiceItemWithSongMeta): string {
  // Check if we have song metadata to use
  const hasSongTitle = item.songTitle && item.songTitle.trim().length > 0;
  const hasHymnNumber = item.songHymnNumber && item.songHymnNumber.trim().length > 0;
  const hasHymnalCode = item.songHymnalCode && item.songHymnalCode.trim().length > 0;

  if (hasSongTitle) {
    const songTitle = item.songTitle!.trim();

    if (hasHymnNumber) {
      const hymnNumber = item.songHymnNumber!.trim();

      if (hasHymnalCode) {
        // Full format: "Hymn 140 — Great Is Thy Faithfulness (UMH)"
        return `Hymn ${hymnNumber} — ${songTitle} (${item.songHymnalCode!.trim()})`;
      }

      // Hymn number without hymnal code: "Hymn 378 — Amazing Grace"
      return `Hymn ${hymnNumber} — ${songTitle}`;
    }

    // Song title only (contemporary songs, etc.): "10,000 Reasons"
    return songTitle;
  }

  // No song metadata - fall back to item title
  if (item.title && item.title.trim().length > 0) {
    return item.title.trim();
  }

  // Final fallback to type or empty
  return item.type || '';
}

/**
 * Gets the CCLI number for a service item if available.
 * Useful for displaying licensing information.
 *
 * @param item - Service item with optional song metadata
 * @returns CCLI number string or null if not available
 */
export function getServiceItemCcliNumber(item: ServiceItemWithSongMeta): string | null {
  if (item.songCcliNumber && item.songCcliNumber.trim().length > 0) {
    return item.songCcliNumber.trim();
  }
  return null;
}
