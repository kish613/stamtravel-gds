import * as React from 'react';
import { Badge } from '@/components/ui/badge';

export const STATUS_STYLES: Record<string, 'confirmed' | 'warning' | 'danger' | 'neutral'> = {
  Booked: 'warning',
  Ticketed: 'confirmed',
  'Awaiting Ticket': 'warning',
  Void: 'danger',
  Canceled: 'danger'
};

export function StatusBadge({ status }: { status: string }) {
  const key = STATUS_STYLES[status] || 'neutral';
  return <Badge variant={key}>{status}</Badge>;
}

