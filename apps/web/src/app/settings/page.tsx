'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { useAiStatus } from '@/hooks/useAiStatus';
import Link from 'next/link';

/**
 * AI Status Badge component for the Settings page.
 * Shows a colored pill indicating AI status (ON/OFF/Loading/Error).
 */
function AiStatusBadge() {
  const status = useAiStatus({ includeAdminDetails: true });

  if (status.kind === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <span className="animate-pulse">AI: Checking...</span>
        </span>
      </div>
    );
  }

  if (status.kind === 'error') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          AI: Error
        </span>
        <span className="text-xs text-gray-500">Unable to determine status</span>
      </div>
    );
  }

  if (status.kind === 'on') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          AI: ON
        </span>
        <span className="text-xs text-gray-500">Features available</span>
      </div>
    );
  }

  // kind === 'off'
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        AI: OFF
      </span>
      {status.reason && (
        <span className="text-xs text-gray-500">{status.reason}</span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedPage requiredRoles={['admin']}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-lg text-gray-600">
            Manage your organization and platform configuration
          </p>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Organization Settings */}
          <Link href="/settings/organization">
            <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="text-3xl mb-2">🏛️</div>
                <CardTitle>Organization</CardTitle>
                <CardDescription>
                  Church name, address, contact info, and tax branding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Configure your organization&apos;s legal name, EIN, address, and branding for tax statements and official documents.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Bulletin Settings */}
          <Link href="/settings/bulletins">
            <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="text-3xl mb-2">📰</div>
                <CardTitle>Bulletins</CardTitle>
                <CardDescription>
                  Default layout, AI assist, and canvas editor settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Configure default options for bulletin creation, AI-powered content generation, and canvas editor behavior.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* AI Settings */}
          <Link href="/settings/ai">
            <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="text-3xl mb-2">🤖</div>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>AI Configuration</CardTitle>
                </div>
                <CardDescription>
                  OpenAI API key and AI feature settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <AiStatusBadge />
                </div>
                <p className="text-sm text-gray-500">
                  Configure your OpenAI API key and enable AI-powered features like sermon outlines and bulletin content generation.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Theology Settings */}
          <Link href="/settings/theology">
            <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="text-3xl mb-2">📖</div>
                <CardTitle>Theology Profile</CardTitle>
                <CardDescription>
                  Theological tradition and AI guardrails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Configure your church&apos;s theological tradition, Bible translation, restricted topics, and sensitivity settings for AI-powered sermon assistance.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Interface Settings */}
          <Link href="/settings/interface">
            <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="text-3xl mb-2">🖥️</div>
                <CardTitle>Interface</CardTitle>
                <CardDescription>
                  Display mode and accessibility preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Choose between modern (compact) or accessible (elder-friendly) interface mode. Your preference is saved to your account.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Placeholder for future settings sections */}
          <Card variant="outlined" className="h-full opacity-60">
            <CardHeader>
              <div className="text-3xl mb-2">👥</div>
              <CardTitle>Users &amp; Roles</CardTitle>
              <CardDescription>
                Manage team members and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Coming soon - Invite users, assign roles, and manage access permissions.
              </p>
            </CardContent>
          </Card>

          <Card variant="outlined" className="h-full opacity-60">
            <CardHeader>
              <div className="text-3xl mb-2">🔔</div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Email and notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Coming soon - Configure email templates and notification settings.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Note */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Settings changes affect your entire organization.
            Only administrators can access this area.
          </p>
        </div>
      </div>
    </ProtectedPage>
  );
}
