import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-base font-medium text-gray-700 mb-2"
          >
            {label}
          </label>
        )}
        {/* Uses CSS variables via Tailwind for UiMode responsiveness */}
        {/* See: apps/web/tailwind.config.ts, apps/web/src/styles/globals.css */}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full px-control-x py-control-y text-base border-2 border-gray-300 rounded-lg min-h-touch',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:opacity-50 disabled:bg-gray-100',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {helper && !error && (
          <p className="mt-1 text-sm text-gray-500">{helper}</p>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
