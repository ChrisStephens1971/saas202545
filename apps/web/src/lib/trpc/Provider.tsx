'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, useEffect, useRef } from 'react';
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

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          headers() {
            return {
              authorization: authToken ? `Bearer ${authToken}` : '',
              'x-tenant-id': session?.user?.tenantId || '',
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
