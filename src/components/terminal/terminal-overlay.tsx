'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'xterm/css/xterm.css';
import { useAppStore } from '@/stores/app-store';
import { TerminalSquare } from 'lucide-react';
import { executeMockCommand, TERMINAL_COMMANDS } from '@/lib/commands/commands';
import { flags } from '@/lib/sabre/flags';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const runCommand = async (command: string): Promise<string[]> => {
  if (!flags.terminal) return executeMockCommand(command);
  const res = await fetch('/api/sabre/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return [`[sabre error] ${body?.error ?? res.status}`];
  }
  const { screen } = (await res.json()) as { screen: string };
  return screen.split('\n').map((l) => l.replace(/\r/g, ''));
};

type XTermApi = {
  open: (el: HTMLDivElement) => void;
  focus: () => void;
  writeln: (value: string) => void;
  write: (value: string) => void;
  onData: (callback: (data: string) => void) => { dispose: () => void };
  dispose: () => void;
  buffer: { active: { cursorY: number; getLine: (index: number) => { translateToString: () => string } | undefined } };
};

const PROMPT = 'SABRE>';

export function TerminalPanel() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTermApi | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState<number>(-1);
  const [search, setSearch] = useState('');
  const historyRef = useRef<string[]>([]);
  const commandHistoryIndexRef = useRef<number>(-1);

  const terminalOpen = useAppStore((state) => state.terminalOpen);
  const toggleTerminal = useAppStore((state) => state.toggleTerminal);
  const terminalDrawerOpen = useAppStore((state) => state.terminalDrawerOpen);
  const toggleTerminalDrawer = useAppStore((state) => state.toggleTerminalDrawer);

  const categories = useMemo(() => {
    const grouped: Record<string, typeof TERMINAL_COMMANDS> = {};
    for (const cmd of TERMINAL_COMMANDS) {
      grouped[cmd.category] = grouped[cmd.category] || [];
      grouped[cmd.category].push(cmd);
    }
    return grouped;
  }, []);

  const linesByGroup = useMemo(
    () =>
      Object.entries(categories).map(([name, commands]) => [
        name,
        commands.filter(
          (item) =>
            item.command.toLowerCase().includes(search.toLowerCase()) ||
            item.description.toLowerCase().includes(search.toLowerCase())
        )
      ] as const),
    [categories, search]
  );

  useEffect(() => {
    if (!terminalOpen || !terminalRef.current || xtermRef.current) return;

    let disposed = false;
    let terminalInstance: XTermApi | null = null;

    const create = async () => {
      const xterm = await import('xterm');
      if (disposed || !terminalRef.current) return;

      const terminal = new xterm.Terminal({
        fontFamily: 'JetBrains Mono',
        theme: {
          background: '#0B1120',
          foreground: '#E2E8F0',
          cursor: '#38BDF8'
        },
        fontSize: 13
      }) as XTermApi;

      terminalInstance = terminal;
      xtermRef.current = terminal;
      terminal.open(terminalRef.current);
      terminal.focus();
      terminal.writeln('SABRE GDS MOCK TERMINAL - PCC A0UC - AGENT ASC');
      terminal.writeln('Type HLP for commands.  Try: QC/  then  Q/9  then  *R  then  WP');
      terminal.writeln('Shortcut:  # is accepted as ‡ (cross of Lorraine).');
      terminal.write(`${PROMPT} `);

      const onData = terminal.onData((data) => {
        if (data === '\r') {
          const currentLine = terminal.buffer.active.getLine(terminal.buffer.active.cursorY)?.translateToString() || '';
          const command = currentLine.replace(PROMPT, '').trim();
          terminal.writeln('');
          runCommand(command).then((response) => {
            for (const line of response) {
              terminal.writeln(line);
            }
            terminal.write(`${PROMPT} `);
          });
          if (command) {
            setHistory((prev) => {
              const next = [command, ...prev.slice(0, 49)];
              historyRef.current = next;
              return next;
            });
            setCommandHistoryIndex(-1);
            commandHistoryIndexRef.current = -1;
          }
          return;
        }

        if (data === '\u007f') {
          terminal.write('\b \b');
          return;
        }

        if (data === '\u001b[A') {
          const next = historyRef.current[Math.min(historyRef.current.length - 1, commandHistoryIndexRef.current + 1)];
          if (!next) return;
          commandHistoryIndexRef.current = Math.min(commandHistoryIndexRef.current + 1, historyRef.current.length - 1);
          setCommandHistoryIndex(commandHistoryIndexRef.current);
          terminal.write(`\x1b[2K\r${PROMPT} ${next}`);
          return;
        }

        if (data === '\u001b[B') {
          const prev = historyRef.current[Math.max(0, commandHistoryIndexRef.current - 1)];
          if (!prev) return;
          commandHistoryIndexRef.current = Math.max(commandHistoryIndexRef.current - 1, 0);
          setCommandHistoryIndex(commandHistoryIndexRef.current);
          terminal.write(`\x1b[2K\r${PROMPT} ${prev}`);
          return;
        }

        terminal.write(data);
      });

      return () => {
        onData.dispose();
        terminal.dispose();
      };
    };

    void create();

    return () => {
      disposed = true;
      terminalInstance?.dispose();
      xtermRef.current = null;
      terminalInstance = null;
    };
  }, [terminalOpen]);

  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    historyRef.current = history;
    commandHistoryIndexRef.current = commandHistoryIndex;
  }, [history, commandHistoryIndex]);

  useEffect(() => {
    if (terminalDrawerOpen !== drawerOpen) {
      setDrawerOpen(terminalDrawerOpen);
    }
  }, [terminalDrawerOpen, drawerOpen]);

  return (
    <AnimatePresence>
      {terminalOpen && (
        <>
          {isMinimized ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              className="fixed bottom-6 right-6 z-50 pointer-events-auto"
            >
              <motion.button
                layoutId="terminal-window"
                onClick={() => setIsMinimized(false)}
                className="bg-slate-900 border border-slate-700 text-white rounded-full px-5 py-3 shadow-2xl flex items-center gap-3 hover:bg-slate-800 transition-colors flex-shrink-0"
                style={{ originX: 0.5, originY: 0.5 }}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-sm whitespace-nowrap">Terminal Running...</span>
              </motion.button>
            </motion.div>
          ) : (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto"
                onClick={() => toggleTerminal()}
              />

              {/* Main Window */}
              <motion.div
                layoutId="terminal-window"
                className="bg-[#0B1120] border border-slate-700 w-full max-w-4xl h-[70vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative z-10 pointer-events-auto"
                style={{ originX: 0.5, originY: 0.5 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              >

                {/* Title Bar */}
                <div className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 select-none shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2 mr-4">
                      <button onClick={toggleTerminal} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors" aria-label="Close" />
                      <button onClick={() => setIsMinimized(true)} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors" aria-label="Minimize" />
                      <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors" aria-label="Maximize" />
                    </div>
                    <span className="text-slate-400 font-semibold text-[13px] font-mono flex items-center gap-2">
                      <TerminalSquare className="w-4 h-4" /> root@sabre-gds:~
                    </span>
                  </div>

                  <button
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-md font-medium transition-colors border",
                      drawerOpen ? "bg-slate-800 text-white border-slate-700" : "bg-transparent text-slate-500 border-transparent hover:bg-slate-800 hover:text-white"
                    )}
                    onClick={() => {
                      setDrawerOpen((prev) => !prev);
                      toggleTerminalDrawer();
                    }}
                  >
                    Command Reference
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex overflow-hidden relative">
                  <div className={cn('flex-1 transition-all p-2', drawerOpen ? 'w-2/3' : 'w-full')}>
                    <div ref={terminalRef} className="h-full w-full" />
                  </div>

                  {drawerOpen && (
                    <aside className="w-1/3 border-l border-[#1E293B] bg-[#111827] p-4 flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-200">
                      <Input
                        placeholder="Search commands..."
                        className="mb-4 bg-[#1F2937] text-[#E2E8F0] border-[#334155] focus-visible:ring-1 focus-visible:ring-emerald-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {linesByGroup.map(([group, items]) => {
                          if (items.length === 0) return null;
                          return (
                            <div key={group}>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{group}</div>
                              <ul className="space-y-1.5">
                                {items.map((item) => (
                                  <li key={item.command} className="text-[12px] text-[#E2E8F0] bg-[#1F2937]/50 rounded px-2 py-1 border border-[#334155]/50">
                                    <span className="font-mono text-emerald-400 mr-2">{item.command}</span>
                                    <span className="text-slate-400">{item.description}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </aside>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
