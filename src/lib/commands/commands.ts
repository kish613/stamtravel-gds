export interface TerminalCommand {
  command: string;
  description: string;
  category: 'Availability' | 'Fare Display' | 'Selling' | 'PNR Fields' | 'SSR Codes' | 'Ticketing' | 'Queue' | 'Hotel and Car' | 'Utility';
}

export const TERMINAL_COMMANDS: TerminalCommand[] = [
  { command: 'WPN', description: 'Display worked PNR', category: 'PNR Fields' },
  { command: 'WPA', description: 'Display air segment details', category: 'PNR Fields' },
  { command: 'FQD', description: 'Queue summary command', category: 'Queue' },
  { command: 'PNL', description: 'PNR list for office', category: 'Queue' },
  { command: 'AV', description: 'Air availability search', category: 'Availability' },
  { command: 'FD', description: 'Fare display with fare brands', category: 'Fare Display' },
  { command: 'FQ', description: 'Search fares by fare family', category: 'Fare Display' },
  { command: 'ADDO', description: 'Add SSR to itinerary', category: 'Selling' },
  { command: 'RFIC', description: 'Cancel booked SSR', category: 'Selling' },
  { command: 'SSR', description: 'Attach special service request', category: 'SSR Codes' },
  { command: 'TT', description: 'Create ticket time limit', category: 'Ticketing' },
  { command: 'TKTL', description: 'Ticketing queue monitor', category: 'Ticketing' },
  { command: 'HBEG', description: 'Hotel begin booking', category: 'Hotel and Car' },
  { command: 'HPA', description: 'Hotel property availability', category: 'Hotel and Car' },
  { command: 'CARS', description: 'Car search rates', category: 'Hotel and Car' },
  { command: 'HLP', description: 'Show help information', category: 'Utility' },
  { command: 'IGT', description: 'Issue ticket', category: 'Utility' }
];

export function executeMockCommand(command: string) {
  const normalized = command.trim().toUpperCase();
  if (!normalized) return 'Enter a Sabre command.';
  if (normalized === 'HLP') return 'Commands supported: ' + TERMINAL_COMMANDS.map((c) => c.command).join(', ');
  return 'Live Sabre integration is coming in Phase 3 for this command.';
}
