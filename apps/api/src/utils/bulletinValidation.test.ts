/**
 * Bulletin Validation Tests
 *
 * Tests for the validateBulletin function that performs preflight checks
 * before PDF generation.
 */

import { describe, it, expect } from 'vitest';
import { validateBulletin, isBulletinValid } from './bulletinValidation';
import type { BulletinViewModel } from '@elder-first/types';

// Helper to create a minimal valid view model
function createValidViewModel(overrides: Partial<BulletinViewModel> = {}): BulletinViewModel {
  return {
    bulletinId: '123e4567-e89b-12d3-a456-426614174000',
    layoutKey: 'classic',
    version: 1,
    generatedAt: new Date().toISOString(),
    churchInfo: {
      churchName: 'Test Church',
      serviceLabel: 'Sunday Morning Worship',
      serviceDate: '2025-12-07',
      serviceTime: '10:30 AM',
      logoUrl: null,
      address: '123 Main St',
      phone: '555-1234',
      website: 'https://testchurch.org',
      email: null,
    },
    serviceItems: [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        type: 'song',
        title: 'Amazing Grace',
        description: null,
        ccliNumber: '12345',
        scriptureRef: null,
        scriptureText: null,
        speaker: null,
        sequence: 1,
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        type: 'sermon',
        title: 'The Good News',
        description: null,
        ccliNumber: null,
        scriptureRef: 'John 3:16',
        scriptureText: null,
        speaker: 'Pastor John',
        sequence: 2,
      },
    ],
    sermon: {
      title: 'The Good News',
      preacher: 'Pastor John',
      primaryScripture: 'John 3:16',
      seriesTitle: null,
      bigIdea: null,
    },
    announcements: [
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        title: 'Potluck Next Sunday',
        body: 'Join us for a potluck dinner after service.',
        priority: 'normal',
        category: null,
      },
    ],
    upcomingEvents: [
      {
        id: '123e4567-e89b-12d3-a456-426614174004',
        title: 'Youth Group',
        description: 'Weekly youth meeting',
        startAt: '2025-12-10T18:00:00Z',
        endAt: '2025-12-10T20:00:00Z',
        allDay: false,
        locationName: 'Fellowship Hall',
      },
    ],
    prayerRequests: [],
    contactInfo: {
      address: '123 Main St',
      website: 'https://testchurch.org',
      officePhone: '555-1234',
      officeEmail: 'office@testchurch.org',
      pastorName: 'Pastor John',
      pastorEmail: null,
      pastorPhone: null,
      officeHours: 'Mon-Fri 9am-5pm',
    },
    givingInfo: {
      headerText: 'Ways to Give',
      bodyText: 'Thank you for your support.',
      onlineUrl: 'https://testchurch.org/give',
      showQrCode: true,
    },
    footerText: null,
    ...overrides,
  };
}

