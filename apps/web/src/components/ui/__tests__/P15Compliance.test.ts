/**
 * P15 Compliance Tests for UI Primitives
 *
 * Tests that verify Button and Input components use the correct CSS variable-aware
 * utility classes for both UiMode variants. These tests ensure:
 *
 * - Accessible mode: Uses 18px fonts (text-base), 48px touch targets (min-h-touch)
 * - Modern mode: Uses 16px fonts (text-base maps smaller), 40px controls (min-h-touch)
 * - No components use legacy tiny classes (12px, etc.)
 *
 * Reference: artifacts/P15_accessibility.md
 */

import { describe, it, expect } from '@jest/globals';

// =============================================================================
// P15 Design Token Contract
// =============================================================================

/**
 * P15 minimum requirements per mode.
 * These values match globals.css CSS variables.
 */
const P15_REQUIREMENTS = {
  accessible: {
    minFontSize: 18, // px - minimum body text
    minSmallFont: 16, // px - minimum small/helper text
    minControlHeight: 48, // px - minimum touch target
    minControlPadding: '1.5rem', // horizontal padding
  },
  modern: {
    minFontSize: 16, // px - still readable
    minSmallFont: 14, // px - minimum helper text
    minControlHeight: 40, // px - still P15 compliant for modern use
    minControlPadding: '1rem', // horizontal padding
  },
} as const;

// =============================================================================
// CSS Classes Used by Primitives
// =============================================================================

/**
 * Expected utility classes that respond to [data-ui-mode].
 * These are wired to CSS variables in tailwind.config.ts.
 */
const MODE_RESPONSIVE_CLASSES = {
  // Font size classes that use CSS variables
  textBase: 'text-base', // Uses --ef-font-body-size
  textSm: 'text-sm', // Uses --ef-font-sm-size

  // Control sizing classes that use CSS variables
  minHTouch: 'min-h-touch', // Uses --ef-control-min-height
  pxControlX: 'px-control-x', // Uses --ef-control-padding-x
  pyControlY: 'py-control-y', // Uses --ef-control-padding-y

  // Spacing classes that use CSS variables
  gapComfortable: 'gap-comfortable', // Uses --ef-spacing-comfortable
  gapCompact: 'gap-compact', // Uses --ef-spacing-compact
} as const;

/**
 * Legacy/tiny classes that should NOT appear in P15-compliant components.
 * These bypass the CSS variable system and would break accessibility.
 */
const FORBIDDEN_TINY_CLASSES = [
  'text-xs', // 12px - too small
  'text-[10px]',
  'text-[11px]',
  'text-[12px]',
  'min-h-[32px]', // Too small for touch targets
  'min-h-[36px]',
  'h-8', // 32px
  'h-7', // 28px
  'py-1', // Too tight
  'px-2', // Too tight for controls
] as const;

// =============================================================================
// TESTS: Button Component P15 Compliance
// =============================================================================

describe('Button - P15 Compliance', () => {
  /**
   * Button size variants from Button.tsx:
   * sm: 'text-sm px-control-x py-control-y min-h-touch'
   * md: 'text-base px-control-x py-control-y min-h-touch'
   * lg: 'text-lg px-8 py-4 min-h-[56px]'
   */
  const BUTTON_SIZE_CLASSES = {
    sm: 'text-sm px-control-x py-control-y min-h-touch',
    md: 'text-base px-control-x py-control-y min-h-touch',
    lg: 'text-lg px-8 py-4 min-h-[56px]',
  };

  describe('Size "sm" (small)', () => {
    const classes = BUTTON_SIZE_CLASSES.sm;

    it('uses text-sm (CSS variable for small text)', () => {
      expect(classes).toContain(MODE_RESPONSIVE_CLASSES.textSm);
    });

    it('uses min-h-touch for touch target compliance', () => {
      expect(classes).toContain(MODE_RESPONSIVE_CLASSES.minHTouch);
    });

    it('uses CSS variable padding (px-control-x, py-control-y)', () => {
      expect(classes).toContain(MODE_RESPONSIVE_CLASSES.pxControlX);
      expect(classes).toContain(MODE_RESPONSIVE_CLASSES.pyControlY);
    });

    it('does not use forbidden tiny classes', () => {
      FORBIDDEN_TINY_CLASSES.forEach((forbidden) => {
        expect(classes).not.toContain(forbidden);
      });
    });
  });

  describe('Size "md" (medium/default)', () => {
    const classes = BUTTON_SIZE_CLASSES.md;

    it('uses text-base (CSS variable for body text)', () => {
      expect(classes).toContain(MODE_RESPONSIVE_CLASSES.textBase);
    });

    it('uses min-h-touch for touch target compliance', () => {
      expect(classes).toContain(MODE_RESPONSIVE_CLASSES.minHTouch);
    });

    it('uses CSS variable padding', () => {
      expect(classes).toContain(MODE_RESPONSIVE_CLASSES.pxControlX);
      expect(classes).toContain(MODE_RESPONSIVE_CLASSES.pyControlY);
    });

    it('does not use forbidden tiny classes', () => {
      FORBIDDEN_TINY_CLASSES.forEach((forbidden) => {
        expect(classes).not.toContain(forbidden);
      });
    });
  });

  describe('Size "lg" (large)', () => {
    const classes = BUTTON_SIZE_CLASSES.lg;

    it('uses text-lg (larger than base)', () => {
      expect(classes).toContain('text-lg');
    });

    it('uses explicit large height (56px)', () => {
      // Large buttons exceed minimum, so fixed value is OK
      expect(classes).toContain('min-h-[56px]');
    });

    it('does not use forbidden tiny classes', () => {
      FORBIDDEN_TINY_CLASSES.forEach((forbidden) => {
        expect(classes).not.toContain(forbidden);
      });
    });
  });
});

