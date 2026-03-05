import * as React from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = {
  confirmed: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  warning: 'border-amber-200 text-amber-700 bg-amber-50',
  danger: 'border-red-200 text-red-700 bg-red-50',
  neutral: 'border-slate-200 text-slate-600 bg-slate-100'
};

const Badge = ({
  variant = 'neutral',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof badgeVariants }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
      badgeVariants[variant],
      className
    )}
    {...props}
  >
    {children}
  </span>
);

Badge.displayName = 'Badge';
export { Badge };
