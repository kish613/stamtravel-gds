import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eyebrow } from './section-eyebrow';

interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  eyebrow,
  title,
  meta,
  actions,
  className
}: PageHeaderProps) => (
  <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
    <div className="min-w-0 flex-1">
      {eyebrow && <Eyebrow as="div" className="mb-2">{eyebrow}</Eyebrow>}
      <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      {meta && (
        <p className="mt-1 text-[13px] text-muted-foreground">{meta}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
