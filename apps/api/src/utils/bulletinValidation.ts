/**
 * Bulletin Validation Utilities
 *
 * Provides preflight validation for bulletins before PDF generation.
 * These checks ensure the bulletin content is complete and valid.
 */

import type { BulletinViewModel, BulletinPreflightResult } from '@elder-first/types';

/**
 * Validate a bulletin view model and return errors and warnings.
 *
 * Errors block PDF generation. Warnings are informational only.
 *
 * @param viewModel The BulletinViewModel to validate
 * @returns Preflight result with errors, warnings, and isValid flag
 */
export function validateBulletin(viewModel: BulletinViewModel): BulletinPreflightResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ==========================================================================
  // ERRORS (Block PDF generation)
  // ==========================================================================

  // Church info is required
  if (!viewModel.churchInfo) {
    errors.push('Church information is missing');
  } else {
    if (!viewModel.churchInfo.churchName || viewModel.churchInfo.churchName.trim() === '') {
      errors.push('Church name is required');
    }
    if (!viewModel.churchInfo.serviceLabel || viewModel.churchInfo.serviceLabel.trim() === '') {
      errors.push('Service label is required (e.g., "Sunday Morning Worship")');
    }
    if (!viewModel.churchInfo.serviceDate) {
      errors.push('Service date is required');
    }
  }

  // Service items - check for songs missing CCLI
  const songs = viewModel.serviceItems.filter((item) => item.type === 'song');
  const songsWithoutCcli = songs.filter(
    (song) => !song.ccliNumber || song.ccliNumber.trim() === ''
  );
  if (songsWithoutCcli.length > 0) {
    const songTitles = songsWithoutCcli.map((s) => `"${s.title}"`).join(', ');
    errors.push(`Songs missing CCLI numbers: ${songTitles}`);
  }

  // Announcements - check title/body length constraints
  for (const announcement of viewModel.announcements) {
    if (announcement.title.length > 60) {
      errors.push(`Announcement "${announcement.title.substring(0, 30)}..." exceeds 60 character limit`);
    }
    if (announcement.body.length > 300) {
      errors.push(`Announcement "${announcement.title}" body exceeds 300 character limit`);
    }
  }

  // ==========================================================================
  // WARNINGS (Informational, don't block PDF)
  // ==========================================================================

  // Warn if no service items
  if (viewModel.serviceItems.length === 0) {
    warnings.push('Order of service is empty');
  }

  // For simpleText layout, warn if no items have printedText
  if (viewModel.layoutKey === 'simpleText') {
    const itemsWithPrintedText = viewModel.serviceItems.filter(
      (item) => item.printedText && item.printedText.trim() !== ''
    );
    if (itemsWithPrintedText.length === 0) {
      warnings.push('Simple Text layout selected but no service items have printed liturgy text');
    }

    // Check if markers are used but legend is missing
    const itemsWithMarkers = viewModel.serviceItems.filter(
      (item) => item.marker && item.marker.trim() !== ''
    );
    if (itemsWithMarkers.length > 0 && (!viewModel.markerLegend || viewModel.markerLegend.length === 0)) {
      warnings.push('Service items have markers but no marker legend is defined');
    }
  }

  // Warn if no sermon
  if (!viewModel.sermon) {
    warnings.push('No sermon information included');
  } else {
    if (!viewModel.sermon.title || viewModel.sermon.title.trim() === '') {
      warnings.push('Sermon has no title');
    }
    if (!viewModel.sermon.preacher) {
      warnings.push('Sermon has no preacher/speaker assigned');
    }
    if (!viewModel.sermon.primaryScripture) {
      warnings.push('Sermon has no scripture reference');
    }
  }

  // Warn if no announcements
  if (viewModel.announcements.length === 0) {
    warnings.push('No announcements included');
  }

  // Warn if no upcoming events
  if (viewModel.upcomingEvents.length === 0) {
    warnings.push('No upcoming events included');
  }

  // Warn if no contact info
  if (!viewModel.contactInfo) {
    warnings.push('No contact information included');
  }

  // Warn if no giving info
  if (!viewModel.givingInfo) {
    warnings.push('No giving/donation information included');
  }

  // Warn about content that might overflow pages
  if (viewModel.announcements.length > 5) {
    warnings.push(`${viewModel.announcements.length} announcements may not fit on one page`);
  }
  if (viewModel.upcomingEvents.length > 8) {
    warnings.push(`${viewModel.upcomingEvents.length} events may not fit on one page`);
  }
  if (viewModel.serviceItems.length > 15) {
    warnings.push(`${viewModel.serviceItems.length} service items may not fit on one page`);
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  };
}

/**
 * Quick check if a bulletin view model is valid for PDF generation.
 *
 * @param viewModel The BulletinViewModel to check
 * @returns true if no validation errors
 */
export function isBulletinValid(viewModel: BulletinViewModel): boolean {
  return validateBulletin(viewModel).isValid;
}
