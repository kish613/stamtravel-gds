import * as React from 'react';
import { cn } from '@/lib/utils';

const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={cn('w-full caption-bottom text-[13px]', className)} {...props} />
);

const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn('[&_tr]:border-b bg-muted', className)}
    {...props}
  />
);

const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      'border-b border-border transition-colors hover:bg-muted/50',
      className
    )}
    {...props}
  />
);

const TableHead = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('h-8 px-3 text-left text-[12px] font-medium text-muted-foreground', className)} {...props} />
);

const TableCell = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-3 py-1.5 text-[13px]', className)} {...props} />
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
