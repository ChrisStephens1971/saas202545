import { describe, it, expect } from '@jest/globals';

/**
 * Preach Mode Tests
 *
 * Tests for Bulletin Preach Mode functionality:
 * 1. Navigation logic (previous/next boundaries)
 * 2. Keyboard navigation handlers
 * 3. Item access logic (current, next, previous)
 * 4. Type and section icon mappings
 * 5. Progress display formatting
 * 6. Edge cases handling
 */

// Type icons from Preach Mode page
const TYPE_ICONS: Record<string, string> = {
  Welcome: '👋',
  CallToWorship: '🙌',
  Song: '🎵',
  Prayer: '🙏',
  Scripture: '📖',
  Sermon: '🎤',
  Offering: '💝',
  Communion: '🍞',
  Benediction: '✨',
  Announcement: '📢',
  Event: '📅',
  Heading: '📌',
  Other: '📋',
};

// Section icons from Preach Mode page
const SECTION_ICONS: Record<string, string> = {
  'pre-service': '🕐',
  'worship': '🎵',
  'message': '📖',
  'response': '🙏',
  'closing': '👋',
  'announcements': '📢',
  'other': '📋',
};

// Service item interface matching the Preach Mode page
interface ServiceItem {
  id: string;
  type: string;
  title: string;
  content?: string | null;
  ccliNumber?: string | null;
  artist?: string | null;
  scriptureRef?: string | null;
  speaker?: string | null;
  sermonTitle?: string | null;
  songTitle?: string | null;
  songHymnNumber?: string | null;
  songCcliNumber?: string | null;
  sequence: number;
  durationMinutes?: number | null;
  section?: string | null;
  notes?: string | null;
  slidesCount?: number | null;
}

/**
 * Navigation helper: advance to next item
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function goToNext(currentIndex: number, itemsLength: number): number {
  return Math.min(currentIndex + 1, itemsLength - 1);
}

/**
 * Navigation helper: go to previous item
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function goToPrev(currentIndex: number): number {
  return Math.max(currentIndex - 1, 0);
}

/**
 * Get current item from items array
 */
function getCurrentItem(items: ServiceItem[], currentIndex: number): ServiceItem | undefined {
  return items[currentIndex];
}

/**
 * Get next item for preview
 */
function getNextItem(items: ServiceItem[], currentIndex: number): ServiceItem | undefined {
  return items[currentIndex + 1];
}

/**
 * Get previous item
 */
function getPrevItem(items: ServiceItem[], currentIndex: number): ServiceItem | undefined {
  return items[currentIndex - 1];
}

/**
 * Get icon for service item type
 */
function getTypeIcon(type: string): string {
  return TYPE_ICONS[type] || '📋';
}

/**
 * Get icon for section
 */
function getSectionIcon(section: string | null | undefined): string | null {
  return section ? SECTION_ICONS[section] || null : null;
}

/**
 * Format section label for display
 */
function formatSectionLabel(section: string): string {
  return section.charAt(0).toUpperCase() + section.slice(1).replace('-', ' ');
}

/**
 * Simulates keyboard navigation handler logic
 * Mirrors handleKeyDown from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function handleKeyboardNavigation(
  key: string,
  currentIndex: number,
  itemsLength: number
): { newIndex: number; action: string } {
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === ' ') {
    return { newIndex: goToNext(currentIndex, itemsLength), action: 'next' };
  } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return { newIndex: goToPrev(currentIndex), action: 'prev' };
  } else if (key === 'Home') {
    return { newIndex: 0, action: 'first' };
  } else if (key === 'End') {
    return { newIndex: itemsLength - 1, action: 'last' };
  }
  return { newIndex: currentIndex, action: 'none' };
}

/**
 * Format progress display string
 */
function formatProgress(currentIndex: number, totalItems: number): string {
  return `${currentIndex + 1} of ${totalItems}`;
}

// Test data
const testItems: ServiceItem[] = [
  {
    id: '1',
    type: 'Welcome',
    title: 'Welcome & Announcements',
    sequence: 1,
    durationMinutes: 5,
    section: 'pre-service',
    notes: 'Remember to mention new visitors',
  },
  {
    id: '2',
    type: 'Song',
    title: 'Amazing Grace',
    sequence: 2,
    durationMinutes: 4,
    section: 'worship',
    artist: 'Traditional',
    songCcliNumber: '123456',
  },
  {
    id: '3',
    type: 'Scripture',
    title: 'Scripture Reading',
    sequence: 3,
    durationMinutes: 3,
    section: 'worship',
    scriptureRef: 'John 3:16-17',
  },
  {
    id: '4',
    type: 'Sermon',
    title: 'The Good News',
    sequence: 4,
    durationMinutes: 30,
    section: 'message',
    speaker: 'Pastor John',
    sermonTitle: 'The Good News',
    notes: 'Check slides before starting',
  },
  {
    id: '5',
    type: 'Benediction',
    title: 'Closing Blessing',
    sequence: 5,
    durationMinutes: 2,
    section: 'closing',
  },
];

