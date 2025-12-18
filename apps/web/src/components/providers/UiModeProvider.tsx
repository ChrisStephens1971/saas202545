'use client';

/**
 * UiModeProvider Wrapper
 *
 * Client component wrapper that connects UiModeContext to:
 * 1. User session (initial mode from session.user.uiMode)
 * 2. tRPC mutation for persistence
 *
 * See: apps/web/src/ui/UiModeContext.tsx for core implementation
 */

import { ReactNode, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  UiModeProvider as CoreUiModeProvider,
  UiMode,
  DEFAULT_UI_MODE,
} from '@/ui/UiModeContext';
import { trpc } from '@/lib/trpc/client';

interface UiModeProviderWrapperProps {
  children: ReactNode;
}

export function UiModeProvider({ children }: UiModeProviderWrapperProps) {
  const { data: session } = useSession();

  // Get initial mode from session, default to 'accessible'
  const initialMode: UiMode = (session?.user?.uiMode as UiMode) || DEFAULT_UI_MODE;

  // tRPC mutation for persisting mode changes
  const updateUiModeMutation = trpc.userPreferences.updateUiMode.useMutation();

  // Callback to persist mode changes to the backend
  const handleModeChange = useCallback(
    async (newMode: UiMode) => {
      try {
        await updateUiModeMutation.mutateAsync({ uiMode: newMode });
      } catch (error) {
        // Error is logged in the core provider, just rethrow
        throw error;
      }
    },
    [updateUiModeMutation]
  );

  return (
    <CoreUiModeProvider initialMode={initialMode} onModeChange={handleModeChange}>
      {children}
    </CoreUiModeProvider>
  );
}
