import * as React from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = {
  confirmed: 'border-status-good/40 text-status-good bg-status-good/10',
  warning: 'border-status-warn/40 text-status-warn bg-status-warn/10',
  danger: 'border-status-danger/40 text-status-danger bg-status-danger/10',
  neutral: 'border-[#CBD5E1] text-[#475569] bg-white'
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