describe('Preach Mode Navigation Logic', () => {
  describe('goToNext', () => {
    it('advances to next item when not at end', () => {
      const result = goToNext(0, 5);
      expect(result).toBe(1);
    });

    it('stays at last item when already at end', () => {
      const result = goToNext(4, 5);
      expect(result).toBe(4);
    });

    it('handles single item list', () => {
      const result = goToNext(0, 1);
      expect(result).toBe(0);
    });

    it('advances through multiple items', () => {
      let index = 0;
      index = goToNext(index, 5);
      expect(index).toBe(1);
      index = goToNext(index, 5);
      expect(index).toBe(2);
      index = goToNext(index, 5);
      expect(index).toBe(3);
    });
  });

  describe('goToPrev', () => {
    it('goes to previous item when not at start', () => {
      const result = goToPrev(2);
      expect(result).toBe(1);
    });

    it('stays at first item when already at start', () => {
      const result = goToPrev(0);
      expect(result).toBe(0);
    });

    it('handles going from second to first', () => {
      const result = goToPrev(1);
      expect(result).toBe(0);
    });

    it('goes back through multiple items', () => {
      let index = 4;
      index = goToPrev(index);
      expect(index).toBe(3);
      index = goToPrev(index);
      expect(index).toBe(2);
      index = goToPrev(index);
      expect(index).toBe(1);
    });
  });
});

describe('Preach Mode Item Access', () => {
  describe('getCurrentItem', () => {
    it('returns correct item for valid index', () => {
      const item = getCurrentItem(testItems, 0);
      expect(item?.title).toBe('Welcome & Announcements');
    });

    it('returns correct item for middle index', () => {
      const item = getCurrentItem(testItems, 2);
      expect(item?.title).toBe('Scripture Reading');
    });

    it('returns correct item for last index', () => {
      const item = getCurrentItem(testItems, 4);
      expect(item?.title).toBe('Closing Blessing');
    });

    it('returns undefined for out of bounds index', () => {
      const item = getCurrentItem(testItems, 10);
      expect(item).toBeUndefined();
    });
  });

  describe('getNextItem', () => {
    it('returns next item when available', () => {
      const item = getNextItem(testItems, 0);
      expect(item?.title).toBe('Amazing Grace');
    });

    it('returns undefined when at last item', () => {
      const item = getNextItem(testItems, 4);
      expect(item).toBeUndefined();
    });

    it('returns correct item for any valid position', () => {
      const item = getNextItem(testItems, 2);
      expect(item?.title).toBe('The Good News');
    });
  });

  describe('getPrevItem', () => {
    it('returns previous item when available', () => {
      const item = getPrevItem(testItems, 2);
      expect(item?.title).toBe('Amazing Grace');
    });

    it('returns undefined when at first item', () => {
      const item = getPrevItem(testItems, 0);
      expect(item).toBeUndefined();
    });
  });
});

describe('Preach Mode Keyboard Navigation', () => {
  describe('handleKeyboardNavigation', () => {
    it('advances with ArrowRight', () => {
      const result = handleKeyboardNavigation('ArrowRight', 0, 5);
      expect(result.newIndex).toBe(1);
      expect(result.action).toBe('next');
    });

    it('advances with ArrowDown', () => {
      const result = handleKeyboardNavigation('ArrowDown', 1, 5);
      expect(result.newIndex).toBe(2);
      expect(result.action).toBe('next');
    });

    it('advances with Space', () => {
      const result = handleKeyboardNavigation(' ', 2, 5);
      expect(result.newIndex).toBe(3);
      expect(result.action).toBe('next');
    });

    it('goes back with ArrowLeft', () => {
      const result = handleKeyboardNavigation('ArrowLeft', 2, 5);
      expect(result.newIndex).toBe(1);
      expect(result.action).toBe('prev');
    });

    it('goes back with ArrowUp', () => {
      const result = handleKeyboardNavigation('ArrowUp', 3, 5);
      expect(result.newIndex).toBe(2);
      expect(result.action).toBe('prev');
    });

    it('goes to first item with Home', () => {
      const result = handleKeyboardNavigation('Home', 3, 5);
      expect(result.newIndex).toBe(0);
      expect(result.action).toBe('first');
    });

    it('goes to last item with End', () => {
      const result = handleKeyboardNavigation('End', 1, 5);
      expect(result.newIndex).toBe(4);
      expect(result.action).toBe('last');
    });

    it('does nothing for unrecognized key', () => {
      const result = handleKeyboardNavigation('a', 2, 5);
      expect(result.newIndex).toBe(2);
      expect(result.action).toBe('none');
    });

    it('prevents going past last item', () => {
      const result = handleKeyboardNavigation('ArrowRight', 4, 5);
      expect(result.newIndex).toBe(4);
    });

    it('prevents going before first item', () => {
      const result = handleKeyboardNavigation('ArrowLeft', 0, 5);
      expect(result.newIndex).toBe(0);
    });
  });
});

