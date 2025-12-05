'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

const isDev = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleAzureLogin = async () => {
    setLoading(true);
    try {
      await signIn('azure-ad-b2c', {
        callbackUrl: '/dashboard',
      });
    } catch (err) {
      setError('An error occurred during sign in');
      setLoading(false);
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
            {isDev ? (
              <>
                {/* Development Mode Login */}
                <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 mb-2">
                    Development Mode Active
                  </p>
                  <p className="text-sm text-yellow-700 mb-2">Test accounts:</p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• admin@dev.com / admin</li>
                    <li>• editor@dev.com / editor</li>
                    <li>• submitter@dev.com / submitter</li>
                    <li>• viewer@dev.com / viewer</li>
                    <li>• kiosk@dev.com / kiosk</li>
                  </ul>
                </div>

                <form onSubmit={handleDevLogin} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <p className="text-base text-red-800">{error}</p>
                    </div>
                  )}

                  <Input
                    type="email"
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                  />

                  <Input
                    type="password"
                    label="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </>
            ) : (
              <>
                {/* Production Mode - Azure AD B2C */}
                {error && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg mb-6">
                    <p className="text-base text-red-800">{error}</p>
                  </div>
                )}

                <p className="text-lg text-gray-700 text-center mb-6">
                  Sign in with your church account
                </p>

                <Button
                  onClick={handleAzureLogin}
                  size="lg"
                  className="w-full mb-6"
                  disabled={loading}
                >
                  {loading ? 'Redirecting...' : 'Sign In with Microsoft'}
                </Button>

                <div className="text-center">
                  <a
                    href="/auth/reset-password"
                    className="text-base text-primary-600 hover:text-primary-700 underline"
                  >
                    Forgot your password?
                  </a>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-base text-gray-600 mt-6">
          Need help? Contact your church administrator.
        </p>
      </div>
    </div>
  );
}
