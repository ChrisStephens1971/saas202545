'use client';

/**
 * CarbonCard
 *
 * Simple white card with:
 * - Neutral border
 * - Padding
 * - No shadows (flat design)
 */

import { colors, borders, radii } from './tokens';
import type { UiDensity } from '@/config/uiShellVariant';

interface CarbonCardProps {
  children: React.ReactNode;
  density: UiDensity;
  className?: string;
}

export function CarbonCard({ children, density, className = '' }: CarbonCardProps) {
  const padding = density === 'elder' ? 'p-6' : 'p-4';

  return (
    <div
      className={`
        ${colors.background.card}
        ${borders.default}
        ${radii.md}
        ${padding}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
