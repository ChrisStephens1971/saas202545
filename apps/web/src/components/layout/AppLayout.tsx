'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show header on public pages
  const publicPages = ['/', '/login'];
  const showHeader = !publicPages.includes(pathname);

  return (
    <>
      {showHeader && <Header />}
      {children}
    </>
  );
}