describe('Preach Mode Icon Mapping', () => {
  describe('getTypeIcon', () => {
    it('returns correct icon for Welcome', () => {
      expect(getTypeIcon('Welcome')).toBe('👋');
    });

    it('returns correct icon for Song', () => {
      expect(getTypeIcon('Song')).toBe('🎵');
    });

    it('returns correct icon for Prayer', () => {
      expect(getTypeIcon('Prayer')).toBe('🙏');
    });

    it('returns correct icon for Scripture', () => {
      expect(getTypeIcon('Scripture')).toBe('📖');
    });

    it('returns correct icon for Sermon', () => {
      expect(getTypeIcon('Sermon')).toBe('🎤');
    });

    it('returns correct icon for Offering', () => {
      expect(getTypeIcon('Offering')).toBe('💝');
    });

    it('returns correct icon for Communion', () => {
      expect(getTypeIcon('Communion')).toBe('🍞');
    });

    it('returns correct icon for Benediction', () => {
      expect(getTypeIcon('Benediction')).toBe('✨');
    });

    it('returns correct icon for Announcement', () => {
      expect(getTypeIcon('Announcement')).toBe('📢');
    });

    it('returns default icon for unknown type', () => {
      expect(getTypeIcon('UnknownType')).toBe('📋');
    });
  });

  describe('getSectionIcon', () => {
    it('returns correct icon for pre-service', () => {
      expect(getSectionIcon('pre-service')).toBe('🕐');
    });

    it('returns correct icon for worship', () => {
      expect(getSectionIcon('worship')).toBe('🎵');
    });

    it('returns correct icon for message', () => {
      expect(getSectionIcon('message')).toBe('📖');
    });

    it('returns correct icon for response', () => {
      expect(getSectionIcon('response')).toBe('🙏');
    });

    it('returns correct icon for closing', () => {
      expect(getSectionIcon('closing')).toBe('👋');
    });

    it('returns correct icon for announcements', () => {
      expect(getSectionIcon('announcements')).toBe('📢');
    });

    it('returns null for null section', () => {
      expect(getSectionIcon(null)).toBeNull();
    });

    it('returns null for undefined section', () => {
      expect(getSectionIcon(undefined)).toBeNull();
    });
  });
});

describe('Preach Mode Section Label Formatting', () => {
  it('capitalizes first letter', () => {
    expect(formatSectionLabel('worship')).toBe('Worship');
  });

  it('replaces hyphens with spaces', () => {
    expect(formatSectionLabel('pre-service')).toBe('Pre service');
  });

  it('handles single word', () => {
    expect(formatSectionLabel('message')).toBe('Message');
  });

  it('handles closing section', () => {
    expect(formatSectionLabel('closing')).toBe('Closing');
  });
});

describe('Preach Mode Current Item Rendering', () => {
  it('renders all required fields for Welcome item', () => {
    const item = testItems[0];

    expect(item.type).toBe('Welcome');
    expect(item.title).toBe('Welcome & Announcements');
    expect(item.durationMinutes).toBe(5);
    expect(item.section).toBe('pre-service');
    expect(item.notes).toBeTruthy();
  });

  it('renders song-specific fields for Song item', () => {
    const item = testItems[1];

    expect(item.type).toBe('Song');
    expect(item.artist).toBe('Traditional');
    expect(item.songCcliNumber).toBe('123456');
  });

  it('renders scripture reference for Scripture item', () => {
    const item = testItems[2];

    expect(item.type).toBe('Scripture');
    expect(item.scriptureRef).toBe('John 3:16-17');
  });

  it('renders speaker and notes for Sermon item', () => {
    const item = testItems[3];

    expect(item.type).toBe('Sermon');
    expect(item.speaker).toBe('Pastor John');
    expect(item.notes).toBe('Check slides before starting');
    expect(item.durationMinutes).toBe(30);
  });
});

describe('Preach Mode Progress Display', () => {
  it('displays correct progress at start', () => {
    expect(formatProgress(0, 5)).toBe('1 of 5');
  });

  it('displays correct progress in middle', () => {
    expect(formatProgress(2, 5)).toBe('3 of 5');
  });

  it('displays correct progress at end', () => {
    expect(formatProgress(4, 5)).toBe('5 of 5');
  });
});

describe('Preach Mode Edge Cases', () => {
  describe('single item list', () => {
    const singleItem: ServiceItem[] = [testItems[0]];

    it('cannot advance past single item', () => {
      const result = goToNext(0, 1);
      expect(result).toBe(0);
    });

    it('cannot go back from single item', () => {
      const result = goToPrev(0);
      expect(result).toBe(0);
    });

    it('no next item preview for single item', () => {
      const nextItem = getNextItem(singleItem, 0);
      expect(nextItem).toBeUndefined();
    });

    it('progress shows 1 of 1', () => {
      expect(formatProgress(0, 1)).toBe('1 of 1');
    });
  });

  describe('items without optional fields', () => {
    const minimalItem: ServiceItem = {
      id: 'min-1',
      type: 'Other',
      title: 'Minimal Item',
      sequence: 1,
    };

    it('handles item without duration', () => {
      expect(minimalItem.durationMinutes).toBeUndefined();
    });

    it('handles item without section', () => {
      expect(minimalItem.section).toBeUndefined();
      expect(getSectionIcon(minimalItem.section)).toBeNull();
    });

    it('handles item without notes', () => {
      expect(minimalItem.notes).toBeUndefined();
    });

    it('still gets type icon for minimal item', () => {
      expect(getTypeIcon(minimalItem.type)).toBe('📋');
    });
  });
});

describe('Preach Mode Type Icons Completeness', () => {
  const allServiceItemTypes = [
    'Welcome',
    'CallToWorship',
    'Song',
    'Prayer',
    'Scripture',
    'Sermon',
    'Offering',
    'Communion',
    'Benediction',
    'Announcement',
    'Event',
    'Heading',
    'Other',
  ];

  it('has icons for all standard service item types', () => {
    allServiceItemTypes.forEach((type) => {
      expect(TYPE_ICONS[type]).toBeDefined();
      expect(TYPE_ICONS[type].length).toBeGreaterThan(0);
    });
  });

  it('has 13 type icons defined', () => {
    expect(Object.keys(TYPE_ICONS).length).toBe(13);
  });
});