describe('validateBulletin', () => {
  describe('valid bulletins', () => {
    it('returns no errors for a complete valid bulletin', () => {
      const viewModel = createValidViewModel();
      const result = validateBulletin(viewModel);

      expect(result.errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('returns isValid=true with only warnings', () => {
      const viewModel = createValidViewModel({
        sermon: null,
        announcements: [],
        upcomingEvents: [],
      });
      const result = validateBulletin(viewModel);

      expect(result.errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('church info validation', () => {
    it('returns error for missing church name', () => {
      const viewModel = createValidViewModel({
        churchInfo: {
          ...createValidViewModel().churchInfo,
          churchName: '',
        },
      });
      const result = validateBulletin(viewModel);

      expect(result.errors).toContain('Church name is required');
      expect(result.isValid).toBe(false);
    });

    it('returns error for missing service label', () => {
      const viewModel = createValidViewModel({
        churchInfo: {
          ...createValidViewModel().churchInfo,
          serviceLabel: '',
        },
      });
      const result = validateBulletin(viewModel);

      expect(result.errors).toContain('Service label is required (e.g., "Sunday Morning Worship")');
      expect(result.isValid).toBe(false);
    });

    it('returns error for missing service date', () => {
      const viewModel = createValidViewModel({
        churchInfo: {
          ...createValidViewModel().churchInfo,
          serviceDate: '',
        },
      });
      const result = validateBulletin(viewModel);

      expect(result.errors).toContain('Service date is required');
      expect(result.isValid).toBe(false);
    });
  });

  describe('CCLI validation', () => {
    it('returns error for songs without CCLI numbers', () => {
      const viewModel = createValidViewModel({
        serviceItems: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'song',
            title: 'Amazing Grace',
            description: null,
            ccliNumber: '', // Empty CCLI
            scriptureRef: null,
            scriptureText: null,
            speaker: null,
            sequence: 1,
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            type: 'song',
            title: 'How Great Thou Art',
            description: null,
            ccliNumber: null, // Null CCLI
            scriptureRef: null,
            scriptureText: null,
            speaker: null,
            sequence: 2,
          },
        ],
      });
      const result = validateBulletin(viewModel);

      expect(result.errors.some(e => e.includes('Songs missing CCLI numbers'))).toBe(true);
      expect(result.errors.some(e => e.includes('Amazing Grace'))).toBe(true);
      expect(result.errors.some(e => e.includes('How Great Thou Art'))).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('does not require CCLI for non-song items', () => {
      const viewModel = createValidViewModel({
        serviceItems: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'prayer',
            title: 'Opening Prayer',
            description: null,
            ccliNumber: null, // No CCLI needed for prayer
            scriptureRef: null,
            scriptureText: null,
            speaker: null,
            sequence: 1,
          },
        ],
      });
      const result = validateBulletin(viewModel);

      expect(result.errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('announcement validation', () => {
    it('returns error for announcement title over 60 characters', () => {
      const longTitle = 'This is a very long announcement title that exceeds the sixty character limit';
      const viewModel = createValidViewModel({
        announcements: [
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            title: longTitle,
            body: 'Short body',
            priority: 'normal',
            category: null,
          },
        ],
      });
      const result = validateBulletin(viewModel);

      expect(result.errors.some(e => e.includes('exceeds 60 character limit'))).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('returns error for announcement body over 300 characters', () => {
      const longBody = 'x'.repeat(301);
      const viewModel = createValidViewModel({
        announcements: [
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            title: 'Short Title',
            body: longBody,
            priority: 'normal',
            category: null,
          },
        ],
      });
      const result = validateBulletin(viewModel);

      expect(result.errors.some(e => e.includes('body exceeds 300 character limit'))).toBe(true);
      expect(result.isValid).toBe(false);
    });

    it('allows announcements at exactly 60/300 character limits', () => {
      const viewModel = createValidViewModel({
        announcements: [
          {
            id: '123e4567-e89b-12d3-a456-426614174003',
            title: 'x'.repeat(60), // Exactly 60 chars
            body: 'x'.repeat(300), // Exactly 300 chars
            priority: 'normal',
            category: null,
          },
        ],
      });
      const result = validateBulletin(viewModel);

      expect(result.errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('warnings', () => {
    it('warns when no service items', () => {
      const viewModel = createValidViewModel({
        serviceItems: [],
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain('Order of service is empty');
    });

    it('warns when no sermon', () => {
      const viewModel = createValidViewModel({
        sermon: null,
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain('No sermon information included');
    });

    it('warns when sermon has no title', () => {
      const viewModel = createValidViewModel({
        sermon: {
          title: '',
          preacher: 'Pastor John',
          primaryScripture: 'John 3:16',
          seriesTitle: null,
          bigIdea: null,
        },
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain('Sermon has no title');
    });

    it('warns when sermon has no preacher', () => {
      const viewModel = createValidViewModel({
        sermon: {
          title: 'The Good News',
          preacher: null,
          primaryScripture: 'John 3:16',
          seriesTitle: null,
          bigIdea: null,
        },
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain('Sermon has no preacher/speaker assigned');
    });

    it('warns when no announcements', () => {
      const viewModel = createValidViewModel({
        announcements: [],
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain('No announcements included');
    });

    it('warns when no upcoming events', () => {
      const viewModel = createValidViewModel({
        upcomingEvents: [],
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain('No upcoming events included');
    });

    it('warns when no contact info', () => {
      const viewModel = createValidViewModel({
        contactInfo: null,
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain('No contact information included');
    });

    it('warns when no giving info', () => {
      const viewModel = createValidViewModel({
        givingInfo: null,
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain('No giving/donation information included');
    });

    it('warns about potential page overflow with many announcements', () => {
      const viewModel = createValidViewModel({
        announcements: Array(6).fill(null).map((_, i) => ({
          id: `123e4567-e89b-12d3-a456-42661417400${i}`,
          title: `Announcement ${i + 1}`,
          body: 'Short body',
          priority: 'normal' as const,
          category: null,
        })),
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings.some(w => w.includes('announcements may not fit'))).toBe(true);
    });

    it('warns about potential page overflow with many events', () => {
      const viewModel = createValidViewModel({
        upcomingEvents: Array(9).fill(null).map((_, i) => ({
          id: `123e4567-e89b-12d3-a456-42661417400${i}`,
          title: `Event ${i + 1}`,
          description: null,
          startAt: '2025-12-10T18:00:00Z',
          endAt: null,
          allDay: false,
          locationName: null,
        })),
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings.some(w => w.includes('events may not fit'))).toBe(true);
    });

    it('warns about potential page overflow with many service items', () => {
      const viewModel = createValidViewModel({
        serviceItems: Array(16).fill(null).map((_, i) => ({
          id: `123e4567-e89b-12d3-a456-42661417400${i}`,
          type: 'other',
          title: `Item ${i + 1}`,
          description: null,
          ccliNumber: null,
          scriptureRef: null,
          scriptureText: null,
          speaker: null,
          sequence: i + 1,
        })),
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings.some(w => w.includes('service items may not fit'))).toBe(true);
    });
  });

  describe('simpleText layout warnings', () => {
    it('warns when simpleText layout has no printedText on any item', () => {
      const viewModel = createValidViewModel({
        layoutKey: 'simpleText',
        serviceItems: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'prayer',
            title: 'Call to Worship',
            description: null,
            ccliNumber: null,
            scriptureRef: null,
            scriptureText: null,
            speaker: null,
            sequence: 1,
            printedText: null, // No printed text
            marker: null,
            children: null,
          },
        ],
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain(
        'Simple Text layout selected but no service items have printed liturgy text'
      );
    });

    it('does not warn when simpleText layout has printedText', () => {
      const viewModel = createValidViewModel({
        layoutKey: 'simpleText',
        serviceItems: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'prayer',
            title: 'Call to Worship',
            description: null,
            ccliNumber: null,
            scriptureRef: null,
            scriptureText: null,
            speaker: null,
            sequence: 1,
            printedText: 'Leader: The Lord is good!\nAll: His love endures forever.',
            marker: '*',
            children: null,
          },
        ],
      });
      const result = validateBulletin(viewModel);

      expect(
        result.warnings.some((w) =>
          w.includes('Simple Text layout selected but no service items have printed liturgy text')
        )
      ).toBe(false);
    });

    it('warns when markers are used but no marker legend is defined', () => {
      const viewModel = createValidViewModel({
        layoutKey: 'simpleText',
        serviceItems: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'prayer',
            title: 'Call to Worship',
            description: null,
            ccliNumber: null,
            scriptureRef: null,
            scriptureText: null,
            speaker: null,
            sequence: 1,
            printedText: 'Some liturgy text',
            marker: '*', // Has marker
            children: null,
          },
        ],
        markerLegend: null, // No legend defined
      });
      const result = validateBulletin(viewModel);

      expect(result.warnings).toContain(
        'Service items have markers but no marker legend is defined'
      );
    });

    it('does not warn about markers when legend is defined', () => {
      const viewModel = createValidViewModel({
        layoutKey: 'simpleText',
        serviceItems: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'prayer',
            title: 'Call to Worship',
            description: null,
            ccliNumber: null,
            scriptureRef: null,
            scriptureText: null,
            speaker: null,
            sequence: 1,
            printedText: 'Some liturgy text',
            marker: '*',
            children: null,
          },
        ],
        markerLegend: [
          { marker: '*', description: 'Please stand' },
        ],
      });
      const result = validateBulletin(viewModel);

      expect(
        result.warnings.some((w) => w.includes('no marker legend is defined'))
      ).toBe(false);
    });

    it('does not check simpleText warnings for classic layout', () => {
      const viewModel = createValidViewModel({
        layoutKey: 'classic',
        serviceItems: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'prayer',
            title: 'Opening Prayer',
            description: null,
            ccliNumber: null,
            scriptureRef: null,
            scriptureText: null,
            speaker: null,
            sequence: 1,
            printedText: null, // No printed text (fine for classic)
            marker: null,
            children: null,
          },
        ],
      });
      const result = validateBulletin(viewModel);

      expect(
        result.warnings.some((w) => w.includes('Simple Text layout'))
      ).toBe(false);
    });
  });
});

describe('isBulletinValid', () => {
  it('returns true for valid bulletin', () => {
    const viewModel = createValidViewModel();
    expect(isBulletinValid(viewModel)).toBe(true);
  });

  it('returns false for invalid bulletin', () => {
    const viewModel = createValidViewModel({
      churchInfo: {
        ...createValidViewModel().churchInfo,
        churchName: '',
      },
    });
    expect(isBulletinValid(viewModel)).toBe(false);
  });

  it('returns true when only warnings exist', () => {
    const viewModel = createValidViewModel({
      sermon: null,
    });
    expect(isBulletinValid(viewModel)).toBe(true);
  });
});
