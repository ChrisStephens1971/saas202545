'use client';

/**
 * CarbonButton
 *
 * Primary button using Carbon blue.
 * Respects UiDensity for padding/font sizes.
 */

import { radii } from './tokens';
import type { UiDensity } from '@/config/uiShellVariant';

interface CarbonButtonProps {
  children: React.ReactNode;
  density: UiDensity;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export function CarbonButton({
  children,
  density,
  variant = 'primary',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}: CarbonButtonProps) {
  // Density-responsive sizing
  const sizeClasses =
    density === 'elder'
      ? 'px-5 py-3 text-base min-h-[48px]'
      : 'px-4 py-2 text-sm min-h-[40px]';

  // Variant-specific styles
  const variantClasses = {
    primary: `
      bg-blue-600 text-white
      hover:bg-blue-700
      focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
      disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed
    `,
    secondary: `
      bg-white text-gray-900
      border border-gray-300
      hover:bg-gray-50
      focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
      disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
    `,
    ghost: `
      bg-transparent text-blue-600
      hover:bg-blue-50
      focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
      disabled:text-gray-400 disabled:cursor-not-allowed
    `,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        font-medium
        ${radii.md}
        ${sizeClasses}
        ${variantClasses[variant]}
        transition-colors
        focus:outline-none
        ${className}
      `}
    >
      {children}
    </button>
  );
}
