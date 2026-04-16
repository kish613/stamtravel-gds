// Command dispatcher.  Input is a single typed command string; output is an
// array of text lines.  We match against ordered regexes — first hit wins.
// Ordering matters because several prefixes overlap:
//   - "QC/" vs "QR" vs "Q/"
//   - "*R" (display full PNR) vs "*AAC00" (retrieve by locator)
//   - "I" (queue next / ignore) — resolved contextually inside the handler

import { getSession } from './session';
import {
  handleQueueCount,
  handleQueueEnter,
  handleQueuePlace,
  handleQueueRemove,
  handleQueueExit,
  handleQueueNext,
} from './handlers/queue';
import {
  handleRetrieveLocator,
  handleRetrieveSurname,
  handleDisplay,
} from './handlers/pnr';
import { handleAvailability, handleFlightDetails } from './handlers/availability';
import {
  handleSell,
  handleName,
  handlePhone,
  handleReceivedFrom,
  handleRemark,
  handleTicketTimeLimit,
} from './handlers/selling';
import { handleWp, handleWpnc, handleWpRedisplay } from './handlers/pricing';
import { handleTicketing } from './handlers/ticketing';
import {
  handleEnd,
  handleEndRetrieve,
  handleIgnore,
  handleIgnoreRetrieve,
  handleCurrency,
  handleHelp,
  handleSsr,
} from './handlers/misc';

type Rule = {
  pattern: RegExp;
  run: (match: RegExpExecArray, session: ReturnType<typeof getSession>) => string[];
};

const RULES: Rule[] = [
  // --- Queue (most specific first) ---
  { pattern: /^QC\/(\d{1,3})$/i, run: (m, s) => handleQueueCount(m[1], s) },
  { pattern: /^QC\/?$/i, run: (_m, s) => handleQueueCount(undefined, s) },
  { pattern: /^QXI$/i, run: (_m, s) => handleQueueExit(s) },
  { pattern: /^QR$/i, run: (_m, s) => handleQueueRemove(s) },
  { pattern: /^QP\/(\d{1,3}(?:\/\d+)?)$/i, run: (m, s) => handleQueuePlace(m[1], s) },
  { pattern: /^Q\/(\d{1,3})$/i, run: (m, s) => handleQueueEnter(m[1], s) },

  // --- PNR display (letter-based must match before locator catch-all) ---
  { pattern: /^\*PQ$/i, run: (_m, s) => handleDisplay('PQ', s) },
  { pattern: /^\*FF$/i, run: (_m, s) => handleDisplay('FF', s) },
  { pattern: /^\*([RAINPHBT])$/i, run: (m, s) => handleDisplay(m[1], s) },
  { pattern: /^\*-([A-Z\-']{2,})$/i, run: (m, s) => handleRetrieveSurname(m[1], s) },
  { pattern: /^\*([A-Z0-9]{5,6})$/i, run: (m, s) => handleRetrieveLocator(m[1], s) },

  // --- Pricing (must match before ticketing because both start with W) ---
  { pattern: /^WP\*$/i, run: (_m, s) => handleWpRedisplay(s) },
  { pattern: /^WPNC$/i, run: (_m, s) => handleWpnc(s) },
  { pattern: /^WP$/i, run: (_m, s) => handleWp(s) },

  // --- Ticketing ---
  { pattern: /^W[‡¥#].+$/i, run: (m, s) => handleTicketing(m[0], s) },

  // --- Availability + flight details ---
  { pattern: /^VA\*(\d{1,2})$/i, run: (m, s) => handleFlightDetails(m[1], s) },
  { pattern: /^1\d{2}[A-Z]{3}[A-Z]{3}[A-Z]{3}(?:[-‡¥#][A-Z0-9]+)?$/i, run: (m, s) => handleAvailability(m[0], s) },

  // --- Selling & PNR fields ---
  { pattern: /^0\d+[A-Z]\d+$/i, run: (m, s) => handleSell(m[0], s) },
  { pattern: /^-\d*[A-Z\-']{2,}\/[A-Z\s]+?(?:\s+(MR|MRS|MS|MSTR|MISS))?$/i, run: (m, s) => handleName(m[0], s) },
  { pattern: /^9-(.+)$/i, run: (m, s) => handlePhone(m[1], s) },
  { pattern: /^6-(.+)$/i, run: (m, s) => handleReceivedFrom(m[1], s) },
  { pattern: /^5H?-(.+)$/i, run: (m, s) => handleRemark(m[1], s) },
  { pattern: /^7TAW([A-Z0-9/]+)$/i, run: (m, s) => handleTicketTimeLimit(`TAW${m[1]}`, s) },

  // --- SSR ---
  { pattern: /^3(DOCS|VGML|WCHR|OSI|OTHS|SFML|BBML|UMNR)\/?.*$/i, run: (m, s) => handleSsr(m[0], s) },

  // --- Transaction control ---
  { pattern: /^ER$/i, run: (_m, s) => handleEndRetrieve(s) },
  { pattern: /^E$/i, run: (_m, s) => handleEnd(s) },
  { pattern: /^IR$/i, run: (_m, s) => handleIgnoreRetrieve(s) },
  { pattern: /^I$/i, run: (_m, s) => {
    // In queue context I means "next item".  Otherwise it means "ignore".
    if (s.activeQueue) return handleQueueNext(s);
    return handleIgnore(s);
  } },

  // --- Utility ---
  { pattern: /^DC[‡¥#][A-Z]{3}\d+(?:\.\d+)?(?:\/[A-Z]{3})?$/i, run: (m) => handleCurrency(m[0]) },
  { pattern: /^HLP$/i, run: () => handleHelp() },
];

export function dispatch(raw: string): string[] {
  const session = getSession();
  const input = raw.trim();
  if (!input) return [];

  // Normalize # -> ‡ (cross of Lorraine) so users can type either.
  const normalized = input;
  for (const rule of RULES) {
    const match = rule.pattern.exec(normalized);
    if (match) {
      try {
        return rule.run(match, session);
      } catch (err) {
        return [`INTERNAL ERROR - ${err instanceof Error ? err.message : String(err)}`];
      }
    }
  }
  return [`UNRECOGNIZED ENTRY - ${input.toUpperCase()}`, 'TYPE HLP FOR A COMMAND LIST'];
}
