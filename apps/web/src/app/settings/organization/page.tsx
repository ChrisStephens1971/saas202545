'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import Link from 'next/link';

export default function OrganizationSettingsPage() {
  const [formData, setFormData] = useState({
    legalName: '',
    churchName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    email: '',
    website: '',
    ein: '',
    logoUrl: '',
    taxStatementFooter: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: branding, isLoading } = trpc.org.getBranding.useQuery();
  const utils = trpc.useContext();

  const updateBranding = trpc.org.updateBranding.useMutation({
    onSuccess: () => {
      setSuccess('Organization settings saved successfully!');
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
        legalName: branding.legalName || '',
        churchName: branding.churchName || '',
        addressLine1: branding.addressLine1 || '',
        addressLine2: branding.addressLine2 || '',
        city: branding.city || '',
        state: branding.state || '',
        postalCode: branding.postalCode || '',
        country: branding.country || 'US',
        phone: branding.phone || '',
        email: branding.email || '',
        website: branding.website || '',
        ein: branding.ein || '',
        logoUrl: branding.logoUrl || '',
        taxStatementFooter: branding.taxStatementFooter || '',
      });
    }
  }, [branding]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear messages when user edits
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic validation
    if (!formData.legalName.trim()) {
      setError('Legal name is required');
      return;
    }

    // Email validation if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // URL validation for logo if provided
    if (formData.logoUrl && !isValidUrl(formData.logoUrl)) {
      setError('Please enter a valid URL for the logo');
      return;
    }

    // URL validation for website if provided
    if (formData.website && !isValidUrl(formData.website)) {
      setError('Please enter a valid URL for the website');
      return;
    }

    updateBranding.mutate({
      legalName: formData.legalName.trim(),
      churchName: formData.churchName.trim() || null,
      addressLine1: formData.addressLine1.trim() || null,
      addressLine2: formData.addressLine2.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      postalCode: formData.postalCode.trim() || null,
      country: formData.country.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      website: formData.website.trim() || null,
      ein: formData.ein.trim() || null,
      logoUrl: formData.logoUrl.trim() || null,
      taxStatementFooter: formData.taxStatementFooter.trim() || null,
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
              <h1 className="text-3xl font-bold mb-2">Organization Settings</h1>
              <p className="text-lg text-gray-600">
                Configure your church&apos;s branding for tax statements and official documents
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
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

          {/* Organization Identity */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>Organization Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Legal Name *"
                value={formData.legalName}
                onChange={(e) => handleChange('legalName', e.target.value)}
                placeholder="e.g., First Baptist Church of Springfield"
                helper="Official legal name for IRS tax documents"
              />
              <Input
                label="Display Name"
                value={formData.churchName}
                onChange={(e) => handleChange('churchName', e.target.value)}
                placeholder="e.g., First Baptist Springfield"
                helper="Friendly name for bulletins and communications (optional)"
              />
              <Input
                label="EIN (Tax ID)"
                value={formData.ein}
                onChange={(e) => handleChange('ein', e.target.value)}
                placeholder="e.g., 12-3456789"
                helper="Employer Identification Number for tax statements"
              />
              <Input
                label="Logo URL"
                type="url"
                value={formData.logoUrl}
                onChange={(e) => handleChange('logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
                helper="URL to your church logo (displayed on tax statements)"
              />
            </CardContent>
          </Card>

          {/* Address */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Street Address"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                placeholder="123 Main Street"
              />
              <Input
                label="Address Line 2"
                value={formData.addressLine2}
                onChange={(e) => handleChange('addressLine2', e.target.value)}
                placeholder="Suite 100"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Springfield"
                />
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="IL"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="ZIP / Postal Code"
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  placeholder="62701"
                />
                <Input
                  label="Country"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="US"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="office@firstbaptist.org"
              />
              <Input
                label="Website"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://www.firstbaptist.org"
              />
            </CardContent>
          </Card>

          {/* Tax Statement Settings */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>Tax Statement Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Custom Footer Text
                </label>
                <textarea
                  className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={formData.taxStatementFooter}
                  onChange={(e) => handleChange('taxStatementFooter', e.target.value)}
                  placeholder="Optional custom message to include on tax statements..."
                  rows={3}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Additional note or message to display on tax statements (e.g., thank you message, contact info)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card variant="outlined" className="mb-6">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                {formData.logoUrl && (
                  <div className="mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- User-entered logo URL preview; external domain unknown, dimensions unknown */}
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="h-12 mx-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <p className="text-xl font-bold">{formData.legalName || 'Organization Name'}</p>
                {(formData.addressLine1 || formData.city) && (
                  <div className="text-sm text-gray-600 mt-1">
                    {formData.addressLine1 && <p>{formData.addressLine1}</p>}
                    {formData.addressLine2 && <p>{formData.addressLine2}</p>}
                    {(formData.city || formData.state || formData.postalCode) && (
                      <p>
                        {[formData.city, formData.state].filter(Boolean).join(', ')}{' '}
                        {formData.postalCode}
                      </p>
                    )}
                  </div>
                )}
                {(formData.phone || formData.email) && (
                  <p className="text-sm text-gray-600 mt-1">
                    {[formData.phone, formData.email].filter(Boolean).join(' | ')}
                  </p>
                )}
                {formData.ein && (
                  <p className="text-sm text-gray-600 mt-1">EIN: {formData.ein}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link href="/dashboard">
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
              {updateBranding.isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedPage>
  );
}
