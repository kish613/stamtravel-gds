'use client';
import * as Dialog from '@radix-ui/react-dialog';
import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DialogRoot = Dialog.Root;
const DialogTrigger = Dialog.Trigger;
const DialogPortal = Dialog.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn('fixed inset-0 bg-black/40 backdrop-blur-[2px]', className)}
    {...props}
  />
));

const DialogContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 w-[95vw] max-w-xl -translate-x-1/2 -translate-y-1/2',
        'rounded-lg border border-border bg-background p-4 shadow-card-md',
        className
      )}
      {...props}
    >
      <Dialog.Close className="absolute right-3 top-3 rounded-md p-0.5 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-secondary transition-colors">
        <X className="h-4 w-4" />
      </Dialog.Close>
      {children}
    </Dialog.Content>
  </DialogPortal>
));

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-3', className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn('text-[18px] font-semibold leading-none tracking-tight text-foreground', className)}
    {...props}
  />
));

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn('text-[13px] text-muted-foreground mt-2', className)}
    {...props}
  />
));

DialogOverlay.displayName = Dialog.Overlay.displayName;
DialogContent.displayName = Dialog.Content.displayName;
DialogTitle.displayName = Dialog.Title.displayName;
DialogDescription.displayName = Dialog.Description.displayName;

export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
};
