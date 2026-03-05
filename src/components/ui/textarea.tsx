import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-16 w-full rounded-md border border-[#C5CEE0] bg-white px-2 py-1 text-[13px] text-[#0F172A] outline-none',
        'focus-visible:border-[#0A1628] focus-visible:ring-2 focus-visible:ring-[#0A1628]/30',
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';
export { Textarea };
