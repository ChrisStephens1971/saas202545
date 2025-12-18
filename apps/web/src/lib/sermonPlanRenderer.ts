/**
 * SermonPlan Element Renderer - Phase 9
 *
 * Shared rendering logic for SermonPlan elements in Preach Mode and Print views.
 * Maps each SermonElement type to appropriate styling and structure.
 *
 * Uses the canonical SermonPlan data source (SermonElement discriminated union)
 * instead of the legacy sermon.outline.mainPoints format.
 */

import type { SermonElement, SermonPlan } from '@elder-first/types';

// ============================================================================
// RENDERING STYLE DEFINITIONS
// ============================================================================

/**
 * Styling configuration for each SermonElement type in Preach Mode.
 */
export const PREACH_MODE_STYLES: Record<
  SermonElement['type'],
  {
    labelClass: string;
    contentClass: string;
    containerClass: string;
    dividerClass: string;
    icon: string; // Icon name for lucide-react
  }
> = {
  section: {
    labelClass: 'font-bold text-[1.5em]',
    contentClass: '',
    containerClass: 'text-center py-4',
    dividerClass: 'border-t-4 border-current opacity-30 mt-6 mb-4',
    icon: 'Heading1',
  },
  point: {
    labelClass: 'font-bold text-[1.2em]',
    contentClass: '',
    containerClass: '',
    dividerClass: 'border-t-2 border-current opacity-20 mt-4 mb-2',
    icon: 'CircleDot',
  },
  note: {
    labelClass: 'font-normal text-[0.9em] opacity-80',
    contentClass: 'text-[0.85em] opacity-80',
    containerClass: '',
    dividerClass: '',
    icon: 'StickyNote',
  },
  scripture: {
    labelClass: 'font-semibold italic text-[1.1em]',
    contentClass: 'italic',
    containerClass: '',
    dividerClass: 'border-t border-current opacity-10 mt-2 mb-2',
    icon: 'BookOpen',
  },
  hymn: {
    labelClass: 'font-medium text-[1em]',
    contentClass: '',
    containerClass: '',
    dividerClass: 'border-t border-current opacity-10 mt-2 mb-2',
    icon: 'Music',
  },
  illustration: {
    labelClass: 'font-medium text-[1em]',
    contentClass: 'text-[0.95em]',
    containerClass: '',
    dividerClass: 'border-t border-dashed border-current opacity-10 mt-2 mb-2',
    icon: 'Lightbulb',
  },
};

/**
 * Styling configuration for each SermonElement type in Print view.
 */
export const PRINT_STYLES: Record<
  SermonElement['type'],
  {
    labelClass: string;
    containerClass: string;
    showLabel: boolean;
    labelText: string | null;
  }
> = {
  section: {
    labelClass: 'font-bold text-xl mt-6 mb-3',
    containerClass: '',
    showLabel: false,
    labelText: null,
  },
  point: {
    labelClass: 'font-bold text-lg',
    containerClass: '',
    showLabel: false,
    labelText: null,
  },
  note: {
    labelClass: 'font-normal text-sm text-gray-600',
    containerClass: 'ml-4',
    showLabel: true,
    labelText: 'Note',
  },
  scripture: {
    labelClass: 'font-semibold italic text-base border-l-4 border-amber-500 pl-4',
    containerClass: '',
    showLabel: true,
    labelText: 'Scripture',
  },
  hymn: {
    labelClass: 'font-medium text-base',
    containerClass: '',
    showLabel: true,
    labelText: 'Hymn',
  },
  illustration: {
    labelClass: 'font-medium text-base text-gray-700',
    containerClass: 'ml-4',
    showLabel: true,
    labelText: 'Illustration',
  },
};

/**
 * Color classes for each element type (used for visual distinction).
 */
export const ELEMENT_COLORS = {
  section: {
    light: 'text-purple-700',
    dark: 'text-purple-400',
  },
  point: {
    light: 'text-blue-600',
    dark: 'text-blue-400',
  },
  note: {
    light: 'text-gray-600',
    dark: 'text-gray-400',
  },
  scripture: {
    light: 'text-amber-700',
    dark: 'text-amber-400',
  },
  hymn: {
    light: 'text-teal-700',
    dark: 'text-teal-400',
  },
  illustration: {
    light: 'text-green-700',
    dark: 'text-green-400',
  },
} as const;

// ============================================================================
// ELEMENT CONTENT EXTRACTION
// ============================================================================

/**
 * Extract the primary display text from a SermonElement.
 */