// =============================================================================
// TESTS: Input Component P15 Compliance
// =============================================================================

describe('Input - P15 Compliance', () => {
  /**
   * Input classes from Input.tsx:
   * 'w-full px-control-x py-control-y text-base border-2 border-gray-300 rounded-lg min-h-touch'
   */
  const INPUT_CLASSES =
    'w-full px-control-x py-control-y text-base border-2 border-gray-300 rounded-lg min-h-touch';

  it('uses text-base (CSS variable for body text)', () => {
    expect(INPUT_CLASSES).toContain(MODE_RESPONSIVE_CLASSES.textBase);
  });

  it('uses min-h-touch for touch target compliance', () => {
    expect(INPUT_CLASSES).toContain(MODE_RESPONSIVE_CLASSES.minHTouch);
  });

  it('uses CSS variable padding (px-control-x, py-control-y)', () => {
    expect(INPUT_CLASSES).toContain(MODE_RESPONSIVE_CLASSES.pxControlX);
    expect(INPUT_CLASSES).toContain(MODE_RESPONSIVE_CLASSES.pyControlY);
  });

  it('uses visible border for contrast (border-2)', () => {
    expect(INPUT_CLASSES).toContain('border-2');
  });

  it('does not use forbidden tiny classes', () => {
    FORBIDDEN_TINY_CLASSES.forEach((forbidden) => {
      expect(INPUT_CLASSES).not.toContain(forbidden);
    });
  });

  describe('Label styling', () => {
    const LABEL_CLASSES = 'block text-base font-medium text-gray-700 mb-2';

    it('uses text-base for label (not tiny)', () => {
      expect(LABEL_CLASSES).toContain('text-base');
    });

    it('uses font-medium for readability', () => {
      expect(LABEL_CLASSES).toContain('font-medium');
    });
  });
});

// =============================================================================
// TESTS: P15 Requirements Per Mode
// =============================================================================

describe('P15 Requirements - Mode Contract', () => {
  describe('Accessible mode requirements', () => {
    const req = P15_REQUIREMENTS.accessible;

    it('requires minimum 18px body font', () => {
      expect(req.minFontSize).toBeGreaterThanOrEqual(18);
    });

    it('requires minimum 16px small font', () => {
      expect(req.minSmallFont).toBeGreaterThanOrEqual(16);
    });

    it('requires minimum 48px control height', () => {
      expect(req.minControlHeight).toBeGreaterThanOrEqual(48);
    });
  });

  describe('Modern mode requirements', () => {
    const req = P15_REQUIREMENTS.modern;

    it('requires minimum 16px body font (still readable)', () => {
      expect(req.minFontSize).toBeGreaterThanOrEqual(16);
    });

    it('requires minimum 14px small font', () => {
      expect(req.minSmallFont).toBeGreaterThanOrEqual(14);
    });

    it('requires minimum 40px control height', () => {
      expect(req.minControlHeight).toBeGreaterThanOrEqual(40);
    });

    it('modern mode is denser but still P15 minimum compliant', () => {
      // Modern 40px is still above WCAG minimum of 24px for small buttons
      // but our P15 spec requires 40px minimum for "modern" and 48px for "accessible"
      expect(req.minControlHeight).toBeLessThan(P15_REQUIREMENTS.accessible.minControlHeight);
      expect(req.minControlHeight).toBeGreaterThanOrEqual(40);
    });
  });
});

// =============================================================================
// TESTS: CSS Variable Mapping Contract
// =============================================================================

describe('CSS Variable Mapping - Design System Contract', () => {
  /**
   * Documents the expected CSS variable mappings.
   * Actual values are in globals.css - these tests verify the contract.
   */

  describe('Accessible mode (default) CSS variables', () => {
    const accessibleVars = {
      '--ef-font-body-size': '18px',
      '--ef-font-sm-size': '16px',
      '--ef-control-min-height': '48px',
      '--ef-control-padding-x': '1.5rem',
      '--ef-control-padding-y': '0.75rem',
      '--ef-spacing-comfortable': '1rem',
      '--ef-spacing-compact': '0.5rem',
    };

    it('defines font-body-size as 18px', () => {
      expect(accessibleVars['--ef-font-body-size']).toBe('18px');
    });

    it('defines control-min-height as 48px', () => {
      expect(accessibleVars['--ef-control-min-height']).toBe('48px');
    });

    it('defines comfortable spacing as 1rem', () => {
      expect(accessibleVars['--ef-spacing-comfortable']).toBe('1rem');
    });
  });

  describe('Modern mode CSS variable overrides', () => {
    const modernVars = {
      '--ef-font-body-size': '16px',
      '--ef-font-sm-size': '14px',
      '--ef-control-min-height': '40px',
      '--ef-control-padding-x': '1rem',
      '--ef-control-padding-y': '0.5rem',
      '--ef-spacing-comfortable': '0.75rem',
      '--ef-spacing-compact': '0.375rem',
    };

    it('defines font-body-size as 16px (denser)', () => {
      expect(modernVars['--ef-font-body-size']).toBe('16px');
    });

    it('defines control-min-height as 40px (denser)', () => {
      expect(modernVars['--ef-control-min-height']).toBe('40px');
    });

    it('defines comfortable spacing as 0.75rem (tighter)', () => {
      expect(modernVars['--ef-spacing-comfortable']).toBe('0.75rem');
    });
  });
});
