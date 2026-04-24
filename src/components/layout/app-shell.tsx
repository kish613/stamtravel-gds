'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BarChart3, ListTodo, Moon, Plane, Settings, Sun, Ticket, Menu, TerminalSquare, Radar, LucideIcon } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { TerminalPanel } from '@/components/terminal/terminal-overlay';
import { cn } from '@/lib/utils';

type NavItem = { path: string; label: string; icon: LucideIcon; matchPrefix?: string };

const NAV: NavItem[] = [
  { path: '/mission-control', label: 'Mission Control', icon: Radar },
  { path: '/search/air', label: 'Search', icon: Plane, matchPrefix: '/search' },
  { path: '/bookings', label: 'Bookings', icon: Ticket, matchPrefix: '/bookings' },
  { path: '/queues', label: 'Queues', icon: ListTodo },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const toggleTerminal = useAppStore((state) => state.toggleTerminal);
  const dashboardTheme = useAppStore((state) => state.dashboardTheme);
  const toggleDashboardTheme = useAppStore((state) => state.toggleDashboardTheme);
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
  const isDashboardRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  const isDashboardDark = isDashboardRoute && dashboardTheme === 'dark';

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 border-r transition-all duration-300 ease-in-out flex flex-col',
          isDashboardDark ? 'bg-black border-white/[0.10]' : 'bg-white border-slate-100',
          sidebarWidth
        )}
      >
        <div className="h-[var(--nav-height)] flex items-center px-6 font-bold mt-2">
          <span
            className={cn(
              'tracking-tight text-xl font-black',
              isDashboardDark ? 'text-white' : 'text-slate-900',
              collapsed && 'hidden'
            )}
          >
            Sabre GDS
          </span>
          {collapsed && (
            <span className={cn('tracking-tight font-black mx-auto text-xl', isDashboardDark ? 'text-white' : 'text-slate-900')}>
              S
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto px-4">
          {!collapsed && (
            <p
              className={cn(
                'px-2 py-2 text-[11px] uppercase tracking-wider font-semibold mt-2 mb-1',
                isDashboardDark ? 'text-white/[0.62]' : 'text-slate-400'
              )}
            >
              Main Menu
            </p>
          )}
          {NAV.map((item) => {
            const Icon = item.icon;
            const prefix = item.matchPrefix ?? item.path;
            const active = pathname === prefix || pathname.startsWith(prefix + '/');
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-all font-medium',
                  active
                    ? isDashboardDark
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'bg-slate-50 text-slate-900'
                    : isDashboardDark
                      ? 'text-white/[0.88] hover:bg-white/[0.10] hover:text-white'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                    active
                      ? 'text-amber-400 fill-amber-400/20'
                      : isDashboardDark
                        ? 'text-white/[0.72] group-hover:text-white'
                        : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn('p-4 border-t flex flex-col gap-1', isDashboardDark ? 'border-white/[0.10]' : 'border-slate-200')}>
          <button
            onClick={toggleTerminal}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors',
              isDashboardDark ? 'text-white/[0.88] hover:bg-white/[0.10] hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              collapsed && 'justify-center px-0'
            )}
            aria-label="Open terminal"
          >
            <TerminalSquare
              className={cn(
                'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                isDashboardDark ? 'text-white/[0.72] group-hover:text-white' : 'text-slate-400 group-hover:text-slate-600'
              )}
            />
            {!collapsed && <span>Terminal</span>}
          </button>

          <button
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors',
              isDashboardDark ? 'text-white/[0.88] hover:bg-white/[0.10] hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              collapsed && 'justify-center px-0'
            )}
            aria-label="collapse nav"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <Menu className={cn('h-[18px] w-[18px] flex-shrink-0', isDashboardDark ? 'text-white/[0.72] group-hover:text-white' : 'text-slate-400 group-hover:text-slate-600')} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out',
          isDashboardDark ? 'bg-black' : 'bg-[#f4f4f5]',
          collapsed ? 'pl-14' : 'pl-56'
        )}
      >
        <header
          className={cn(
            'h-[var(--nav-height)] backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8 border-b shadow-sm',
            isDashboardDark ? 'bg-black/[0.92] border-white/[0.10]' : 'bg-[#f4f4f5]/90 border-slate-200'
          )}
        >
          <div className={cn('flex-1 text-sm flex items-center gap-2 font-medium', isDashboardDark ? 'text-white/[0.60]' : 'text-slate-500')}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Agent: Jordan Ellis · PCC: 901
          </div>
          <div className="flex items-center gap-4">
            {isDashboardRoute && (
              <button
                onClick={toggleDashboardTheme}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-semibold transition-colors',
                  isDashboardDark
                    ? 'border-white/[0.15] bg-white text-slate-950 hover:bg-slate-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                )}
                aria-label={`Switch to ${isDashboardDark ? 'light' : 'dark'} mode`}
              >
                {isDashboardDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDashboardDark ? 'Light mode' : 'Dark mode'}
              </button>
            )}
            <button
              className={cn(
                'rounded-full p-2 transition-colors',
                isDashboardDark
                  ? 'text-white/[0.55] hover:text-white hover:bg-white/[0.10]'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-white'
              )}
              aria-label="notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ring-1 select-none cursor-pointer transition-colors shadow-sm',
                isDashboardDark
                  ? 'bg-white text-slate-950 ring-white/[0.20] hover:bg-slate-100'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
              )}
            >
              JE
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-6 w-full max-w-6xl mx-auto">
          {children}
        </main>
      </div>

      <TerminalPanel />
    </div>
  );
}
