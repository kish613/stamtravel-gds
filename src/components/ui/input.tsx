import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-8 w-full rounded-md border border-white/18 bg-white/50 backdrop-blur-md px-2 py-1 text-[13px] text-[#0F172A] outline-none',
        'shadow-[inset_0_1px_2px_rgba(10,22,40,0.06),0_1px_1px_rgba(255,255,255,0.4)]',
        'placeholder:text-[#94A3B8]',
        'focus-visible:border-blue-400/50 focus-visible:bg-white/70 focus-visible:ring-2 focus-visible:ring-blue-500/25 focus-visible:shadow-[0_0_16px_-2px_rgba(59,130,246,0.2),inset_0_1px_2px_rgba(10,22,40,0.04)]',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
export { Input };
