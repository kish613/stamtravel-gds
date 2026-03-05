import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand-navy text-white hover:bg-[#16253b]',
        secondary: 'bg-white text-[#0A1628] border border-[#C5CEE0] hover:bg-[#F1F5F9]',
        outline: 'border border-[#C5CEE0] bg-transparent text-[#0A1628] hover:bg-[#EDF2F7]',
        ghost: 'hover:bg-[#E2E8F0] text-[#0A1628]',
        destructive: 'bg-status-danger text-white hover:opacity-90',
        success: 'bg-status-good text-white hover:opacity-90'
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
