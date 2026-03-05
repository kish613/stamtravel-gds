import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={cn('w-full caption-bottom text-[13px]', className)} {...props} />
);

const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn(
      '[&_tr]:border-b bg-gradient-to-r from-[#F1F5F9]/80 to-[#EEF2FF]/60',
      className
    )}
    {...props}
  />
);

const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      'border-b border-white/10 transition-all hover:bg-white/40 hover:backdrop-blur-sm hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]',
      className
    )}
    {...props}
  />
);

const TableHead = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('h-8 px-2 text-left text-[12px] font-medium text-[#334155]', className)} {...props} />
);

const TableCell = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-2 py-1 text-[13px]', className)} {...props} />
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
