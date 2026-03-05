'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BarChart3, LayoutDashboard, ListTodo, Plane, Settings, Ticket, Menu, TerminalSquare, LucideIcon } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { TerminalPanel } from '@/components/terminal/terminal-overlay';
import { cn } from '@/lib/utils';

type NavItem = { path: string; label: string; icon: LucideIcon; matchPrefix?: string };

const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/search/air', label: 'Search', icon: Plane, matchPrefix: '/search' },
  { path: '/bookings', label: 'Bookings', icon: Ticket, matchPrefix: '/bookings' },
  { path: '/queues', label: 'Queues', icon: ListTodo },
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
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar — Full height, Light Mode */}
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-slate-100 transition-all duration-300 ease-in-out flex flex-col',
          sidebarWidth
        )}
      >
        {/* Logo area */}
        <div className="h-[var(--nav-height)] flex items-center px-6 font-bold mt-2">
          <span className={cn("text-slate-900 tracking-tight text-xl font-black", collapsed && "hidden")}>Sabre GDS</span>
          {collapsed && <span className="text-slate-900 tracking-tight font-black mx-auto text-xl">S</span>}
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto px-4">
          {!collapsed && (
            <p className="px-2 py-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold mt-2 mb-1">
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
                    ? 'bg-slate-50 text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className={cn('h-[18px] w-[18px] flex-shrink-0 transition-colors', active ? 'text-amber-400 fill-amber-400/20' : 'text-slate-400 group-hover:text-slate-600')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Terminal button & Collapse in Footer area */}
        <div className="p-4 border-t border-slate-200 flex flex-col gap-1">
          <button
            onClick={toggleTerminal}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors",
              collapsed && "justify-center px-0"
            )}
            aria-label="Open terminal"
          >
            <TerminalSquare className={cn("h-[18px] w-[18px] flex-shrink-0 text-slate-400 transition-colors group-hover:text-slate-600")} />
            {!collapsed && <span>Terminal</span>}
          </button>

          <button
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors",
              collapsed && "justify-center px-0"
            )}
            aria-label="collapse nav"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <Menu className="h-[18px] w-[18px] flex-shrink-0 text-slate-400 group-hover:text-slate-600" />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out bg-[#f4f4f5]',
          collapsed ? 'pl-14' : 'pl-56'
        )}
      >
        {/* Header - Transparent/Floaty */}
        <header className="h-[var(--nav-height)] bg-[#f4f4f5]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8 border-b border-slate-200 shadow-sm">
          <div className="flex-1 text-sm text-slate-500 flex items-center gap-2 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Agent: Jordan Ellis · PCC: 901
          </div>
          <div className="flex items-center gap-4">
            <button
              className="rounded-full p-2 text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
              aria-label="notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200 select-none cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
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
