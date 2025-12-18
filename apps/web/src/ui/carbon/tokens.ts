/**
 * Carbon Design Tokens
 *
 * Inspired by IBM Carbon Design System.
 * These tokens define the visual foundation for the Carbon shell.
 *
 * Colors, typography, spacing, and borders are defined as Tailwind utility classes
 * to integrate seamlessly with the existing Tailwind setup.
 */

// =============================================================================
// COLORS
// =============================================================================

export const colors = {
  // Primary blue (IBM Blue)
  primary: {
    50: 'bg-blue-50',
    100: 'bg-blue-100',
    600: 'bg-blue-600',
    700: 'bg-blue-700',
    text: 'text-blue-600',
    textHover: 'text-blue-700',
    border: 'border-blue-600',
  },

  // Neutral grays
  neutral: {
    50: 'bg-gray-50',
    100: 'bg-gray-100',
    200: 'bg-gray-200',
    300: 'bg-gray-300',
    400: 'bg-gray-400',
    500: 'bg-gray-500',
    600: 'bg-gray-600',
    700: 'bg-gray-700',
    800: 'bg-gray-800',
    900: 'bg-gray-900',
    text50: 'text-gray-50',
    text100: 'text-gray-100',
    text400: 'text-gray-400',
    text500: 'text-gray-500',
    text600: 'text-gray-600',
    text700: 'text-gray-700',
    text800: 'text-gray-800',
    text900: 'text-gray-900',
    border200: 'border-gray-200',
    border300: 'border-gray-300',
  },

  // Backgrounds
  background: {
    page: 'bg-[#f4f4f4]',
    sidebar: 'bg-gray-100',
    topbar: 'bg-white',
    card: 'bg-white',
    hover: 'hover:bg-gray-100',
    active: 'bg-gray-200',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  pageTitle: {
    standard: 'text-2xl font-semibold text-gray-900 tracking-tight',
    elder: 'text-3xl font-semibold text-gray-900 tracking-tight',
  },
  subtitle: {
    standard: 'text-base text-gray-600',
    elder: 'text-lg text-gray-600',
  },
  body: {
    standard: 'text-sm text-gray-700',
    elder: 'text-base text-gray-700',
  },
  label: {
    standard: 'text-xs font-medium text-gray-500 uppercase tracking-wide',
    elder: 'text-sm font-medium text-gray-500 uppercase tracking-wide',
  },
  navItem: {
    standard: 'text-sm font-medium',
    elder: 'text-base font-medium',
  },
  navItemActive: {
    standard: 'text-sm font-semibold',
    elder: 'text-base font-semibold',
  },
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  xs: {
    standard: 'p-1',
    elder: 'p-1.5',
  },
  sm: {
    standard: 'p-2',
    elder: 'p-3',
  },
  md: {
    standard: 'p-4',
    elder: 'p-5',
  },
  lg: {
    standard: 'p-6',
    elder: 'p-8',
  },
  xl: {
    standard: 'p-8',
    elder: 'p-10',
  },
  // Margin variants
  mxs: { standard: 'm-1', elder: 'm-1.5' },
  msm: { standard: 'm-2', elder: 'm-3' },
  mmd: { standard: 'm-4', elder: 'm-5' },
  mlg: { standard: 'm-6', elder: 'm-8' },
  mxl: { standard: 'm-8', elder: 'm-10' },
  // Gap variants
  gapXs: { standard: 'gap-1', elder: 'gap-1.5' },
  gapSm: { standard: 'gap-2', elder: 'gap-3' },
  gapMd: { standard: 'gap-4', elder: 'gap-5' },
  gapLg: { standard: 'gap-6', elder: 'gap-8' },
} as const;

// =============================================================================
// RADII
// =============================================================================

export const radii = {
  sm: 'rounded-sm', // 2px
  md: 'rounded',    // 4px
  lg: 'rounded-lg', // 8px
} as const;

// =============================================================================
// BORDERS
// =============================================================================

export const borders = {
  default: 'border border-gray-200',
  light: 'border border-gray-100',
  medium: 'border border-gray-300',
  left: {
    primary: 'border-l-2 border-l-blue-600',
    neutral: 'border-l-2 border-l-transparent',
  },
} as const;

// =============================================================================
// SHADOWS (minimal for Carbon style)
// =============================================================================

export const shadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',
} as const;

// =============================================================================
// LAYOUT
// =============================================================================

export const layout = {
  topbar: {
    height: {
      standard: 'h-12',
      elder: 'h-14',
    },
  },
  sidebar: {
    width: 'w-56',
  },
} as const;

// =============================================================================
// HELPERS
// =============================================================================

import type { UiDensity } from '@/config/uiShellVariant';

/**
 * Get typography classes based on density
 */
export function getTypography(
  variant: keyof typeof typography,
  density: UiDensity
): string {
  return typography[variant][density];
}

/**
 * Get spacing classes based on density
 */
export function getSpacing(
  variant: keyof typeof spacing,
  density: UiDensity
): string {
  return spacing[variant][density];
}

/**
 * Get layout dimension based on density
 */
export function getLayoutHeight(
  component: 'topbar',
  density: UiDensity
): string {
  return layout[component].height[density];
}
