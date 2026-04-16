// User-facing command directory used by the Command Reference drawer and by
// the HLP response.  Descriptions are intentionally short so they fit the
// narrow sidebar and the monospaced help output.

export interface TerminalCommand {
  command: string;
  description: string;
  category:
    | 'Queue'
    | 'PNR'
    | 'Availability'
    | 'Selling'
    | 'Pricing'
    | 'Ticketing'
    | 'SSR'
    | 'Transaction'
    | 'Utility';
}

export const TERMINAL_COMMANDS: TerminalCommand[] = [
  // Queue
  { command: 'QC/', description: 'Queue count (all queues)', category: 'Queue' },
  { command: 'QC/9', description: 'Queue count for Q9', category: 'Queue' },
  { command: 'Q/9', description: 'Enter queue 9, load first PNR', category: 'Queue' },
  { command: 'QP/500/11', description: 'Place current PNR on Q500 with PIC 11', category: 'Queue' },
  { command: 'QR', description: 'Remove current item from queue', category: 'Queue' },
  { command: 'QXI', description: 'Exit queue without removing item', category: 'Queue' },
  { command: 'I', description: 'Next item in queue (or ignore)', category: 'Queue' },

  // PNR retrieval & display
  { command: '*AAC00', description: 'Retrieve PNR by locator', category: 'PNR' },
  { command: '*-SMITH', description: 'Retrieve PNR by surname', category: 'PNR' },
  { command: '*R', description: 'Display full PNR', category: 'PNR' },
  { command: '*I', description: 'Display itinerary only', category: 'PNR' },
  { command: '*N', description: 'Display names only', category: 'PNR' },
  { command: '*P', description: 'Display phone fields', category: 'PNR' },
  { command: '*H', description: 'Display history', category: 'PNR' },
  { command: '*PQ', description: 'Display stored price quote', category: 'PNR' },
  { command: '*T', description: 'Display ticket time limit', category: 'PNR' },
  { command: '*B', description: 'Display reserved seats', category: 'PNR' },

  // Availability
  { command: '130JUNLHRJFK', description: 'Availability LHR-JFK on 30JUN', category: 'Availability' },
  { command: 'VA*1', description: 'Flight details for availability line 1', category: 'Availability' },

  // Selling
  { command: '01Y3', description: 'Sell line 1, Y class, 3 seats', category: 'Selling' },
  { command: '-SMITH/JOHN MR', description: 'Add passenger name', category: 'Selling' },
  { command: '9-020712345678', description: 'Add phone', category: 'Selling' },
  { command: '6-PAX', description: 'Received-from entry', category: 'Selling' },
  { command: '5-REMARK TEXT', description: 'Add free-text remark', category: 'Selling' },
  { command: '7TAW16APR/', description: 'Set ticket time limit', category: 'Selling' },

  // Pricing
  { command: 'WP', description: 'Price & store', category: 'Pricing' },
  { command: 'WPNC', description: 'Price without storing', category: 'Pricing' },
  { command: 'WP*', description: 'Redisplay last stored price', category: 'Pricing' },

  // Ticketing
  { command: 'W‡APK‡FCASH‡KP0', description: 'Issue ticket (use # as ‡ shortcut)', category: 'Ticketing' },
  { command: 'W#FCASH', description: 'Issue ticket, cash form of payment', category: 'Ticketing' },

  // SSR
  { command: '3DOCS/P/...', description: 'Add APIS/DOCS info', category: 'SSR' },
  { command: '3VGML-1.1', description: 'Vegetarian meal for pax 1.1', category: 'SSR' },

  // Transaction
  { command: 'ER', description: 'End transaction & retrieve', category: 'Transaction' },
  { command: 'E', description: 'End transaction', category: 'Transaction' },
  { command: 'I', description: 'Ignore changes (outside queue)', category: 'Transaction' },
  { command: 'IR', description: 'Ignore and retrieve PNR', category: 'Transaction' },

  // Utility
  { command: 'DC‡USD100/EUR', description: 'Convert USD 100 to EUR', category: 'Utility' },
  { command: 'HLP', description: 'Help - list commands', category: 'Utility' },
];
