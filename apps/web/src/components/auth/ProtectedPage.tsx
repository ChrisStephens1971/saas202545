'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRole, UserRole } from '@/hooks/useAuth';

interface ProtectedPageProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRoles?: UserRole[];
  fallbackUrl?: string;
}

export function ProtectedPage({
  children,
  requireAuth = true,
  requiredRoles,
  fallbackUrl = '/login',
}: ProtectedPageProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasRole } = useRole();

  useEffect(() => {
    // Redirect unauthenticated users
    if (!authLoading && requireAuth && !isAuthenticated) {
      router.push(fallbackUrl);
      return;
    }

    // Check role requirements
    if (
      !authLoading &&
      isAuthenticated &&
      requiredRoles &&
      requiredRoles.length > 0 &&
      !hasRole(requiredRoles)
    ) {
      router.push('/auth/forbidden');
    }
  }, [isAuthenticated, authLoading, requireAuth, requiredRoles, hasRole, router, fallbackUrl]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  // Don't render if not authenticated and auth is required
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Don't render if role requirements not met
  if (requiredRoles && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return null;
  }

  return <>{children}</>;
}
