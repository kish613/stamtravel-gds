// End-transaction, ignore, currency conversion, help — the miscellaneous
// commands that keep a session moving.

import type { TerminalSession } from '../types';
import { TERMINAL_COMMANDS } from './command-list';

// ER -> end & retrieve.  Commits draftPnr to currentPnr with a new locator,
// or if we already had a currentPnr, just redisplays it.
export function handleEndRetrieve(session: TerminalSession): string[] {
  if (session.draftPnr && (session.draftPnr.segments?.length ?? 0) > 0) {
    const locator = generateLocator();
    const pnr = {
      locator,
      createdAt: `${session.officeDate}/${session.officeTime}`,
      status: 'Booked' as const,
      passengers: session.draftPnr.passengers ?? [],
      segments: session.draftPnr.segments ?? [],
      phones: session.draftPnr.phones ?? [],
      email: undefined,
      ssrs: session.draftPnr.ssrs ?? [],
      remarks: session.draftPnr.remarks ?? [],
      ticketTimeLimit: session.draftPnr.ticketTimeLimit,
      receivedFrom: session.draftPnr.receivedFrom ?? 'PAX',
      agentSign: session.agentSign,
      pcc: session.pcc,
      history: [
        { timestamp: `${session.officeDate}/${session.officeTime}`, actor: `${session.pcc}.${session.pcc}*${session.agentSign}`, event: 'PNR CREATED' },
      ],
      dirty: false,
    };
    session.currentPnr = pnr;
    session.draftPnr = null;
    return [`END TRANSACTION COMPLETE`, `RLOC ${locator}`];
  }
  if (session.currentPnr) {
    session.currentPnr.dirty = false;
    return [`END TRANSACTION COMPLETE - ${session.currentPnr.locator}`];
  }
  return ['NO CHANGES TO COMMIT'];
}

// E (no R)
export function handleEnd(session: TerminalSession): string[] {
  const out = handleEndRetrieve(session);
  session.currentPnr = null;
  return out;
}

// I -> ignore (drop all unsaved changes)
export function handleIgnore(session: TerminalSession): string[] {
  session.draftPnr = null;
  if (session.currentPnr) {
    session.currentPnr.dirty = false;
  }
  return ['IGNORED'];
}

// IR -> ignore and retrieve (redisplay the PNR as it was on the server)
export function handleIgnoreRetrieve(session: TerminalSession): string[] {
  session.draftPnr = null;
  if (!session.currentPnr) return ['IGNORED - NO PNR TO RETRIEVE'];
  return ['IGNORED', `RLOC ${session.currentPnr.locator}`];
}

// DC‡USD100/EUR -> currency conversion
const DC_RE = /^DC[‡¥#]([A-Z]{3})(\d+(?:\.\d+)?)(?:\/([A-Z]{3}))?$/;
// Static fake rate table.  Good enough for demos.
const RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  SAR: 3.75,
  AED: 3.67,
  CAD: 1.37,
  JPY: 156.0,
};

export function handleCurrency(input: string): string[] {
  const m = DC_RE.exec(input.toUpperCase().replace(/#/g, '‡'));
  if (!m) return ['INVALID FORMAT - TRY DC‡USD100/EUR'];
  const [, from, amtStr, toOpt] = m;
  const amount = parseFloat(amtStr);
  const to = toOpt ?? 'USD';
  const rFrom = RATES[from];
  const rTo = RATES[to];
  if (!rFrom || !rTo) return [`UNKNOWN CURRENCY - ${from}/${to}`];
  const inUsd = amount / rFrom;
  const converted = inUsd * rTo;
  return [
    `CONVERSION RATE ${from}/${to}  ${(rTo / rFrom).toFixed(5)}`,
    `${from} ${amount.toFixed(2)}  =  ${to} ${converted.toFixed(2)}`,
  ];
}

// HLP -> help.  List commands grouped by category.
export function handleHelp(): string[] {
  const out = ['SABRE MOCK TERMINAL - SUPPORTED COMMANDS'];
  const groups: Record<string, typeof TERMINAL_COMMANDS> = {};
  TERMINAL_COMMANDS.forEach((c) => {
    groups[c.category] = groups[c.category] || [];
    groups[c.category].push(c);
  });
  for (const [cat, cmds] of Object.entries(groups)) {
    out.push('');
    out.push(`--- ${cat.toUpperCase()} ---`);
    cmds.forEach((c) => {
      out.push(`  ${c.command.padEnd(20)} ${c.description}`);
    });
  }
  return out;
}

// SSR DOCS / 3DOCS style entry on current PNR.
export function handleSsr(input: string, session: TerminalSession): string[] {
  if (!session.currentPnr) return ['NO PNR IN WORKING AREA'];
  const text = input.replace(/^3/, '');
  session.currentPnr.ssrs.push({
    code: text.split('/')[0] || 'OTHS',
    airline: session.currentPnr.segments[0]?.carrier ?? 'BA',
    status: 'HK',
    paxRef: '1.1',
    text,
  });
  session.currentPnr.dirty = true;
  return [`SSR ADDED - ${text}`];
}

function generateLocator(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
