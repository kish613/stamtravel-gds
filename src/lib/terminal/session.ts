// Module-level singleton session state for the Sabre terminal simulator.
// A real Sabre terminal maintains a "working area" (the PNR currently being
// modified), an open queue context, the most recent availability display, and
// so on.  We emulate that with a single mutable object.  The terminal UI
// re-instantiates fresh state on app reload, which matches how real agents
// start each session.

import type { TerminalSession } from './types';

function defaultSession(): TerminalSession {
  return {
    pcc: 'A0UC',
    agentSign: 'ASC',
    officeDate: '16APR',
    officeTime: '1054',
    currentPnr: null,
    draftPnr: null,
    activeQueue: null,
    availability: null,
    lastResponse: [],
  };
}

let session: TerminalSession = defaultSession();

export function getSession(): TerminalSession {
  return session;
}

export function resetSession(): void {
  session = defaultSession();
}

// Advance the simulated clock by the given minutes.  Used when we want
// successive responses to show slightly different timestamps, but for now we
// keep things deterministic and callers rarely need this.
export function advanceClock(minutes: number): void {
  const hh = parseInt(session.officeTime.slice(0, 2), 10);
  const mm = parseInt(session.officeTime.slice(2, 4), 10);
  const total = hh * 60 + mm + minutes;
  const nhh = Math.floor((total / 60) % 24);
  const nmm = total % 60;
  session.officeTime = `${String(nhh).padStart(2, '0')}${String(nmm).padStart(2, '0')}`;
}
