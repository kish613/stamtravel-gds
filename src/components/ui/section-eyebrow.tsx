import * as React from 'react';
import { cn } from '@/lib/utils';

interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: 'span' | 'div' | 'p';
}

export const Eyebrow = ({ className, as: Comp = 'span', ...props }: EyebrowProps) => (
  <Comp
    className={cn(
      'gds-eyebrow font-mono inline-block',
      className
    )}
    {...props}
  />
);
