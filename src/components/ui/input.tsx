import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-8 w-full rounded-md border border-[#C5CEE0] bg-white px-2 py-1 text-[13px] text-[#0F172A] outline-none ring-offset-white',
        'focus-visible:border-[#0A1628] focus-visible:ring-2 focus-visible:ring-[#0A1628]/30',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
export { Input };
