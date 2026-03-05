import * as React from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = {
  confirmed: 'border-status-good/40 text-status-good bg-status-good/10 shadow-[0_0_12px_-2px_rgba(34,197,94,0.4)]',
  warning: 'border-status-warn/40 text-status-warn bg-status-warn/10 shadow-[0_0_12px_-2px_rgba(245,158,11,0.4)]',
  danger: 'border-status-danger/40 text-status-danger bg-status-danger/10 shadow-[0_0_12px_-2px_rgba(239,68,68,0.4)]',
  neutral: 'border-white/18 text-[#475569] bg-white/60 backdrop-blur-md shadow-[0_2px_8px_-1px_rgba(10,22,40,0.05),inset_0_1px_1px_rgba(255,255,255,0.4)]'
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
