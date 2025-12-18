'use client';

/**
 * UiModeContext - Dual-UI Architecture Core
 *
 * Provides per-user UI mode preference throughout the app.
 * UiMode controls density, sizing, and visual complexity.
 *
 * Modes:
 *   'accessible' - Elder-first default: 18px fonts, 48px touch targets (P15 baseline)
 *   'modern'     - Denser layout: 16px fonts, 40px controls (still P15 compliant)
 *
 * IMPORTANT: Both modes MUST comply with artifacts/P15_accessibility.md.
 * "Modern" is allowed to be more compact but may NOT regress below accessibility baselines.
 *
 * See: docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export type UiMode = 'modern' | 'accessible';

export const DEFAULT_UI_MODE: UiMode = 'accessible';

export interface UiModeContextValue {
  /** Current UI mode */
  mode: UiMode;
  /** Update the UI mode (updates local state immediately, persists async) */
  setMode: (mode: UiMode) => void;
  /** Whether the mode is being persisted */
  isPersisting: boolean;
}

// ============================================================================
// Context
// ============================================================================

const UiModeContext = createContext<UiModeContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface UiModeProviderProps {
  /** Initial mode from session/user preferences */
  initialMode?: UiMode;
  /** Children to render */
  children: ReactNode;
  /** Optional callback when mode changes (for persistence) */
  onModeChange?: (mode: UiMode) => Promise<void>;
}

export function UiModeProvider({
  initialMode = DEFAULT_UI_MODE,
  children,
  onModeChange,
}: UiModeProviderProps) {
  const [mode, setModeState] = useState<UiMode>(initialMode);
  const [isPersisting, setIsPersisting] = useState(false);

  // Sync data attribute on <html> element when mode changes
  useEffect(() => {
    // Update the data attribute on the html element
    document.documentElement.dataset.uiMode = mode;
  }, [mode]);

  // Handle mode changes with optional persistence
  const setMode = useCallback(
    async (newMode: UiMode) => {
      // Update local state immediately for instant UI response
      setModeState(newMode);

      // Persist if callback provided
      if (onModeChange) {
        setIsPersisting(true);
        try {
          await onModeChange(newMode);
        } catch (error) {
          // Log error but don't revert - local state is source of truth
          console.error('[UiMode] Failed to persist mode:', error);
        } finally {
          setIsPersisting(false);
        }
      }
    },
    [onModeChange]
  );

  const value: UiModeContextValue = {
    mode,
    setMode,
    isPersisting,
  };

  return (
    <UiModeContext.Provider value={value}>{children}</UiModeContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access the current UI mode and setter.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mode, setMode } = useUiMode();
 *
 *   return (
 *     <div>
 *       Current mode: {mode}
 *       <button onClick={() => setMode('modern')}>Modern</button>
 *       <button onClick={() => setMode('accessible')}>Accessible</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUiMode(): UiModeContextValue {
  const context = useContext(UiModeContext);

  if (context === undefined) {
    throw new Error('useUiMode must be used within a UiModeProvider');
  }

  return context;
}

// ============================================================================
// Utility Hook - Safe version that returns default if outside provider
// ============================================================================

/**
 * Safe version of useUiMode that returns default values if outside provider.
 * Useful for components that may render before provider is mounted.
 */
export function useUiModeSafe(): UiModeContextValue {
  const context = useContext(UiModeContext);

  if (context === undefined) {
    return {
      mode: DEFAULT_UI_MODE,
      setMode: () => {
        console.warn('[UiMode] setMode called outside UiModeProvider');
      },
      isPersisting: false,
    };
  }

  return context;
}
