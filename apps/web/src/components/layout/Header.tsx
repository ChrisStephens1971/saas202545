'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function Header() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('tenant-id');
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

          {/* Navigation */}
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
            <Link
              href="/donations"
              className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
            >
              Donations
            </Link>
            <Link
              href="/communications"
              className="text-lg font-medium text-gray-700 hover:text-primary-600 transition-colors"
            >
              Communications
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-base font-semibold">Admin User</p>
              <p className="text-sm text-gray-600">Administrator</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
