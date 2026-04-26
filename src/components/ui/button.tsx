import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-[10px] text-sm font-medium transition-[background,box-shadow,transform,filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-[#14476B] active:bg-[#05192E]',
        primary:
          'bg-brand-gradient text-white shadow-brand hover:brightness-[1.08] active:brightness-95',
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-[#E2E8F0] active:bg-[#CBD5E1]',
        outline:
          'border border-border bg-background text-foreground hover:bg-secondary active:bg-[#E2E8F0]',
        ghost:
          'text-foreground hover:bg-secondary active:bg-[#E2E8F0]',
        destructive:
          'bg-destructive text-destructive-foreground hover:brightness-110 active:brightness-95',
        success:
          'bg-status-good text-white hover:brightness-110 active:brightness-95',
        accent:
          'bg-[#25A5B4] text-white border border-[#25A5B4]/20 hover:bg-[#3DBBC8] active:bg-[#0A8A98] shadow-sm'
      },
      size: {
        default: 'h-8 px-3 py-1.5 text-[13px]',
        sm: 'h-7 rounded-[8px] px-2.5 text-[12px]',
        lg: 'h-9 rounded-[10px] px-4 text-[14px]',
        icon: 'h-8 w-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));

Button.displayName = 'Button';
export { Button, buttonVariants };
