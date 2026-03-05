'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BarChart3, CircleHelp, LayoutDashboard, ListTodo, Plane, Settings, Ticket, Menu } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { TerminalPanel } from '@/components/terminal/terminal-overlay';
import { cn } from '@/lib/utils';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/search/air', label: 'Search', icon: Plane },
  { path: '/bookings', label: 'Bookings', icon: Ticket },
  { path: '/queues', label: 'Queues', icon: ListTodo },
  { path: '/terminal', label: 'Terminal', icon: CircleHelp },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const toggleTerminal = useAppStore((state) => state.toggleTerminal);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 980);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.code === 'Backquote') {
        event.preventDefault();
        toggleTerminal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleTerminal]);

  const sidebarWidth = collapsed ? 'w-14' : 'w-56';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header — flat slate-900, no gradient */}
      <header className="h-[var(--nav-height)] bg-slate-900 text-white flex items-center px-4 fixed top-0 left-0 right-0 z-40 border-b border-slate-800">
        <div className="w-56 min-w-56 font-bold flex items-center gap-2">
          <span className="text-white tracking-tight">Sabre GDS</span>
        </div>
        <div className="flex-1 text-sm text-center text-slate-400 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          Agent: Jordan Ellis · PCC: 901
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white ring-1 ring-slate-600 select-none">
            JE
          </div>
        </div>
      </header>

      <div className="pt-[var(--nav-height)] flex min-h-screen">
        {/* Sidebar — flat slate-900, right border only */}
        <aside
          className={cn(
            'fixed left-0 top-[var(--nav-height)] bottom-0 z-30 bg-slate-900 text-white border-r border-slate-800 transition-all duration-300 ease-in-out',
            sidebarWidth
          )}
        >
          <nav className="py-3 flex flex-col gap-0.5">
            {!collapsed && (
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                Navigation
              </p>
            )}
            <div className="mx-3 mb-1 h-px bg-slate-800" />
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'group mx-1.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors relative',
                    active
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                  onClick={() => {
                    if (item.path === '/terminal') toggleTerminal();
                  }}
                >
                  {/* Active left accent */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sky-400" />
                  )}
                  <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-sky-400' : '')} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Collapse toggle */}
          <div className="absolute right-2 bottom-3">
            <button
              className="rounded-md p-2 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="collapse nav"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <main
          className={cn(
            'flex-1 min-h-[calc(100vh-var(--nav-height))]',
            collapsed ? 'ml-14' : 'ml-56',
            'transition-all duration-300 ease-in-out'
          )}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>

      <TerminalPanel />
    </div>
  );
}
