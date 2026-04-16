// Public entry point for the Sabre mock terminal.  The overlay component
// calls `executeTerminalCommand` with the raw input string and renders the
// returned array of lines verbatim.

export { dispatch as executeTerminalCommand } from './parser';
export { TERMINAL_COMMANDS } from './handlers/command-list';
export type { TerminalCommand } from './handlers/command-list';
export { getSession, resetSession } from './session';
