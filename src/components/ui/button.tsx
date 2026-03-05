import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-slate-700 active:bg-slate-800',
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-slate-200 active:bg-slate-300',
        outline:
          'border border-border bg-background text-foreground hover:bg-secondary active:bg-slate-200',
        ghost:
          'text-foreground hover:bg-secondary active:bg-slate-200',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-red-700 active:bg-red-800',
        success:
          'bg-status-good text-white hover:bg-emerald-700 active:bg-emerald-800'
      },
      size: {
        default: 'h-8 px-3 py-1.5 text-[13px]',
        sm: 'h-7 rounded-md px-2.5 text-[12px]',
        lg: 'h-9 rounded-md px-4 text-[14px]',
        icon: 'h-8 w-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));

Button.displayName = 'Button';
export { Button, buttonVariants };
