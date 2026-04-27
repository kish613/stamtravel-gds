import * as React from 'react';
import { cn } from '@/lib/utils';

interface KpiStripProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 2 | 3 | 4;
}

const colClasses: Record<2 | 3 | 4, string> = {
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-3',
  3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
  4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'
};

export const KpiStrip = ({ cols = 4, className, children, ...props }: KpiStripProps) => (
  <div className={cn(colClasses[cols], className)} {...props}>
    {children}
  </div>
);
