'use client';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn('h-4 w-4 rounded border border-[#CBD5E1] bg-white', className)}
    {...props}
  >
    <CheckboxPrimitive.Indicator>
      <Check className="h-4 w-4 text-[#0A1628]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = 'Checkbox';
export { Checkbox };
