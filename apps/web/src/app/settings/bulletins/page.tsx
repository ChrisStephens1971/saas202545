'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

export default function BulletinSettingsPage() {
  const [formData, setFormData] = useState({
    // Canvas settings (for bulletins using Canvas layout engine)
    bulletinAiEnabled: false,
    bulletinDefaultCanvasGridSize: 16,
    bulletinDefaultCanvasShowGrid: true,
    bulletinDefaultPages: 4,
    givingUrl: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: branding, isLoading } = trpc.org.getBranding.useQuery();
  const utils = trpc.useContext();

  const updateBranding = trpc.org.updateBranding.useMutation({
    onSuccess: () => {
      setSuccess('Bulletin settings saved successfully!');
      setError('');
      utils.org.getBranding.invalidate();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess('');
    },
  });

  // Populate form when branding data loads
  useEffect(() => {
    if (branding) {
      setFormData({
        // Canvas settings (for bulletins using Canvas layout engine)
        bulletinAiEnabled: branding.bulletinAiEnabled ?? false,
        bulletinDefaultCanvasGridSize: branding.bulletinDefaultCanvasGridSize ?? 16,
        bulletinDefaultCanvasShowGrid: branding.bulletinDefaultCanvasShowGrid ?? true,
        bulletinDefaultPages: branding.bulletinDefaultPages ?? 4,
        givingUrl: branding.givingUrl || '',
      });
    }
  }, [branding]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear messages when user edits
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate giving URL if provided
    if (formData.givingUrl && !isValidUrl(formData.givingUrl)) {
      setError('Please enter a valid URL for the giving link');
      return;
    }

    // Include existing branding data
    updateBranding.mutate({
      legalName: branding!.legalName,
      churchName: branding!.churchName || null,
      addressLine1: branding!.addressLine1 || null,
      addressLine2: branding!.addressLine2 || null,
      city: branding!.city || null,
      state: branding!.state || null,
      postalCode: branding!.postalCode || null,
      country: branding!.country || null,
      phone: branding!.phone || null,
      email: branding!.email || null,
      website: branding!.website || null,
      ein: branding!.ein || null,
      logoUrl: branding!.logoUrl || null,
      taxStatementFooter: branding!.taxStatementFooter || null,
      // Bulletin settings - Canvas defaults (Generator is the default engine for new bulletins)
      bulletinDefaultLayoutMode: 'canvas',
      bulletinAiEnabled: formData.bulletinAiEnabled,
      bulletinDefaultCanvasGridSize: formData.bulletinDefaultCanvasGridSize,
      bulletinDefaultCanvasShowGrid: formData.bulletinDefaultCanvasShowGrid,
      bulletinDefaultPages: formData.bulletinDefaultPages,
      givingUrl: formData.givingUrl.trim() || null,
    });
  };

  /**
   * Validates a URL, allowing bare hostnames that will be normalized by the server.
   * Server-side WebsiteSchema auto-normalizes hostnames like "mychurch.org" to "https://mychurch.org".
   */
  const isValidUrl = (url: string): boolean => {
    const trimmed = url.trim();
    if (!trimmed) return true; // Empty is fine

    // Try as-is first
    try {
      new URL(trimmed);
      return true;
    } catch {
      // Try with https:// prefix (server will normalize this)
      try {
        new URL(`https://${trimmed}`);
        return true;
      } catch {
        return false;
      }
    }
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
              <h1 className="text-3xl font-bold mb-2">Bulletin Settings</h1>
              <p className="text-lg text-gray-600">
                Configure default options for the Bulletin Generator and Canvas editor.
              </p>
            </div>
            <Link href="/settings">
              <Button variant="secondary">Back to Settings</Button>
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
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

          {/* Bulletin Workflow Info */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>Bulletin Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>New bulletins are created with the Bulletin Generator.</strong> The generator uses your service plan, announcements, and branding to produce a consistent 4-page, print-ready bulletin in minutes.
                  </p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>The Canvas editor</strong> is still available as an advanced layout tool for special services (Christmas, Easter, events) where you need full visual control. Canvas bulletins do not auto-sync with the service plan and should be used sparingly.
                  </p>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Weekly bulletins</strong> → use the Generator</li>
                    <li><strong>Special layouts</strong> → optionally switch a specific bulletin to Canvas</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Canvas Settings */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>Canvas Settings</CardTitle>
              <CardDescription>
                Default settings for the advanced Canvas editor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Canvas info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎨</span>
                  <div className="flex-1">
                    <div className="font-medium text-base text-blue-900">Canvas Layout System</div>
                    <p className="text-sm text-blue-700 mt-1">
                      Canvas is an advanced drag-and-drop layout system used only for bulletins whose layout engine is set to Canvas. It provides maximum flexibility for special services and custom designs, but it does not automatically update when your service plan or announcements change.
                    </p>
                    <p className="text-sm text-blue-700 mt-2">
                      Legacy template bulletins can still be converted to Canvas when needed for one-off designs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Default Page Count (1-4)
                  </label>
                  <select
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.bulletinDefaultPages}
                    onChange={(e) => handleChange('bulletinDefaultPages', parseInt(e.target.value))}
                  >
                    <option value={1}>1 Page</option>
                    <option value={2}>2 Pages</option>
                    <option value={3}>3 Pages</option>
                    <option value={4}>4 Pages</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Initial page count for new Canvas bulletins.
                  </p>
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Default Grid Size (pixels)
                  </label>
                  <select
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={formData.bulletinDefaultCanvasGridSize}
                    onChange={(e) => handleChange('bulletinDefaultCanvasGridSize', parseInt(e.target.value))}
                  >
                    <option value={8}>8px (fine)</option>
                    <option value={16}>16px (standard)</option>
                    <option value={24}>24px (coarse)</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Grid snap size in the Canvas editor.
                  </p>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.bulletinDefaultCanvasShowGrid}
                    onChange={(e) => handleChange('bulletinDefaultCanvasShowGrid', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-base">Show Grid by Default</div>
                    <p className="text-sm text-gray-600 mt-1">
                      Display grid lines in the Canvas editor when opening Canvas bulletins.
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>
                Enable AI-powered content generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.bulletinAiEnabled}
                    onChange={(e) => handleChange('bulletinAiEnabled', e.target.checked)}
                    className="mt-1 w-5 h-5"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-base">Enable AI Assist for Bulletins</div>
                    <p className="text-sm text-gray-600 mt-1">
                      When enabled, editors can use AI to suggest text for bulletin content (welcome messages, sermon summaries, reflections, etc.) in both the Generator and Canvas editor, where available. Requires an OpenAI API key to be configured.
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <strong>Note:</strong> AI features will only work if an OpenAI API key is configured in your environment.
              </div>
            </CardContent>
          </Card>

          {/* QR / Links Defaults */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>QR Code & Links</CardTitle>
              <CardDescription>
                Default URLs for QR code presets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Giving URL"
                type="url"
                value={formData.givingUrl}
                onChange={(e) => handleChange('givingUrl', e.target.value)}
                placeholder="https://giving.example.com"
                helper="URL for online giving. Used in QR code presets and the bulletin footer."
              />

              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                <p className="mb-2">
                  <strong>QR Code Presets Available:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Church Website (from Organization Settings)</li>
                  <li>Give Online (configured above)</li>
                  <li>This Bulletin (Online View) - auto-generated</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/settings">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={updateBranding.isLoading}
            >
              {updateBranding.isLoading ? 'Saving...' : 'Save Bulletin Settings'}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedPage>
  );
}
