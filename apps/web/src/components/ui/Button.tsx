import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
      outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };

    // Sizes use CSS variables via Tailwind for UiMode responsiveness
    // See: apps/web/tailwind.config.ts, apps/web/src/styles/globals.css
    const sizes = {
      sm: 'text-sm px-control-x py-control-y min-h-touch', // Responds to [data-ui-mode]
      md: 'text-base px-control-x py-control-y min-h-touch', // Responds to [data-ui-mode]
      lg: 'text-lg px-8 py-4 min-h-[56px]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
