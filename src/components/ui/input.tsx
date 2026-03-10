import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-[13px] text-foreground outline-none',
        'placeholder:text-muted-foreground',
        'focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
export { Input };
