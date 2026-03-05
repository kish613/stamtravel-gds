'use client';
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-8 items-center rounded-md p-1 bg-white/30 backdrop-blur-md border border-white/15 shadow-[inset_0_1px_2px_rgba(10,22,40,0.04)]',
      className
    )}
    {...props}
  />
));

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'px-3 py-1 text-[13px] font-medium rounded text-[#475569] transition-all',
      'data-[state=active]:bg-white/70 data-[state=active]:backdrop-blur-lg data-[state=active]:text-[#0F172A] data-[state=active]:shadow-[0_2px_8px_-1px_rgba(10,22,40,0.06),inset_0_1px_1px_rgba(255,255,255,0.5)]',
      'hover:text-[#0F172A]',
      className
    )}
    {...props}
  />
));

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-2 text-[13px] focus-visible:outline-none', className)}
    {...props}
  />
));

TabsList.displayName = 'TabsList';
TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
