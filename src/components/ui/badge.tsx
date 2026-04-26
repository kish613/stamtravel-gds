import * as React from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = {
  confirmed: 'border-[#BDE7D0] text-[#0E7C56] bg-[#E7F7EF]',
  warning: 'border-[#F2D89A] text-[#A66610] bg-[#FDF5E6]',
  danger: 'border-[#F2BBC0] text-[#A8202E] bg-[#FCECEE]',
  info: 'border-[#B6D4EB] text-[#175787] bg-[#E6F0F9]',
  brand: 'border-[#B7E6EB] text-[#0A2540] bg-[#E4F5F7]',
  neutral: 'border-[#E2E8F0] text-[#475569] bg-[#F1F5F9]'
};

const dotColors: Record<keyof typeof badgeVariants, string> = {
  confirmed: '#0E9F6E',
  warning: '#D9892B',
  danger: '#D93141',
  info: '#2275B8',
  brand: '#25A5B4',
  neutral: '#94A3B8'
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
  dot?: boolean;
}

const Badge = ({ variant = 'neutral', dot = false, className, children, ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap',
      badgeVariants[variant],
      className
    )}
    {...props}
  >
    {dot && (
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: dotColors[variant] }}
      />
    )}
    {children}
  </span>
);

Badge.displayName = 'Badge';
export { Badge };
