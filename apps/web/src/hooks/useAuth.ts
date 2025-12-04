import { useSession } from 'next-auth/react';

export type UserRole = 'admin' | 'editor' | 'submitter' | 'viewer' | 'kiosk';

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    userId: session?.user?.id,
    userRole: session?.user?.role,
    tenantId: session?.user?.tenantId,
  };
}

export function useRole() {
  const { userRole, isLoading } = useAuth();

  const hasRole = (role: UserRole | UserRole[]) => {
    if (!userRole) return false;
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  };

  const isAdmin = () => hasRole('admin');
  const isEditor = () => hasRole(['admin', 'editor']);
  const isSubmitter = () => hasRole(['admin', 'editor', 'submitter']);
  const isViewer = () => hasRole(['admin', 'editor', 'submitter', 'viewer']);
  const isKiosk = () => hasRole('kiosk');

  return {
    role: userRole,
    isLoading,
    hasRole,
    isAdmin,
    isEditor,
    isSubmitter,
    isViewer,
    isKiosk,
  };
}
