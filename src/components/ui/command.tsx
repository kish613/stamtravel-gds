import * as React from 'react';
import { cn } from '@/lib/utils';

const Command = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded border border-[#CBD5E1] bg-white', className)} {...props} />
);

const CommandInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn('h-8 w-full border-b border-[#CBD5E1] bg-white px-2 text-[13px]', className)} {...props} />
);

const CommandList = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('max-h-64 overflow-auto p-2', className)} {...props} />
);

const CommandGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-3', className)} {...props} />
);

const CommandItem = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded px-2 py-1 text-[13px] hover:bg-[#E2E8F0] cursor-pointer', className)} {...props} />
);

const CommandEmpty = ({ ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className="text-[12px] px-2 py-2 text-[#64748B]" {...props} />
);

export { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty };
