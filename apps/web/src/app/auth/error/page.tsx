'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return {
          title: 'Configuration Error',
          message: 'There is a problem with the server configuration. Please contact your administrator.',
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          message: 'You do not have permission to sign in. Please contact your administrator.',
        };
      case 'Verification':
        return {
          title: 'Email Not Verified',
          message: 'Please verify your email address before signing in.',
        };
      case 'AADB2C90118':
        return {
          title: 'Password Reset Required',
          message: 'You need to reset your password. Click the button below to reset it.',
        };
      case 'AADB2C90091':
        return {
          title: 'Sign In Cancelled',
          message: 'You cancelled the sign in process. You can try again.',
        };
      default:
        return {
          title: 'Authentication Error',
          message: 'An error occurred during authentication. Please try again.',
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">Elder-First</h1>
        </div>

        <Card variant="elevated">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{errorInfo.title}</h2>
              <p className="text-lg text-gray-600">{errorInfo.message}</p>
            </div>

            <div className="space-y-4">
              {error === 'AADB2C90118' ? (
                <Link href="/auth/reset-password">
                  <Button size="lg" className="w-full">
                    Reset Password
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button size="lg" className="w-full">
                    Try Again
                  </Button>
                </Link>
              )}

              <div className="text-center">
                <p className="text-base text-gray-600">
                  Need help?{' '}
                  <a href="mailto:support@elderfirst.com" className="text-primary-600 hover:text-primary-700 underline">
                    Contact Support
                  </a>
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-6 pt-6 border-t-2 border-gray-200">
                <p className="text-sm text-gray-500 text-center">Error Code: {error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
