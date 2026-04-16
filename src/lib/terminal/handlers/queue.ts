// Queue commands (QC/, Q/, QP, QR, QXI, I).  These are the heart of a
// working-agent day — they let the user walk through PNRs that landed in a
// queue and act on each one.

import queuesData from '@/fixtures/queues.json';
import type { QueueBucket } from '@/lib/types';
import { getPnrByLocator } from '../fixtures/pnrs';
import { formatPnr, formatQueueCount, formatQueueEntry } from '../formatters';
import type { TerminalSession } from '../types';

const QUEUES = queuesData as QueueBucket[];

const QUEUE_NAMES: Record<string, string> = {
  Q0: 'GENERAL',
  Q1: 'AWAITING TICKET',
  Q2: 'SCHEDULE CHANGES',
  Q3: 'WAITLIST CONFIRM',
  Q4: 'TIME LIMIT',
  Q5: 'SSR RESPONSES',
  Q6: 'HOTEL/CAR',
  Q7: 'SCHEDULE CHG ACK',
  Q8: 'REFUND',
  Q9: 'TICKETING',
  Q10: 'GROUP DESK',
  Q11: 'CORPORATE',
  Q12: 'FARE REBOOK',
  Q13: 'CREDIT CARD',
  Q14: 'VOID QUEUE',
  Q15: 'EXCHG/REFUND',
  Q16: 'EMD',
  Q17: 'QUALITY CTRL',
  Q18: 'AGENCY ADMIN',
  Q19: 'COMMISSION',
  Q20: 'MANAGEMENT',
};

function getBucket(code: string): QueueBucket | undefined {
  return QUEUES.find((b) => b.queueCode.toUpperCase() === code.toUpperCase());
}

// QC/  -> show counts for all queues with items
// QC/9 -> show a specific queue's count
export function handleQueueCount(arg: string | undefined, session: TerminalSession): string[] {
  const rows = QUEUES.filter((b) => b.items.length > 0)
    .filter((b) => {
      if (!arg) return true;
      return b.queueCode.toUpperCase() === `Q${arg}` || b.queueCode.toUpperCase() === arg.toUpperCase();
    })
    .map((b) => ({
      queue: b.queueCode.replace(/^Q/, ''),
      items: b.items.length,
      name: QUEUE_NAMES[b.queueCode.toUpperCase()] ?? 'UNNAMED',
    }));
  if (rows.length === 0) return ['NO QUEUES WITH ITEMS'];
  return formatQueueCount(session.pcc, session.officeDate, rows);
}

// Q/9 -> enter queue 9, load first PNR into the working area.
export function handleQueueEnter(qNum: string, session: TerminalSession): string[] {
  const code = `Q${qNum}`;
  const bucket = getBucket(code);
  if (!bucket) return [`QUEUE ${qNum} NOT FOUND`];
  if (bucket.items.length === 0) return [`QUEUE ${qNum} IS EMPTY`];

  session.activeQueue = {
    code,
    name: QUEUE_NAMES[code.toUpperCase()] ?? 'UNNAMED',
    entries: bucket.items.map((i) => ({ locator: i.locator, placedAt: session.officeDate + '/' + session.officeTime })),
    position: 0,
  };

  const firstLocator = bucket.items[0].locator;
  const pnr = getPnrByLocator(firstLocator);
  if (pnr) {
    session.currentPnr = pnr;
  }

  const out: string[] = [];
  out.push(...formatQueueEntry(session.activeQueue, session.pcc));
  if (pnr) {
    out.push('');
    out.push(...formatPnr(pnr, 'R'));
  }
  return out;
}

// QR -> remove current PNR from queue, advance to next.
export function handleQueueRemove(session: TerminalSession): string[] {
  if (!session.activeQueue) return ['NO QUEUE OPEN'];
  const q = session.activeQueue;
  const removed = q.entries[q.position];
  if (!removed) return ['NO ITEM TO REMOVE'];
  q.entries.splice(q.position, 1);

  if (q.entries.length === 0) {
    session.activeQueue = null;
    session.currentPnr = null;
    return [`QUEUE ${q.code.replace(/^Q/, '')} EMPTY - QUEUE EXITED`];
  }

  if (q.position >= q.entries.length) q.position = q.entries.length - 1;
  const next = q.entries[q.position];
  const pnr = getPnrByLocator(next.locator);
  session.currentPnr = pnr ?? null;
  const out: string[] = [`ITEM REMOVED FROM Q${q.code.replace(/^Q/, '')} - ${q.entries.length} REMAINING`];
  if (pnr) {
    out.push('');
    out.push(...formatPnr(pnr, 'R'));
  }
  return out;
}

// QXI -> exit queue without removing current item.
export function handleQueueExit(session: TerminalSession): string[] {
  if (!session.activeQueue) return ['NO QUEUE OPEN'];
  const code = session.activeQueue.code;
  session.activeQueue = null;
  return [`QUEUE ${code.replace(/^Q/, '')} EXITED - NO ITEM REMOVED`];
}

// I (in queue context) -> next item.
export function handleQueueNext(session: TerminalSession): string[] {
  if (!session.activeQueue) return ['NO QUEUE OPEN'];
  const q = session.activeQueue;
  if (q.position + 1 >= q.entries.length) return ['END OF QUEUE'];
  q.position += 1;
  const next = q.entries[q.position];
  const pnr = getPnrByLocator(next.locator);
  session.currentPnr = pnr ?? null;
  const out = [`QUEUE ${q.code.replace(/^Q/, '')} ITEM ${q.position + 1} OF ${q.entries.length}`];
  if (pnr) {
    out.push('');
    out.push(...formatPnr(pnr, 'R'));
  }
  return out;
}

// QP/500/11 -> place the current working PNR onto queue 500 with placement
// instruction code 11.  We only actually store the fact that it was placed.
export function handleQueuePlace(args: string, session: TerminalSession): string[] {
  if (!session.currentPnr) return ['NO PNR IN WORKING AREA'];
  const [qNum, pic] = args.split('/');
  return [`PNR ${session.currentPnr.locator} PLACED ON Q${qNum}${pic ? ` PIC ${pic}` : ''}`];
}
