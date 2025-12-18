'use client';

/**
 * PageContainer - Centered Content Column
 *
 * Provides consistent page layout with:
 * - Centered column (max-width ~1000px)
 * - Light background
 * - Generous padding
 * - Responsive spacing
 */

import { cn } from '@/lib/utils';

interface PageContainerProps {
  /** Page content */
  children: React.ReactNode;
  /** Additional className for container */
  className?: string;
  /** Maximum width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-2xl', // 672px
  md: 'max-w-3xl', // 768px
  lg: 'max-w-4xl', // 896px
  xl: 'max-w-5xl', // 1024px
  full: 'max-w-full',
};

export function PageContainer({
  children,
  className,
  maxWidth = 'lg',
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-6 sm:px-6 lg:px-8',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
