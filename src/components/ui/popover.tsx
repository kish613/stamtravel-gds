'use client';
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      'z-50 rounded-md border border-border bg-popover p-3 text-sm text-popover-foreground shadow-card-md',
      className
    )}
    {...props}
  />
));

PopoverContent.displayName = PopoverPrimitive.Content.displayName;
export { Popover, PopoverTrigger, PopoverContent };
