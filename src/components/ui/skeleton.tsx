import * as React from 'react';
import { cn } from '@/lib/utils';

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('animate-pulse rounded bg-[#E2E8F0]', className)}
    {...props}
  />
);

Skeleton.displayName = 'Skeleton';
export { Skeleton };
