'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

/**
 * Format number with locale-specific thousands separators.
 */
function formatNumber(num: number | null): string {
  if (num === null) return 'Unlimited';
  return num.toLocaleString();
}

/**
 * Plan display names for UI.
 */
const PLAN_DISPLAY_NAMES: Record<string, string> = {
  core: 'Core',
  starter: 'Starter',
  standard: 'Standard',
  plus: 'Plus',
};

export default function AISettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const { data: settings, isLoading } = trpc.aiSettings.get.useQuery();
  const { data: planInfo, isLoading: planLoading } = trpc.adminTenantPlan.getForCurrentTenant.useQuery();
  const utils = trpc.useContext();

  const resetToDefaults = trpc.adminTenantPlan.resetToDefaults.useMutation({
    onSuccess: () => {
      setSuccess('AI configuration reset to plan defaults!');
      utils.adminTenantPlan.getForCurrentTenant.invalidate();
      utils.aiSettings.get.invalidate();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const updateSettings = trpc.aiSettings.update.useMutation({
    onSuccess: () => {
      setSuccess('AI settings saved successfully!');
      setError('');
      setApiKey('');
      setShowApiKeyInput(false);
      utils.aiSettings.get.invalidate();
      // Also invalidate ai.aiConfig so SermonBuilder gets the new state
      utils.ai.aiConfig.invalidate();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess('');
    },
  });

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
    }
  }, [settings]);

  const handleToggleEnabled = () => {
    if (!settings?.hasKey && !enabled) {
      // Can't enable without a key
      setError('Please add an API key before enabling AI features.');
      return;
    }
    setEnabled(!enabled);
    setError('');
    setSuccess('');
  };

  const handleSave = () => {
    setError('');
    setSuccess('');

    // If showing input and user entered a key, include it
    const keyToSave = showApiKeyInput && apiKey.trim() ? apiKey.trim() : undefined;

    // Validate API key format if provided
    if (keyToSave && !keyToSave.startsWith('sk-')) {
      setError('Invalid API key format. OpenAI keys start with "sk-"');
      return;
    }

    updateSettings.mutate({
      enabled,
      apiKey: keyToSave,
    });
  };

  const handleClearKey = () => {
    if (!confirm('Are you sure you want to remove the API key? AI features will be disabled.')) {
      return;
    }
    setError('');
    setSuccess('');
    updateSettings.mutate({
      enabled: false,
      apiKey: null,
    });
  };

  if (isLoading) {
    return (
      <ProtectedPage requiredRoles={['admin']}>
        <div className="container mx-auto px-4 py-8">
          <p className="text-lg text-gray-600">Loading settings...</p>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage requiredRoles={['admin']}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">AI Settings</h1>
              <p className="text-lg text-gray-600">
                Configure OpenAI integration for AI-powered features
              </p>
            </div>
            <Link href="/settings">
              <Button variant="secondary">Back to Settings</Button>
            </Link>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Subscription Plan Card */}
        {!planLoading && planInfo && (
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subscription Plan</CardTitle>
                  <CardDescription>
                    Your plan determines AI feature availability and token limits
                  </CardDescription>
                </div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  planInfo.plan === 'plus' ? 'bg-purple-100 text-purple-800' :
                  planInfo.plan === 'standard' ? 'bg-blue-100 text-blue-800' :
                  planInfo.plan === 'starter' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {PLAN_DISPLAY_NAMES[planInfo.plan] || planInfo.plan}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Plan Defaults */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Plan AI Enabled</p>
                    <p className="font-semibold">
                      {planInfo.planDefaults.aiEnabled ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Plan Monthly Token Limit</p>
                    <p className="font-semibold">
                      {formatNumber(planInfo.planDefaults.aiLimitTokens)}
                    </p>
                  </div>
                </div>

                {/* Override Warning */}
                {planInfo.isOverridden && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> Your current AI configuration differs from your plan defaults.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-amber-700">
                      <div>
                        Current: AI {planInfo.currentConfig.aiEnabled ? 'Enabled' : 'Disabled'}, {formatNumber(planInfo.currentConfig.aiMonthlyTokenLimit)} tokens/mo
                      </div>
                      <div>
                        Plan Default: AI {planInfo.planDefaults.aiEnabled ? 'Enabled' : 'Disabled'}, {formatNumber(planInfo.planDefaults.aiLimitTokens)} tokens/mo
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => resetToDefaults.mutate()}
                      disabled={resetToDefaults.isLoading}
                    >
                      {resetToDefaults.isLoading ? 'Resetting...' : 'Reset to Plan Defaults'}
                    </Button>
                  </div>
                )}

                {/* Plan Upgrade Info */}
                {planInfo.plan !== 'plus' && (
                  <p className="text-sm text-gray-500">
                    Need more tokens? Upgrade your plan for higher limits.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Key Configuration */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>OpenAI API Key</CardTitle>
            <CardDescription>
              Your API key is stored encrypted and never exposed to the browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">
                  {settings?.hasKey ? 'API Key Configured' : 'No API Key'}
                </p>
                {settings?.hasKey && settings.keyLast4 && (
                  <p className="text-sm text-gray-500">
                    Key ending in: ****{settings.keyLast4}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {settings?.hasKey ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    >
                      {showApiKeyInput ? 'Cancel' : 'Update Key'}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleClearKey}
                      disabled={updateSettings.isLoading}
                    >
                      Remove Key
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  >
                    {showApiKeyInput ? 'Cancel' : 'Add Key'}
                  </Button>
                )}
              </div>
            </div>

            {/* API Key Input */}
            {showApiKeyInput && (
              <div className="p-4 border border-gray-200 rounded-lg space-y-4">
                <Input
                  label="OpenAI API Key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  helper="Get your API key from platform.openai.com"
                />
                <p className="text-sm text-gray-500">
                  Your key will be encrypted before storage. It is never sent to the browser.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enable/Disable AI */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>AI Features</CardTitle>
            <CardDescription>
              Enable or disable AI-powered features across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">AI Features</p>
                <p className="text-sm text-gray-500">
                  {enabled
                    ? 'Enabled - AI features are active'
                    : 'Disabled - AI buttons will be hidden'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleEnabled}
                disabled={!settings?.hasKey && !enabled}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  enabled ? 'bg-primary-600' : 'bg-gray-200'
                } ${!settings?.hasKey && !enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {!settings?.hasKey && (
              <p className="mt-2 text-sm text-amber-600">
                Add an API key above before enabling AI features.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Environment Info */}
        <Card variant="outlined" className="mb-6">
          <CardHeader>
            <CardTitle>Environment Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Local Development:</strong> AI allowed when key is configured
              </p>
              <p>
                <strong>Staging:</strong> AI allowed when key is configured
              </p>
              <p>
                <strong>Production:</strong> AI is always disabled (safety policy)
              </p>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                AI features use the OpenAI API (gpt-4o-mini model). Typical costs are
                ~$0.01-0.05 per AI request.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Usage Link */}
        <Card variant="outlined" className="mb-6">
          <CardHeader>
            <CardTitle>Usage & Costs</CardTitle>
            <CardDescription>
              View AI feature usage statistics and estimated costs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/ai/usage">
              <Button variant="secondary">View AI Usage</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Link href="/settings">
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={updateSettings.isLoading}
          >
            {updateSettings.isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </ProtectedPage>
  );
}