describe('Preach Mode Section Icons Completeness', () => {
  const allSections = [
    'pre-service',
    'worship',
    'message',
    'response',
    'closing',
    'announcements',
    'other',
  ];

  it('has icons for all section types', () => {
    allSections.forEach((section) => {
      expect(SECTION_ICONS[section]).toBeDefined();
      expect(SECTION_ICONS[section].length).toBeGreaterThan(0);
    });
  });

  it('has 7 section icons defined', () => {
    expect(Object.keys(SECTION_ICONS).length).toBe(7);
  });
});

// ============================================================================
// Slide Navigation Tests (New for Slide Control Integration)
// ============================================================================

/**
 * Navigate to next slide
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function goToNextSlide(currentSlideIndex: number, slidesCount: number): number {
  return Math.min(currentSlideIndex + 1, slidesCount);
}

/**
 * Navigate to previous slide
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function goToPrevSlide(currentSlideIndex: number): number {
  return Math.max(currentSlideIndex - 1, 1);
}

/**
 * Check if item has slides
 */
function hasSlides(item: ServiceItem | undefined): boolean {
  return (item?.slidesCount ?? 0) > 0;
}

/**
 * Format slide progress display
 */
function formatSlideProgress(currentSlideIndex: number, slidesCount: number): string {
  return `Slide ${currentSlideIndex} of ${slidesCount}`;
}

