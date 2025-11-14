'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // TODO: Replace with actual authentication
      // For now, simulate login with dev-only JWT
      if (formData.email && formData.password) {
        // Create a valid dev token with required payload structure
        const tenantId = '753161b3-e698-46a6-965f-b2ef814c6874'; // Grace Community Church from seed data
        const devTokenPayload = {
          userId: 'dev-user-id',
          role: 'admin',
          tenantId: tenantId,
          personId: null,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60), // 12 hours
        };

        // Base64 encode the payload (matches API's dev JWT format)
        const devToken = btoa(JSON.stringify(devTokenPayload));

        localStorage.setItem('auth-token', devToken);
        localStorage.setItem('tenant-id', tenantId);
        router.push('/dashboard');
      } else {
        setError('Email and password are required');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Elder-First</h1>
          <p className="text-xl text-gray-600">Church Platform</p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-base text-red-600">{error}</p>
                </div>
              )}

              <Input
                type="email"
                label="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                autoComplete="email"
              />

              <Input
                type="password"
                label="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                autoComplete="current-password"
              />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Development Mode:</strong> Authentication is simplified.
                In production, this will use Azure AD B2C with secure authentication.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-base text-gray-600 mt-6">
          Need help? Contact your church administrator.
        </p>
      </div>
    </div>
  );
}
