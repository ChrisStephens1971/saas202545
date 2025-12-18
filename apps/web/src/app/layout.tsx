import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { TRPCProvider } from '@/lib/trpc/Provider';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { UiModeProvider } from '@/components/providers/UiModeProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
};

export const metadata: Metadata = {
  title: 'Elder-First Church Platform',
  description: 'Church management platform designed for simplicity and accessibility',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Note: data-ui-mode is set client-side by UiModeProvider via useEffect
  // to avoid hydration mismatch. Default is 'accessible' per elder-first design.
  return (
    <html lang="en" data-ui-mode="accessible">
      <body className={inter.className}>
        <SessionProvider>
          <TRPCProvider>
            <UiModeProvider>
              <AppLayout>{children}</AppLayout>
            </UiModeProvider>
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
