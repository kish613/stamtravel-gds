'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import 'xterm/css/xterm.css';
import { useAppStore } from '@/stores/app-store';
import { executeMockCommand, TERMINAL_COMMANDS } from '@/lib/commands/commands';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
      terminal.writeln('Welcome to Mock Sabre Terminal. Phase 3 live services available soon.');
      terminal.writeln('Type HLP for supported commands.');
      terminal.write(`${PROMPT} `);

      const onData = terminal.onData((data) => {
        if (data === '\r') {
          const currentLine = terminal.buffer.active.getLine(terminal.buffer.active.cursorY)?.translateToString() || '';
          const command = currentLine.replace(PROMPT, '').trim();
          const response = executeMockCommand(command);
          terminal.writeln('');
          terminal.writeln(response);
          terminal.write(`${PROMPT} `);
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

  useEffect(() => {
    historyRef.current = history;
    commandHistoryIndexRef.current = commandHistoryIndex;
  }, [history, commandHistoryIndex]);

  useEffect(() => {
    if (terminalDrawerOpen !== drawerOpen) {
      setDrawerOpen(terminalDrawerOpen);
    }
  }, [terminalDrawerOpen, drawerOpen]);

  if (!terminalOpen) return null;

  return (
    <div className="fixed left-0 right-0 bottom-0 h-[40vh] bg-[#0B1120] border-t border-[#1E293B] z-50 flex">
      <div className={cn('flex-1', drawerOpen ? 'w-3/4' : 'w-full')}>
        <div ref={terminalRef} className="h-full" />
      </div>
      <div className="w-[40px] border-l border-[#1E293B] flex items-start justify-center pt-2">
        <button
          className="rounded-full border border-[#334155] px-2 py-2 text-[#E2E8F0] hover:bg-[#17233D]"
          onClick={() => {
            setDrawerOpen((prev) => !prev);
            toggleTerminalDrawer();
          }}
          aria-label="toggle command reference"
        >
          ?
        </button>
      </div>
      {drawerOpen && (
        <aside className="w-1/4 border-l border-[#1E293B] bg-[#111827] p-3 overflow-y-auto">
          <Input
            placeholder="Search command"
            className="mb-2 bg-[#1F2937] text-[#E2E8F0] border-[#334155]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="space-y-3">
            {linesByGroup.map(([group, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="text-[11px] font-semibold uppercase text-[#94A3B8] mb-1">{group}</div>
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item.command} className="text-[12px] text-[#E2E8F0]">
                        <span className="font-medium">{item.command}</span> - {item.description}
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
  );
}
