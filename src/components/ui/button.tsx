import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-[#0A1628] to-[#1A2D4A] text-white shadow-[0_2px_8px_-2px_rgba(10,22,40,0.3)] hover:shadow-[0_4px_16px_-2px_rgba(10,22,40,0.4)] hover:scale-[1.02] active:scale-[0.98]',
        secondary:
          'bg-white/60 backdrop-blur-md text-[#0A1628] border border-white/18 shadow-[0_2px_8px_-1px_rgba(10,22,40,0.05),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:bg-white/80 hover:shadow-[0_4px_12px_-2px_rgba(10,22,40,0.08)] hover:scale-[1.01] active:scale-[0.99]',
        outline:
          'border border-white/18 bg-white/30 backdrop-blur-md text-[#0A1628] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:bg-white/50 hover:shadow-[0_2px_8px_-2px_rgba(10,22,40,0.06)] hover:scale-[1.01] active:scale-[0.99]',
        ghost:
          'text-[#0A1628] hover:bg-white/40 hover:backdrop-blur-sm',
        destructive:
          'bg-gradient-to-br from-status-danger to-[#DC2626] text-white shadow-[0_2px_8px_-2px_rgba(239,68,68,0.3)] hover:shadow-[0_4px_16px_-2px_rgba(239,68,68,0.4)] hover:scale-[1.02] active:scale-[0.98]',
        success:
          'bg-gradient-to-br from-status-good to-[#16A34A] text-white shadow-[0_2px_8px_-2px_rgba(34,197,94,0.3)] hover:shadow-[0_4px_16px_-2px_rgba(34,197,94,0.4)] hover:scale-[1.02] active:scale-[0.98]'
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