export function getElementDisplayText(element: SermonElement): string {
  switch (element.type) {
    case 'section':
      return element.title;
    case 'point':
      return element.text;
    case 'note':
      return element.text;
    case 'scripture':
      return element.reference;
    case 'hymn':
      return element.title;
    case 'illustration':
      return element.title;
    default:
      return '';
  }
}

/**
 * Extract optional note/secondary text from a SermonElement.
 */
export function getElementNote(element: SermonElement): string | undefined {
  switch (element.type) {
    case 'scripture':
    case 'hymn':
    case 'illustration':
      return element.note;
    default:
      return undefined;
  }
}

/**
 * Get a human-readable label for an element type.
 */
export function getElementTypeLabel(type: SermonElement['type']): string {
  const labels: Record<SermonElement['type'], string> = {
    section: 'Section',
    point: 'Point',
    note: 'Note',
    scripture: 'Scripture',
    hymn: 'Hymn',
    illustration: 'Illustration',
  };
  return labels[type];
}

// ============================================================================
// PREACH MODE BLOCK CONSTRUCTION
// ============================================================================

/**
 * Block structure for Preach Mode navigation.
 */
export type PreachModeBlock =
  | { type: 'header'; content: { title: string; scripture?: string | null; bigIdea?: string } }
  | { type: 'element'; element: SermonElement; index: number }
  | { type: 'conclusion'; content: { notes?: string } }
  | { type: 'fallback'; content: { title: string; scripture?: string | null; manuscript?: string | null } };

/**
 * Build navigation blocks for Preach Mode from a SermonPlan.
 * Creates header, element blocks, and conclusion for navigation.
 */
export function buildPreachModeBlocks(
  sermon: { title: string; primary_scripture?: string | null; manuscript?: string | null },
  plan: SermonPlan | null
): PreachModeBlock[] {
  // If we have a SermonPlan with elements, use it
  if (plan && plan.elements && plan.elements.length > 0) {
    const blocks: PreachModeBlock[] = [
      {
        type: 'header',
        content: {
          title: plan.title || sermon.title,
          scripture: plan.primaryText || sermon.primary_scripture,
          bigIdea: plan.bigIdea,
        },
      },
      ...plan.elements.map((element, index) => ({
        type: 'element' as const,
        element,
        index,
      })),
      {
        type: 'conclusion',
        content: {
          notes: plan.notes,
        },
      },
    ];
    return blocks;
  }

  // Fallback: no SermonPlan, show basic content
  return [
    {
      type: 'fallback',
      content: {
        title: sermon.title,
        scripture: sermon.primary_scripture,
        manuscript: sermon.manuscript,
      },
    },
  ];
}

// ============================================================================
// PRINT VIEW UTILITIES
// ============================================================================

/**
 * Filter elements for print view.
 * Currently includes all elements (no print filtering on SermonElement yet).
 * This can be extended if we add a `includeInPrint` field to SermonElement.
 */
export function filterPrintableElements(elements: SermonElement[]): SermonElement[] {
  // For now, include all elements in print
  // Future: check element.includeInPrint if added to the schema
  return elements;
}

/**
 * Count section elements up to a given index for numbering.
 */
export function countSectionsUpTo(elements: SermonElement[], index: number): number {
  return elements.slice(0, index + 1).filter((el) => el.type === 'section').length;
}

/**
 * Count point elements within the current section (for point numbering).
 */
export function getPointNumberInSection(elements: SermonElement[], index: number): number {
  // Find the last section before this element
  let lastSectionIndex = -1;
  for (let i = index - 1; i >= 0; i--) {
    if (elements[i].type === 'section') {
      lastSectionIndex = i;
      break;
    }
  }

  // Count points between the last section and this element
  const startIndex = lastSectionIndex + 1;
  return elements
    .slice(startIndex, index + 1)
    .filter((el) => el.type === 'point').length;
}

// ============================================================================
// PLAN METADATA HELPERS
// ============================================================================

/**
 * Check if a SermonPlan has displayable content.
 */
export function hasPlanContent(plan: SermonPlan | null): boolean {
  if (!plan) return false;
  return (
    plan.elements.length > 0 ||
    !!plan.bigIdea ||
    !!plan.primaryText ||
    !!plan.notes
  );
}

/**
 * Get supporting texts as a formatted string.
 */
export function formatSupportingTexts(plan: SermonPlan): string {
  if (!plan.supportingTexts || plan.supportingTexts.length === 0) {
    return '';
  }
  return plan.supportingTexts.join(', ');
}
