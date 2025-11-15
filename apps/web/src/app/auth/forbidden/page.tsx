'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

export default function ForbiddenPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 mb-2">Elder-First</h1>
        </div>

        <Card variant="elevated">
          <CardContent className="py-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-lg text-gray-600 mb-4">
                You don't have permission to access this page.
              </p>
              {user && (
                <p className="text-base text-gray-500">
                  Logged in as: <span className="font-semibold">{user.name}</span> ({user.role})
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Link href="/dashboard">
                <Button size="lg" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>

              <div className="text-center">
                <p className="text-base text-gray-600">
                  Need access?{' '}
                  <a href="mailto:support@elderfirst.com" className="text-primary-600 hover:text-primary-700 underline">
                    Contact Administrator
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
