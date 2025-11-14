import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TRPCProvider } from '@/lib/trpc/Provider';
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
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