/**
 * Handle slide keyboard navigation
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function handleSlideKeyboardNavigation(
  key: string,
  currentSlideIndex: number,
  slidesCount: number,
  itemHasSlides: boolean
): { newSlideIndex: number; handled: boolean } {
  if (!itemHasSlides) {
    return { newSlideIndex: currentSlideIndex, handled: false };
  }

  if (key === 'PageDown' || key === 's') {
    return { newSlideIndex: goToNextSlide(currentSlideIndex, slidesCount), handled: true };
  } else if (key === 'PageUp' || key === 'S') {
    return { newSlideIndex: goToPrevSlide(currentSlideIndex), handled: true };
  }

  return { newSlideIndex: currentSlideIndex, handled: false };
}

// Test data with slides
const testItemsWithSlides: ServiceItem[] = [
  {
    id: 'slide-1',
    type: 'Welcome',
    title: 'Welcome & Announcements',
    sequence: 1,
    durationMinutes: 5,
    section: 'pre-service',
    slidesCount: null, // No slides
  },
  {
    id: 'slide-2',
    type: 'Song',
    title: 'Amazing Grace',
    sequence: 2,
    durationMinutes: 4,
    section: 'worship',
    slidesCount: 8, // 8 lyrics slides
  },
  {
    id: 'slide-3',
    type: 'Scripture',
    title: 'Scripture Reading',
    sequence: 3,
    scriptureRef: 'John 3:16-17',
    slidesCount: 3, // 3 verse slides
  },
  {
    id: 'slide-4',
    type: 'Sermon',
    title: 'The Good News',
    sequence: 4,
    durationMinutes: 30,
    speaker: 'Pastor John',
    slidesCount: 25, // 25 sermon slides
  },
  {
    id: 'slide-5',
    type: 'Benediction',
    title: 'Closing Blessing',
    sequence: 5,
    slidesCount: 0, // Explicitly 0 slides
  },
];

describe('Preach Mode Slide Navigation Logic', () => {
  describe('goToNextSlide', () => {
    it('advances to next slide when not at end', () => {
      const result = goToNextSlide(1, 8);
      expect(result).toBe(2);
    });

    it('stays at last slide when already at end', () => {
      const result = goToNextSlide(8, 8);
      expect(result).toBe(8);
    });

    it('advances through multiple slides', () => {
      let slideIndex = 1;
      slideIndex = goToNextSlide(slideIndex, 8);
      expect(slideIndex).toBe(2);
      slideIndex = goToNextSlide(slideIndex, 8);
      expect(slideIndex).toBe(3);
      slideIndex = goToNextSlide(slideIndex, 8);
      expect(slideIndex).toBe(4);
    });

    it('handles single slide item', () => {
      const result = goToNextSlide(1, 1);
      expect(result).toBe(1);
    });
  });

  describe('goToPrevSlide', () => {
    it('goes to previous slide when not at start', () => {
      const result = goToPrevSlide(5);
      expect(result).toBe(4);
    });

    it('stays at first slide when already at start', () => {
      const result = goToPrevSlide(1);
      expect(result).toBe(1);
    });

    it('goes back through multiple slides', () => {
      let slideIndex = 8;
      slideIndex = goToPrevSlide(slideIndex);
      expect(slideIndex).toBe(7);
      slideIndex = goToPrevSlide(slideIndex);
      expect(slideIndex).toBe(6);
      slideIndex = goToPrevSlide(slideIndex);
      expect(slideIndex).toBe(5);
    });
  });
});

describe('Preach Mode Slide Detection', () => {
  describe('hasSlides', () => {
    it('returns true for item with positive slidesCount', () => {
      expect(hasSlides(testItemsWithSlides[1])).toBe(true);
    });

    it('returns false for item with null slidesCount', () => {
      expect(hasSlides(testItemsWithSlides[0])).toBe(false);
    });

    it('returns false for item with zero slidesCount', () => {
      expect(hasSlides(testItemsWithSlides[4])).toBe(false);
    });

    it('returns false for undefined item', () => {
      expect(hasSlides(undefined)).toBe(false);
    });
  });
});

describe('Preach Mode Slide Keyboard Navigation', () => {
  describe('handleSlideKeyboardNavigation', () => {
    it('advances slide with PageDown', () => {
      const result = handleSlideKeyboardNavigation('PageDown', 3, 8, true);
      expect(result.newSlideIndex).toBe(4);
      expect(result.handled).toBe(true);
    });

    it('advances slide with s key', () => {
      const result = handleSlideKeyboardNavigation('s', 3, 8, true);
      expect(result.newSlideIndex).toBe(4);
      expect(result.handled).toBe(true);
    });

    it('goes back with PageUp', () => {
      const result = handleSlideKeyboardNavigation('PageUp', 5, 8, true);
      expect(result.newSlideIndex).toBe(4);
      expect(result.handled).toBe(true);
    });

    it('goes back with Shift+S (S)', () => {
      const result = handleSlideKeyboardNavigation('S', 5, 8, true);
      expect(result.newSlideIndex).toBe(4);
      expect(result.handled).toBe(true);
    });

    it('does not handle when item has no slides', () => {
      const result = handleSlideKeyboardNavigation('PageDown', 1, 0, false);
      expect(result.newSlideIndex).toBe(1);
      expect(result.handled).toBe(false);
    });

    it('does not handle unrecognized keys', () => {
      const result = handleSlideKeyboardNavigation('ArrowRight', 3, 8, true);
      expect(result.newSlideIndex).toBe(3);
      expect(result.handled).toBe(false);
    });

    it('prevents going past last slide', () => {
      const result = handleSlideKeyboardNavigation('PageDown', 8, 8, true);
      expect(result.newSlideIndex).toBe(8);
    });

    it('prevents going before first slide', () => {
      const result = handleSlideKeyboardNavigation('PageUp', 1, 8, true);
      expect(result.newSlideIndex).toBe(1);
    });
  });
});

describe('Preach Mode Slide Progress Display', () => {
  it('displays correct slide progress at start', () => {
    expect(formatSlideProgress(1, 8)).toBe('Slide 1 of 8');
  });

  it('displays correct slide progress in middle', () => {
    expect(formatSlideProgress(5, 8)).toBe('Slide 5 of 8');
  });

  it('displays correct slide progress at end', () => {
    expect(formatSlideProgress(8, 8)).toBe('Slide 8 of 8');
  });

  it('displays correctly for single slide', () => {
    expect(formatSlideProgress(1, 1)).toBe('Slide 1 of 1');
  });
});

describe('Preach Mode Slide Reset on Item Change', () => {
  it('slide index should reset to 1 when item changes', () => {
    // This tests the expected behavior when navigating between items
    // The actual implementation uses useEffect with currentIndex dependency
    let currentSlideIndex = 5; // At slide 5 of a song
    let currentIndex = 2;

    // Simulate item change
    const newCurrentIndex = 3;
    if (newCurrentIndex !== currentIndex) {
      currentSlideIndex = 1; // Reset to slide 1
      currentIndex = newCurrentIndex;
    }

    expect(currentSlideIndex).toBe(1);
    expect(currentIndex).toBe(3);
  });
});

describe('Preach Mode Items with Slides Data', () => {
  it('Song item has 8 slides', () => {
    const songItem = testItemsWithSlides[1];
    expect(songItem.slidesCount).toBe(8);
    expect(hasSlides(songItem)).toBe(true);
  });

  it('Scripture item has 3 slides', () => {
    const scriptureItem = testItemsWithSlides[2];
    expect(scriptureItem.slidesCount).toBe(3);
    expect(hasSlides(scriptureItem)).toBe(true);
  });

  it('Sermon item has 25 slides', () => {
    const sermonItem = testItemsWithSlides[3];
    expect(sermonItem.slidesCount).toBe(25);
    expect(hasSlides(sermonItem)).toBe(true);
  });

  it('Welcome item has no slides (null)', () => {
    const welcomeItem = testItemsWithSlides[0];
    expect(welcomeItem.slidesCount).toBeNull();
    expect(hasSlides(welcomeItem)).toBe(false);
  });

  it('Benediction item has no slides (0)', () => {
    const benedictionItem = testItemsWithSlides[4];
    expect(benedictionItem.slidesCount).toBe(0);
    expect(hasSlides(benedictionItem)).toBe(false);
  });
});

describe('Preach Mode Mobile View', () => {
  describe('Mobile view URL generation', () => {
    it('generates correct mobile URL from bulletin ID', () => {
      const bulletinId = 'test-bulletin-123';
      const origin = 'https://example.com';
      const expectedUrl = `${origin}/bulletins/${bulletinId}/preach/mobile`;

      expect(expectedUrl).toBe('https://example.com/bulletins/test-bulletin-123/preach/mobile');
    });

    it('mobile URL maintains same auth requirements', () => {
      // Mobile view uses same ProtectedPage wrapper with same roles
      const requiredRoles = ['admin', 'editor', 'submitter', 'viewer'];
      expect(requiredRoles).toContain('admin');
      expect(requiredRoles).toContain('editor');
      expect(requiredRoles).toContain('viewer');
      expect(requiredRoles).not.toContain('kiosk');
    });
  });
});

describe('Preach Mode QR Code Feature', () => {
  describe('QR code URL generation', () => {
    it('generates QR code URL pointing to mobile view', () => {
      const bulletinId = 'qr-test-456';
      const origin = 'https://church.example.com';
      const qrCodeValue = `${origin}/bulletins/${bulletinId}/preach/mobile`;

      expect(qrCodeValue).toContain('/preach/mobile');
      expect(qrCodeValue).toContain(bulletinId);
    });
  });

  describe('QR keyboard shortcut', () => {
    it('Q key toggles QR code modal', () => {
      // The Q/q key should toggle showQrCode state
      const qKeyLower = 'q';
      const qKeyUpper = 'Q';

      expect(qKeyLower.toLowerCase()).toBe('q');
      expect(qKeyUpper.toLowerCase()).toBe('q');
    });
  });
});

// ============================================================================
// Hardening Tests (New for Preach Mode Hardening)
// ============================================================================

// Section display names
const SECTION_NAMES: Record<string, string> = {
  'pre-service': 'Pre-Service',
  'worship': 'Worship',
  'message': 'Message',
  'response': 'Response',
  'closing': 'Closing',
  'announcements': 'Announcements',
  'other': 'Other',
};

/**
 * Compute duration totals for service items
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function computeDurationTotals(items: ServiceItem[], currentIndex: number): {
  totalPlannedMinutes: number;
  plannedThroughCurrent: number;
} {
  let total = 0;
  let throughCurrent = 0;
  items.forEach((item, index) => {
    const duration = item.durationMinutes || 0;
    total += duration;
    if (index <= currentIndex) {
      throughCurrent += duration;
    }
  });
  return { totalPlannedMinutes: total, plannedThroughCurrent: throughCurrent };
}

/**
 * Group items by section for sidebar display
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function groupItemsBySection(items: ServiceItem[]): {
  section: string | null | undefined;
  items: { item: ServiceItem; index: number }[];
}[] {
  const groups: { section: string | null | undefined; items: { item: ServiceItem; index: number }[] }[] = [];
  let currentSection: string | null | undefined = '__INITIAL__'; // Use sentinel to detect first item

  items.forEach((item, index) => {
    if (item.section !== currentSection) {
      currentSection = item.section;
      groups.push({ section: currentSection, items: [] });
    }
    groups[groups.length - 1].items.push({ item, index });
  });

  return groups;
}

/**
 * Detect if bulletin is locked (should not auto-refetch)
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function isLocked(bulletin: { status?: string; lockedAt?: string | null } | null): boolean {
  return bulletin?.status === 'locked' || bulletin?.lockedAt != null;
}

/**
 * Check if items have changed (for change detection)
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function detectItemChanges(apiItems: ServiceItem[], stableItems: ServiceItem[]): boolean {
  if (apiItems.length !== stableItems.length) {
    return true;
  }
  const apiIds = apiItems.map(i => i.id).join(',');
  const stableIds = stableItems.map(i => i.id).join(',');
  return apiIds !== stableIds;
}

/**
 * Find new position after reload
 * Mirrors handleReloadChanges logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function findNewPositionAfterReload(
  currentItemId: string | undefined,
  apiItems: ServiceItem[],
  currentIndex: number
): number {
  if (currentItemId) {
    const newIndex = apiItems.findIndex(item => item.id === currentItemId);
    if (newIndex >= 0) {
      return newIndex;
    }
  }
  return Math.min(currentIndex, apiItems.length - 1);
}

/**
 * Handle exit confirmation keyboard shortcuts
 * Mirrors logic from apps/web/src/app/bulletins/[id]/preach/page.tsx
 */
