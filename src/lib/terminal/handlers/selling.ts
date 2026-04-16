// Selling segments and entering passenger names.  In a real workflow the
// agent first does availability, then `01Y3` (sell line 1, Y class, 3 seats),
// then `-SMITH/JOHN MR` to add a name, then `9-PHONE...`, then `6-PAX` for
// received-from, then `ER` to end transaction.  We build a draftPnr in the
// session until ER happens.

import type { MockPassenger, MockSegment, TerminalSession } from '../types';

const SELL_RE = /^0(\d+)([A-Z])(\d+)$/;
const NAME_RE = /^-(\d*)?([A-Z\-']+)\/([A-Z\s]+?)(?:\s+(MR|MRS|MS|MSTR|MISS))?$/;

export function handleSell(input: string, session: TerminalSession): string[] {
  const m = SELL_RE.exec(input.toUpperCase());
  if (!m) return ['INVALID SELL FORMAT - TRY 01Y3'];
  if (!session.availability) return ['NO AVAILABILITY DISPLAY - SEARCH FIRST'];
  const [, lineStr, cls, countStr] = m;
  const line = session.availability.lines[parseInt(lineStr, 10) - 1];
  if (!line) return [`LINE ${lineStr} NOT FOUND`];
  const count = parseInt(countStr, 10);

  const seg: MockSegment = {
    carrier: line.carrier,
    flightNumber: line.flightNumber,
    bookingClass: cls,
    from: line.from,
    to: line.to,
    depDate: session.availability.date,
    depTime: line.depTime,
    arrTime: line.arrTime,
    arrDayOffset: line.arrDayOffset,
    status: 'SS', // sold (real Sabre returns SS on fresh sell)
    paxCount: count,
    equipment: line.equipment,
    elapsed: line.elapsed,
  };

  if (!session.draftPnr) session.draftPnr = { segments: [], passengers: [], phones: [], ssrs: [], remarks: [] };
  session.draftPnr.segments = [...(session.draftPnr.segments ?? []), seg];

  const idx = session.draftPnr.segments.length;
  return [
    `${idx} ${seg.carrier}${String(seg.flightNumber).padStart(4)}${seg.bookingClass} ${seg.depDate} ${seg.from}${seg.to} SS${count}  ${seg.depTime}  ${seg.arrTime}`,
  ];
}

export function handleName(input: string, session: TerminalSession): string[] {
  const m = NAME_RE.exec(input.toUpperCase());
  if (!m) return ['INVALID NAME FORMAT - TRY -SMITH/JOHN MR'];
  const [, , surname, given, titleRaw] = m;
  const title = titleRaw ?? 'MR';
  const pax: MockPassenger = {
    title,
    firstName: given.trim(),
    lastName: surname,
    dob: '1985-01-01',
    nationality: 'GBR',
    passportNumber: 'P00000000',
    passportExpiry: '2030-01-01',
    gender: title === 'MR' || title === 'MSTR' ? 'M' : 'F',
    paxType: title === 'MSTR' || title === 'MISS' ? 'CNN' : 'ADT',
  };
  if (!session.draftPnr) session.draftPnr = { segments: [], passengers: [], phones: [], ssrs: [], remarks: [] };
  session.draftPnr.passengers = [...(session.draftPnr.passengers ?? []), pax];
  const idx = session.draftPnr.passengers.length;
  return [`${idx}.1${surname}/${given.trim()} ${title}`];
}

// 9-PHONE-LON0207-1234-5678 style phone entry
export function handlePhone(raw: string, session: TerminalSession): string[] {
  if (!session.draftPnr) session.draftPnr = { segments: [], passengers: [], phones: [], ssrs: [], remarks: [] };
  session.draftPnr.phones = [...(session.draftPnr.phones ?? []), { type: 'A', city: 'LON', number: raw }];
  const n = session.draftPnr.phones.length;
  return [`PHONE ${n} ADDED`];
}

// 6-RECEIVED-FROM
export function handleReceivedFrom(text: string, session: TerminalSession): string[] {
  if (!session.draftPnr) session.draftPnr = { segments: [], passengers: [], phones: [], ssrs: [], remarks: [] };
  (session.draftPnr as { receivedFrom?: string }).receivedFrom = text;
  return [`RECEIVED FROM - ${text}`];
}

// 5H-<REMARK>  confidential historical remark
// 5-<REMARK>   general remark
export function handleRemark(text: string, session: TerminalSession): string[] {
  if (!session.draftPnr) session.draftPnr = { segments: [], passengers: [], phones: [], ssrs: [], remarks: [] };
  session.draftPnr.remarks = [...(session.draftPnr.remarks ?? []), { text }];
  return [`REMARK ${session.draftPnr.remarks.length} ADDED`];
}

// 7TAW16APR/  ticket time limit
export function handleTicketTimeLimit(text: string, session: TerminalSession): string[] {
  if (!session.draftPnr && !session.currentPnr) return ['NO WORKING PNR'];
  const target = session.currentPnr ?? (session.draftPnr as { ticketTimeLimit?: string });
  target.ticketTimeLimit = text;
  return [`TICKET TIME LIMIT SET - ${text}`];
}
