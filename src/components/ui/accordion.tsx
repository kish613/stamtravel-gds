'use client';
import * as React from 'react';
import * as RadixAccordion from '@radix-ui/react-accordion';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const Accordion = RadixAccordion.Root;
const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Item>
>(({ className, ...props }, ref) => (
  <RadixAccordion.Item ref={ref} className={cn('mb-1 overflow-hidden rounded border border-[#E2E8F0]', className)} {...props} />
));

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Trigger>
>(({ className, children, ...props }, ref) => (
  <RadixAccordion.Header className="flex">
    <RadixAccordion.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between px-3 py-2 text-[13px] font-medium bg-[#F1F5F9] hover:bg-[#E2E8F0]',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 transition-transform radix-state-open:rotate-180" />
    </RadixAccordion.Trigger>
  </RadixAccordion.Header>
));

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadixAccordion.Content>
>(({ className, children, ...props }, ref) => (
  <RadixAccordion.Content
    ref={ref}
    className={cn('px-3 py-2 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down text-[13px]', className)}
    {...props}
  >
    {children}
  </RadixAccordion.Content>
));

AccordionItem.displayName = 'AccordionItem';
AccordionTrigger.displayName = 'AccordionTrigger';
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
