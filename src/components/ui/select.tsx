'use client';
import * as React from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SelectPrimitive = Select;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn('relative flex h-7 cursor-pointer items-center rounded px-2 py-1 text-[13px] text-foreground hover:bg-muted outline-none focus:bg-muted', className)}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
      <Check className="h-4 w-4 text-muted-foreground" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn('z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-card-md', className)}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-slate-400',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));

const SelectValue = SelectPrimitive.Value;

SelectItem.displayName = 'SelectItem';
SelectContent.displayName = 'SelectContent';
SelectTrigger.displayName = 'SelectTrigger';

const SelectRoot = SelectPrimitive.Root;

export { SelectRoot as Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
