'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useAuth, useRole } from '@/hooks/useAuth';

export function Header() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isAdmin, isEditor, isKiosk } = useRole();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  return (
    <header className="bg-white border-b-2 border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="text-3xl font-bold text-primary-600">Elder-First</div>
          </Link>

          {/* Navigation - Only show if authenticated and not kiosk */}
          {isAuthenticated && !isKiosk() && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/bulletins"
                className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                Bulletins
              </Link>
              <Link
                href="/people"
                className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                People
              </Link>
              <Link
                href="/events"
                className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                Events
              </Link>
              <Link
                href="/prayers"
                className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                Prayers
              </Link>
              {/* Only show Donations for Admin/Editor */}
              {(isAdmin() || isEditor()) && (
                <Link
                  href="/donations"
                  className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Donations
                </Link>
              )}
              {/* Only show Communications for Admin/Editor */}
              {(isAdmin() || isEditor()) && (
                <Link
                  href="/communications"
                  className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Communications
                </Link>
              )}
            </nav>
          )}

          {/* Kiosk Navigation - Attendance only */}
          {isAuthenticated && isKiosk() && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/attendance"
                className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
              >
                Attendance Check-In
              </Link>
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {isAuthenticated && user && (
              <div className="text-right hidden md:block">
                <p className="text-base font-semibold">{user.name || 'User'}</p>
                <p className="text-sm text-gray-600 capitalize">{user.role || 'Member'}</p>
              </div>
            )}

            {isLoading ? (
              <div className="w-24 h-10 bg-gray-200 animate-pulse rounded" />
            ) : isAuthenticated ? (
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            ) : (
              <Button onClick={handleSignIn}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
