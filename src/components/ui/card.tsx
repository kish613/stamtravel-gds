import * as React from 'react';
import { cn } from '@/lib/utils';

export type CardAccent = 'good' | 'warn' | 'danger' | 'info' | 'brand';
type CardVariant = 'default' | 'pro';

const accentColor: Record<CardAccent, string> = {
  good: 'var(--color-status-good)',
  warn: 'var(--color-status-warn)',
  danger: 'var(--color-status-danger)',
  info: 'var(--color-status-info)',
  brand: 'var(--brand-teal-500)'
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  accent?: CardAccent;
}

interface ProAware {
  __pro?: boolean;
}

// Walks Children once and clones any direct CardHeader/CardTitle/CardContent/CardFooter
// elements with __pro=true so they switch to the pro padding/typography. This avoids
// React.createContext (which would force the file to be a client-only module).
function injectPro(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const type = child.type as { __isProAware?: boolean } | string;
    if (typeof type === 'object' && type !== null && (type as { __isProAware?: boolean }).__isProAware) {
      return React.cloneElement(
        child as React.ReactElement<ProAware>,
        { __pro: true } as ProAware
      );
    }
    return child;
  });
}

export const Card = ({
  className,
  variant = 'default',
  accent,
  children,
  ...props
}: CardProps) => {
  if (variant === 'pro') {
    return (
      <div
        data-card-variant="pro"
        className={cn(
          'relative overflow-hidden rounded-[14px] border bg-card text-card-foreground',
          className
        )}
        style={{
          borderColor: '#E8EDF3',
          boxShadow:
            '0 1px 2px rgba(10,37,64,0.04), 0 0 0 1px rgba(255,255,255,0.6) inset'
        }}
        {...props}
      >
        {accent && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-0 h-[2px] opacity-90"
            style={{ background: accentColor[accent] }}
          />
        )}
        {injectPro(children)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-[20px] border border-border bg-card text-card-foreground shadow-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface ProAwareDivProps extends React.HTMLAttributes<HTMLDivElement>, ProAware {}
interface ProAwareHeadingProps extends React.HTMLAttributes<HTMLHeadingElement>, ProAware {}
interface ProAwareParaProps extends React.HTMLAttributes<HTMLParagraphElement>, ProAware {}

export const CardHeader = ({ className, __pro, children, ...props }: ProAwareDivProps) => (
  <div
    className={cn(
      __pro
        ? 'flex flex-wrap items-center justify-between gap-2.5 px-[18px] pt-4 pb-2.5'
        : 'flex flex-col space-y-1.5 p-5',
      className
    )}
    {...props}
  >
    {__pro ? injectPro(children) : children}
  </div>
);
(CardHeader as { __isProAware?: boolean }).__isProAware = true;

export const CardTitle = ({ className, __pro, ...props }: ProAwareHeadingProps) => (
  <h3
    className={cn(
      __pro
        ? 'font-display text-[15px] font-bold leading-tight tracking-[-0.01em] text-foreground'
        : 'text-[16px] font-semibold leading-none tracking-tight text-foreground',
      className
    )}
    {...props}
  />
);
(CardTitle as { __isProAware?: boolean }).__isProAware = true;

export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
);

export const CardContent = ({ className, __pro, ...props }: ProAwareDivProps) => (
  <div
    className={cn(__pro ? 'px-[18px] pt-1.5 pb-[18px]' : 'p-5 pt-0', className)}
    {...props}
  />
);
(CardContent as { __isProAware?: boolean }).__isProAware = true;

export const CardFooter = ({ className, __pro, ...props }: ProAwareDivProps) => (
  <div
    className={cn(
      __pro ? 'flex items-center px-[18px] pb-[18px] pt-1.5' : 'flex items-center p-5 pt-0',
      className
    )}
    {...props}
  />
);
(CardFooter as { __isProAware?: boolean }).__isProAware = true;
