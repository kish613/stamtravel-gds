export interface TerminalCommand {
  command: string;
  description: string;
  category:
    | 'Availability'
    | 'Fare Display'
    | 'Selling'
    | 'PNR Fields'
    | 'SSR Codes'
    | 'Ticketing'
    | 'Queue'
    | 'Hotel and Car'
    | 'Utility';
}

export const TERMINAL_COMMANDS: TerminalCommand[] = [
  { command: 'HLP', description: 'Show supported Sabre v1 command shortcuts', category: 'Utility' },
  { command: 'CAPS', description: 'Show Sabre capability gate and connectivity status', category: 'Utility' },
  { command: 'WPN', description: 'Display booking summary by locator', category: 'PNR Fields' },
  { command: 'WPA', description: 'Display segment detail by locator', category: 'PNR Fields' },
  { command: 'AV', description: 'Refer back to air shopping in the web workflow', category: 'Availability' },
  { command: 'FQD', description: 'Queue summary by queue code', category: 'Queue' },
  { command: 'PNL', description: 'List queue counts across active buckets', category: 'Queue' },
  { command: 'TKTL', description: 'Show ticketing queue summary', category: 'Ticketing' },
  { command: 'IGT', description: 'Issue ticket for a locator', category: 'Ticketing' },
  { command: 'SSR', description: 'Review supported SSR capture in the booking wizard', category: 'SSR Codes' },
  { command: 'HBEG', description: 'Hotel booking is intentionally disabled in v1', category: 'Hotel and Car' },
  { command: 'CARS', description: 'Car booking is intentionally disabled in v1', category: 'Hotel and Car' }
];

export async function executeTerminalCommand(command: string) {
  const normalized = command.trim();
  if (!normalized) return 'Enter a Sabre command.';

  const response = await fetch('/api/mock/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: normalized })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => 'Command execution failed.');
    throw new Error(message || 'Command execution failed.');
  }

  const payload = (await response.json()) as { output: string; warnings?: string[] };
  if (!payload.warnings?.length) return payload.output;
  return `${payload.output}\n\nWarnings:\n${payload.warnings.map((warning) => `- ${warning}`).join('\n')}`;
}
