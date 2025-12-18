'use client';

/**
 * CarbonPageHeader
 *
 * Page header with:
 * - Title (large, prominent)
 * - Subtitle (optional, smaller)
 * - Actions area (optional, for buttons)
 *
 * Spacious layout following Carbon design principles.
 */

import { getTypography } from './tokens';
import type { UiDensity } from '@/config/uiShellVariant';

interface CarbonPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  density: UiDensity;
}

export function CarbonPageHeader({
  title,
  subtitle,
  actions,
  density,
}: CarbonPageHeaderProps) {
  const titleStyle = getTypography('pageTitle', density);
  const subtitleStyle = getTypography('subtitle', density);
  const bottomMargin = density === 'elder' ? 'mb-8' : 'mb-6';

  return (
    <div className={`${bottomMargin}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Title and subtitle */}
        <div className="flex-1 min-w-0">
          <h1 className={titleStyle}>{title}</h1>
          {subtitle && <p className={`mt-1 ${subtitleStyle}`}>{subtitle}</p>}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