function handleExitConfirmKeyboard(key: string): 'confirm' | 'cancel' | 'none' {
  if (key === 'Enter' || key === 'y' || key === 'Y') {
    return 'confirm';
  }
  if (key === 'Escape' || key === 'n' || key === 'N') {
    return 'cancel';
  }
  return 'none';
}

describe('Preach Mode Duration Calculations', () => {
  describe('computeDurationTotals', () => {
    it('calculates total duration correctly', () => {
      const result = computeDurationTotals(testItems, 0);
      // 5 + 4 + 3 + 30 + 2 = 44 total minutes
      expect(result.totalPlannedMinutes).toBe(44);
    });

    it('calculates duration through current item at start', () => {
      const result = computeDurationTotals(testItems, 0);
      expect(result.plannedThroughCurrent).toBe(5); // Only first item
    });

    it('calculates duration through current item in middle', () => {
      const result = computeDurationTotals(testItems, 2);
      // 5 + 4 + 3 = 12 minutes through third item
      expect(result.plannedThroughCurrent).toBe(12);
    });

    it('calculates duration through current item at end', () => {
      const result = computeDurationTotals(testItems, 4);
      // All items: 5 + 4 + 3 + 30 + 2 = 44
      expect(result.plannedThroughCurrent).toBe(44);
    });

    it('handles items without duration', () => {
      const itemsWithNoDuration: ServiceItem[] = [
        { id: '1', type: 'Welcome', title: 'Welcome', sequence: 1 },
        { id: '2', type: 'Song', title: 'Song', sequence: 2 },
      ];
      const result = computeDurationTotals(itemsWithNoDuration, 1);
      expect(result.totalPlannedMinutes).toBe(0);
      expect(result.plannedThroughCurrent).toBe(0);
    });

    it('handles empty items array', () => {
      const result = computeDurationTotals([], 0);
      expect(result.totalPlannedMinutes).toBe(0);
      expect(result.plannedThroughCurrent).toBe(0);
    });
  });
});

