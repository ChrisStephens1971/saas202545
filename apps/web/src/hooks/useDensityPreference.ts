'use client';

/**
 * useDensityPreference - Hook for managing UI density preference
 *
 * Provides:
 * - 'standard' mode: Default density
 * - 'elder' mode: Larger text, more padding, bigger touch targets
 *
 * Persists preference to localStorage.
 */

import { useState, useEffect, useCallback } from 'react';

export type DensityMode = 'standard' | 'elder';

const DENSITY_STORAGE_KEY = 'church-density-preference';

interface UseDensityPreferenceReturn {
  /** Current density mode */
  density: DensityMode;
  /** Whether the hook has hydrated from localStorage */
  isHydrated: boolean;
  /** Set density mode */
  setDensity: (mode: DensityMode) => void;
  /** Toggle between standard and elder modes */
  toggleDensity: () => void;
  /** Whether current mode is elder (convenience) */
  isElderMode: boolean;
}

/**
 * Hook to manage UI density preference
 */
export function useDensityPreference(): UseDensityPreferenceReturn {
  const [density, setDensityState] = useState<DensityMode>('standard');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (stored === 'elder' || stored === 'standard') {
      setDensityState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Update localStorage when density changes
  const setDensity = useCallback((mode: DensityMode) => {
    setDensityState(mode);
    localStorage.setItem(DENSITY_STORAGE_KEY, mode);
  }, []);

  // Toggle between modes
  const toggleDensity = useCallback(() => {
    const newMode = density === 'standard' ? 'elder' : 'standard';
    setDensity(newMode);
  }, [density, setDensity]);

  return {
    density,
    isHydrated,
    setDensity,
    toggleDensity,
    isElderMode: density === 'elder',
  };
}

/**
 * Get density-specific class names for common adjustments
 */
export function getDensityClasses(density: DensityMode) {
  const isElder = density === 'elder';

  return {
    // Text sizes
    textBase: isElder ? 'text-lg' : 'text-base',
    textSm: isElder ? 'text-base' : 'text-sm',
    textXs: isElder ? 'text-sm' : 'text-xs',

    // Padding
    paddingCard: isElder ? 'p-5' : 'p-3',
    paddingSection: isElder ? 'p-6' : 'p-4',
    paddingItem: isElder ? 'p-4' : 'p-3',

    // Gaps
    gap: isElder ? 'gap-4' : 'gap-3',
    gapSmall: isElder ? 'gap-3' : 'gap-2',

    // Touch targets
    minHeight: isElder ? 'min-h-[52px]' : 'min-h-[44px]',
    buttonSize: isElder ? 'h-12 w-12' : 'h-10 w-10',
    iconSize: isElder ? 'h-6 w-6' : 'h-5 w-5',
  };
}
