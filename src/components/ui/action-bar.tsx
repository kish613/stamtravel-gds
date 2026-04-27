import * as React from 'react';
import { cn } from '@/lib/utils';

interface ActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  sticky?: boolean;
  position?: 'top' | 'bottom';
  meta?: React.ReactNode;
  primary?: React.ReactNode;
  secondary?: React.ReactNode;
}

export const ActionBar = ({
  sticky = true,
  position = 'bottom',
  meta,
  primary,
  secondary,
  className,
  children,
  ...props
}: ActionBarProps) => {
  const stickyCls = sticky
    ? position === 'top'
      ? 'sticky top-[var(--nav-height)] z-20'
      : 'sticky bottom-3 z-20'
    : '';

  return (
    <div className={cn(stickyCls, className)} {...props}>
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border bg-card px-4 py-3"
        style={{
          borderColor: '#E8EDF3',
          boxShadow:
            '0 1px 2px rgba(10,37,64,0.04), 0 0 0 1px rgba(255,255,255,0.6) inset, 0 8px 24px -12px rgba(10,37,64,0.18)'
        }}
      >
        {children ?? (
          <>
            <div className="min-w-0 flex-1">{meta}</div>
            <div className="flex flex-wrap items-center gap-2">
              {secondary}
              {primary}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
