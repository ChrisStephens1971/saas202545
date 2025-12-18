/**
 * AI Status Hook
 *
 * Provides a unified view of AI availability for the current environment.
 * Uses ai.aiConfig for general availability and optionally aiSettings.get
 * for richer admin-only details.
 */

import { trpc } from '@/lib/trpc/client';

export type AiStatusKind = 'on' | 'off' | 'loading' | 'error';

export interface AiStatus {
  kind: AiStatusKind;
  enabled: boolean;
  hasKey?: boolean;
  provider?: string;
  reason?: string;
}

interface UseAiStatusOptions {
  /**
   * When true, also fetches aiSettings.get for richer info (admin-only).
   * Only use on admin pages like Settings.
   */
  includeAdminDetails?: boolean;
}

/**
 * Hook to get AI status for the current environment.
 *
 * @param options.includeAdminDetails - Fetch aiSettings.get for hasKey/provider (admin-only)
 * @returns AiStatus object with kind, enabled, and optional details
 */
export function useAiStatus(options: UseAiStatusOptions = {}): AiStatus {
  const { includeAdminDetails = false } = options;

  // Always fetch the general AI config (available to all authenticated users)
  const aiConfigQuery = trpc.ai.aiConfig.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Only fetch admin details when requested (admin-only endpoint)
  const aiSettingsQuery = trpc.aiSettings.get.useQuery(undefined, {
    enabled: includeAdminDetails,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Handle loading state
  if (aiConfigQuery.isLoading) {
    return {
      kind: 'loading',
      enabled: false,
    };
  }

  // Also wait for admin details if requested
  if (includeAdminDetails && aiSettingsQuery.isLoading) {
    return {
      kind: 'loading',
      enabled: false,
    };
  }

  // Handle error state
  if (aiConfigQuery.isError) {
    return {
      kind: 'error',
      enabled: false,
      reason: 'Unable to check AI status',
    };
  }

  // Determine status based on query results
  const enabled = aiConfigQuery.data?.enabled ?? false;
  const hasKey = aiSettingsQuery.data?.hasKey;
  const provider = aiSettingsQuery.data?.provider;

  // Determine reason if AI is off
  let reason: string | undefined;
  if (!enabled) {
    if (includeAdminDetails && aiSettingsQuery.data) {
      if (!aiSettingsQuery.data.hasKey) {
        reason = 'No API key configured';
      } else if (!aiSettingsQuery.data.enabled) {
        reason = 'AI disabled in settings';
      } else {
        // Has key and enabled in settings, but still off = env gating
        reason = 'Disabled for this environment';
      }
    } else {
      // Without admin details, we can only give a generic message
      reason = 'AI features not available';
    }
  }

  return {
    kind: enabled ? 'on' : 'off',
    enabled,
    hasKey,
    provider,
    reason,
  };
}

/**
 * Simple hook that just returns whether AI is enabled.
 * Lightweight alternative for non-admin contexts.
 */
export function useAiEnabled(): { enabled: boolean; isLoading: boolean } {
  const aiConfigQuery = trpc.ai.aiConfig.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    enabled: aiConfigQuery.data?.enabled ?? false,
    isLoading: aiConfigQuery.isLoading,
  };
}
