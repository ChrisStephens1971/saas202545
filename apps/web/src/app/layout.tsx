import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TRPCProvider } from '@/lib/trpc/Provider';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { AppLayout } from '@/components/layout/AppLayout';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Elder-First Church Platform',
  description: 'Church management platform designed for simplicity and accessibility',
  manifest: '/manifest.json',
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <TRPCProvider>
            <AppLayout>{children}</AppLayout>
          </TRPCProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