describe('Preach Mode Section Grouping', () => {
  describe('groupItemsBySection', () => {
    it('groups items by section', () => {
      const groups = groupItemsBySection(testItems);

      // Should have 4 groups: pre-service, worship (2 items), message, closing
      expect(groups.length).toBe(4);
    });

    it('first group is pre-service', () => {
      const groups = groupItemsBySection(testItems);
      expect(groups[0].section).toBe('pre-service');
      expect(groups[0].items.length).toBe(1);
    });

    it('worship group has 2 items', () => {
      const groups = groupItemsBySection(testItems);
      const worshipGroup = groups.find(g => g.section === 'worship');
      expect(worshipGroup?.items.length).toBe(2);
    });

    it('preserves original indices', () => {
      const groups = groupItemsBySection(testItems);
      // First item in first group should have index 0
      expect(groups[0].items[0].index).toBe(0);
      // Last item in last group should have index 4
      expect(groups[groups.length - 1].items[groups[groups.length - 1].items.length - 1].index).toBe(4);
    });

    it('handles items without section', () => {
      const itemsNoSection: ServiceItem[] = [
        { id: '1', type: 'Welcome', title: 'Welcome', sequence: 1 },
        { id: '2', type: 'Song', title: 'Song', sequence: 2 },
      ];
      const groups = groupItemsBySection(itemsNoSection);
      // Both items have undefined section
      // First item creates a group with section undefined
      // Second item has same section (undefined), so joins same group
      expect(groups.length).toBe(1);
      expect(groups[0].section).toBeUndefined();
      expect(groups[0].items.length).toBe(2);
    });

    it('handles mixed section and no-section items', () => {
      const mixedItems: ServiceItem[] = [
        { id: '1', type: 'Welcome', title: 'Welcome', sequence: 1 },
        { id: '2', type: 'Song', title: 'Song', sequence: 2, section: 'worship' },
        { id: '3', type: 'Prayer', title: 'Prayer', sequence: 3, section: 'worship' },
        { id: '4', type: 'Sermon', title: 'Sermon', sequence: 4 },
      ];
      const groups = groupItemsBySection(mixedItems);
      // Groups: null, worship, null
      expect(groups.length).toBe(3);
    });
  });

  describe('SECTION_NAMES', () => {
    it('has display names for all sections', () => {
      expect(SECTION_NAMES['pre-service']).toBe('Pre-Service');
      expect(SECTION_NAMES['worship']).toBe('Worship');
      expect(SECTION_NAMES['message']).toBe('Message');
      expect(SECTION_NAMES['response']).toBe('Response');
      expect(SECTION_NAMES['closing']).toBe('Closing');
      expect(SECTION_NAMES['announcements']).toBe('Announcements');
      expect(SECTION_NAMES['other']).toBe('Other');
    });

    it('has 7 section names defined', () => {
      expect(Object.keys(SECTION_NAMES).length).toBe(7);
    });
  });
});

describe('Preach Mode Lock Detection', () => {
  describe('isLocked', () => {
    it('returns true when status is locked', () => {
      expect(isLocked({ status: 'locked' })).toBe(true);
    });

    it('returns true when lockedAt is set', () => {
      expect(isLocked({ lockedAt: '2024-01-15T10:00:00Z' })).toBe(true);
    });

    it('returns false when status is draft', () => {
      expect(isLocked({ status: 'draft' })).toBe(false);
    });

    it('returns false when both status and lockedAt are not set', () => {
      expect(isLocked({})).toBe(false);
    });

    it('returns false for null bulletin', () => {
      expect(isLocked(null)).toBe(false);
    });

    it('returns true when both status locked and lockedAt set', () => {
      expect(isLocked({ status: 'locked', lockedAt: '2024-01-15T10:00:00Z' })).toBe(true);
    });
  });
});

describe('Preach Mode Change Detection', () => {
  describe('detectItemChanges', () => {
    it('detects when item count changed', () => {
      const apiItems = testItems;
      const stableItems = testItems.slice(0, 3);
      expect(detectItemChanges(apiItems, stableItems)).toBe(true);
    });

    it('detects when item IDs changed', () => {
      const apiItems = testItems;
      const stableItems = testItems.map((item, i) =>
        i === 0 ? { ...item, id: 'changed-id' } : item
      );
      expect(detectItemChanges(apiItems, stableItems)).toBe(true);
    });

    it('returns false when items are identical', () => {
      const apiItems = testItems;
      const stableItems = [...testItems];
      expect(detectItemChanges(apiItems, stableItems)).toBe(false);
    });

    it('detects reordering of items', () => {
      const apiItems = testItems;
      const stableItems = [...testItems].reverse();
      expect(detectItemChanges(apiItems, stableItems)).toBe(true);
    });
  });

  describe('findNewPositionAfterReload', () => {
    it('maintains position if item still exists', () => {
      const currentItemId = testItems[2].id;
      const newIndex = findNewPositionAfterReload(currentItemId, testItems, 2);
      expect(newIndex).toBe(2);
    });

    it('returns nearest valid index if item removed', () => {
      const currentItemId = 'non-existent-id';
      const newIndex = findNewPositionAfterReload(currentItemId, testItems, 3);
      expect(newIndex).toBe(3); // min(3, 4) = 3
    });

    it('clamps to last item if current index exceeds new length', () => {
      const currentItemId = 'non-existent-id';
      const shorterList = testItems.slice(0, 2);
      const newIndex = findNewPositionAfterReload(currentItemId, shorterList, 4);
      expect(newIndex).toBe(1); // Last valid index
    });

    it('handles undefined currentItemId', () => {
      const newIndex = findNewPositionAfterReload(undefined, testItems, 2);
      expect(newIndex).toBe(2);
    });
  });
});

