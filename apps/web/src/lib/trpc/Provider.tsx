'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import superjson from 'superjson';
import { trpc } from './client';

function getBaseUrl() {
  // Both browser and SSR should use the API server URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8045';
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const tokenFetchedRef = useRef(false);

  // Use refs for values that need to be accessed in the headers() function
  // This ensures we always get the current values, not stale closure values
  const authTokenRef = useRef<string | null>(null);
  const tenantIdRef = useRef<string | undefined>(undefined);

  // Keep refs in sync with state
  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  useEffect(() => {
    tenantIdRef.current = session?.user?.tenantId;
  }, [session?.user?.tenantId]);

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Fetch JWT token from Next.js API when session becomes available
  useEffect(() => {
    if (status === 'authenticated' && session && !tokenFetchedRef.current) {
      tokenFetchedRef.current = true;

      fetch('/api/auth/token')
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setAuthToken(data.token);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch auth token:', error);
          tokenFetchedRef.current = false; // Allow retry
        });
    } else if (status === 'unauthenticated') {
      setAuthToken(null);
      tokenFetchedRef.current = false;
    }
  }, [session, status]);

  // Create tRPC client - use useMemo instead of useState so it doesn't recreate on every render
  // but the headers() function reads from refs which always have current values
  const trpcClient = useMemo(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          headers() {
            // Read from refs to get current values (not stale closure values)
            return {
              authorization: authTokenRef.current ? `Bearer ${authTokenRef.current}` : '',
              'x-tenant-id': tenantIdRef.current || '',
            };
          },
        }),
      ],
    }),
    [] // Empty deps - client is created once, but headers() reads from refs
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
