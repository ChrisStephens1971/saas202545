'use client';

/**
 * Interface Settings Page
 *
 * Allows users to configure their UI mode preference:
 * - Modern (compact): Denser layout with more information visible
 * - Accessible (simplified): Elder-friendly with larger text and touch targets
 *
 * Changes are persisted via userPreferences.updateUiMode and take effect immediately.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { useUiMode, type UiMode } from '@/ui/UiModeContext';
import { trpc } from '@/lib/trpc/client';
import { Monitor, Accessibility, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function InterfaceSettingsPage() {
  const { mode, setMode, isPersisting } = useUiMode();
  const [error, setError] = useState<string | null>(null);
  const [previousMode, setPreviousMode] = useState<UiMode | null>(null);

  const updateUiModeMutation = trpc.userPreferences.updateUiMode.useMutation({
    onError: (err) => {
      // Revert to previous mode on error
      if (previousMode) {
        setMode(previousMode);
      }
      setError('Failed to save preference. Please try again.');
      console.error('[InterfaceSettings] Failed to update UI mode:', err);
    },
    onSuccess: () => {
      setError(null);
      setPreviousMode(null);
    },
  });

  const handleModeChange = useCallback(
    async (newMode: UiMode) => {
      if (newMode === mode) return;

      // Store previous mode for rollback
      setPreviousMode(mode);
      setError(null);

      // Optimistically update UI immediately
      setMode(newMode);

      // Persist to backend
      try {
        await updateUiModeMutation.mutateAsync({ uiMode: newMode });
      } catch {
        // Error handled by onError callback
      }
    },
    [mode, setMode, updateUiModeMutation]
  );

  const isLoading = isPersisting || updateUiModeMutation.isPending;

  return (
    <ProtectedPage>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header with breadcrumb */}
        <div className="mb-8">
          <div className="text-base text-gray-600 mb-2">
            <Link href="/settings" className="hover:text-primary-600">
              Settings
            </Link>
            <span className="mx-2">/</span>
            <span>Interface</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Interface Settings</h1>
          <p className="text-lg text-gray-600">
            Choose how you want the platform to look and feel
          </p>
        </div>

        {/* Mode Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Display Mode</CardTitle>
            <CardDescription>
              Select your preferred interface style. This setting applies to your account only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Modern Mode Option */}
            <button
              onClick={() => handleModeChange('modern')}
              disabled={isLoading}
              className={cn(
                'w-full text-left p-6 rounded-xl border-2 transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'min-h-touch',
                mode === 'modern'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    mode === 'modern' ? 'bg-primary-100' : 'bg-gray-100'
                  )}
                >
                  <Monitor
                    className={cn(
                      'h-6 w-6',
                      mode === 'modern' ? 'text-primary-600' : 'text-gray-600'
                    )}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">Modern</h3>
                    {mode === 'modern' && (
                      <span className="flex items-center gap-1 text-sm text-primary-600 font-medium">
                        <Check className="h-4 w-4" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-base text-gray-600">
                    Compact layout with more information visible at once. Best for users comfortable with technology.
                  </p>
                  <ul className="mt-2 text-sm text-gray-500 space-y-1">
                    <li>• Smaller text and tighter spacing</li>
                    <li>• More items visible on screen</li>
                    <li>• Standard navigation patterns</li>
                  </ul>
                </div>
              </div>
            </button>

            {/* Accessible Mode Option */}
            <button
              onClick={() => handleModeChange('accessible')}
              disabled={isLoading}
              className={cn(
                'w-full text-left p-6 rounded-xl border-2 transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'min-h-touch',
                mode === 'accessible'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    mode === 'accessible' ? 'bg-primary-100' : 'bg-gray-100'
                  )}
                >
                  <Accessibility
                    className={cn(
                      'h-6 w-6',
                      mode === 'accessible' ? 'text-primary-600' : 'text-gray-600'
                    )}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-gray-900">Accessible</h3>
                    <span className="text-sm text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded">
                      Recommended
                    </span>
                    {mode === 'accessible' && (
                      <span className="flex items-center gap-1 text-sm text-primary-600 font-medium">
                        <Check className="h-4 w-4" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-base text-gray-600">
                    Simplified layout with larger text and buttons. Designed for ease of use.
                  </p>
                  <ul className="mt-2 text-sm text-gray-500 space-y-1">
                    <li>• Larger, easier-to-read text</li>
                    <li>• Bigger buttons and touch targets</li>
                    <li>• Always-visible navigation</li>
                    <li>• Simpler, cleaner screens</li>
                  </ul>
                </div>
              </div>
            </button>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600 justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving preference...</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Note */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-base text-blue-800">
            <strong>Note:</strong> Your display preference is saved to your account and will apply across all your devices.
            Both modes are fully functional — choose the one that works best for you.
          </p>
        </div>

        {/* Back to Settings */}
        <div className="mt-8">
          <Link href="/settings">
            <Button variant="outline">
              ← Back to Settings
            </Button>
          </Link>
        </div>
      </div>
    </ProtectedPage>
  );
}