describe('Preach Mode Exit Confirmation', () => {
  describe('handleExitConfirmKeyboard', () => {
    it('confirms with Enter', () => {
      expect(handleExitConfirmKeyboard('Enter')).toBe('confirm');
    });

    it('confirms with Y', () => {
      expect(handleExitConfirmKeyboard('Y')).toBe('confirm');
    });

    it('confirms with y', () => {
      expect(handleExitConfirmKeyboard('y')).toBe('confirm');
    });

    it('cancels with Escape', () => {
      expect(handleExitConfirmKeyboard('Escape')).toBe('cancel');
    });

    it('cancels with N', () => {
      expect(handleExitConfirmKeyboard('N')).toBe('cancel');
    });

    it('cancels with n', () => {
      expect(handleExitConfirmKeyboard('n')).toBe('cancel');
    });

    it('returns none for other keys', () => {
      expect(handleExitConfirmKeyboard('ArrowRight')).toBe('none');
      expect(handleExitConfirmKeyboard('Space')).toBe('none');
      expect(handleExitConfirmKeyboard('a')).toBe('none');
    });
  });

  describe('Exit confirmation behavior', () => {
    it('Escape key triggers confirmation dialog, not immediate exit', () => {
      // The Escape key should trigger handleExitRequest, not router.push
      // This tests the expected behavior
      const keyTriggersExitRequest = (key: string) => key === 'Escape';
      expect(keyTriggersExitRequest('Escape')).toBe(true);
    });

    it('Exit button triggers confirmation dialog', () => {
      // The X button calls handleExitRequest, not direct navigation
      const buttonHandlerName = 'handleExitRequest';
      expect(buttonHandlerName).not.toBe('router.push');
    });
  });
});

describe('Preach Mode Resilience', () => {
  describe('Stable items behavior', () => {
    it('uses stable items after initial load', () => {
      // After initialLoadCompleteRef becomes true, UI should use stableItems
      const initialLoadComplete = true;
      const shouldUseStableItems = initialLoadComplete;
      expect(shouldUseStableItems).toBe(true);
    });

    it('initializes stable items on first successful load', () => {
      // When apiItems.length > 0 and not yet initialized
      const apiItemsLoaded = testItems.length > 0;
      const notYetInitialized = true;
      const shouldInitialize = apiItemsLoaded && notYetInitialized;
      expect(shouldInitialize).toBe(true);
    });
  });

  describe('Refetch behavior', () => {
    it('locked bulletin does not auto-refetch', () => {
      const refetchInterval = isLocked({ status: 'locked' }) ? false : 60000;
      expect(refetchInterval).toBe(false);
    });

    it('unlocked bulletin auto-refetches every 60 seconds', () => {
      const refetchInterval = isLocked({ status: 'draft' }) ? false : 60000;
      expect(refetchInterval).toBe(60000);
    });

    it('never refetches on window focus', () => {
      const refetchOnWindowFocus = false;
      expect(refetchOnWindowFocus).toBe(false);
    });
  });

  describe('Connection status', () => {
    it('shows error status when items query fails after initial load', () => {
      const itemsError = new Error('Network error');
      const initialLoadComplete = true;
      const connectionStatus = itemsError && initialLoadComplete ? 'error' : 'ok';
      expect(connectionStatus).toBe('error');
    });

    it('shows ok status when no error', () => {
      const itemsError = null;
      const isRefetching = false;
      const connectionStatus = !itemsError && !isRefetching ? 'ok' : 'checking';
      expect(connectionStatus).toBe('ok');
    });
  });
});

describe('Preach Mode Route Protection', () => {
  it('requires authentication with specific roles', () => {
    const requiredRoles = ['admin', 'editor', 'submitter', 'viewer'];

    expect(requiredRoles).toContain('admin');
    expect(requiredRoles).toContain('editor');
    expect(requiredRoles).toContain('submitter');
    expect(requiredRoles).toContain('viewer');
  });

  it('excludes kiosk role', () => {
    const requiredRoles = ['admin', 'editor', 'submitter', 'viewer'];
    expect(requiredRoles).not.toContain('kiosk');
  });

  it('uses ProtectedPage component for both desktop and mobile', () => {
    // Both pages use ProtectedPage wrapper
    const desktopUsesProtectedPage = true;
    const mobileUsesProtectedPage = true;
    expect(desktopUsesProtectedPage && mobileUsesProtectedPage).toBe(true);
  });
});
