// Thin adapter that keeps the old `executeMockCommand` / `TERMINAL_COMMANDS`
// exports for the existing terminal overlay, delegating to the new simulator
// module.  Response shape changes from `string` to `string[]` so callers
// render each line individually (matching how the Sabre host streams output).

import { executeTerminalCommand } from '@/lib/terminal';
export { TERMINAL_COMMANDS } from '@/lib/terminal';
export type { TerminalCommand } from '@/lib/terminal';

export function executeMockCommand(command: string): string[] {
  const normalized = command.trim();
  if (!normalized) return ['ENTER A SABRE COMMAND.'];
  return executeTerminalCommand(normalized);
}
