'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BarChart3, Building2, CalendarDays, CreditCard, LayoutDashboard, ListTodo, MapPinned, Plane, ShoppingBag, Settings, Ticket, Menu, CircleHelp } from 'lucide-react';
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
  // Select primitives/actions individually to keep snapshot references stable
  // and avoid repeated external store rerenders in App Router.
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
    <div className="min-h-screen">
      {/* Header with gradient overlay and glass effect */}
      <header className="h-[var(--nav-height)] bg-gradient-to-r from-[#0A1628] via-[#0F1D32] to-[#0A1628] text-white flex items-center px-4 fixed top-0 left-0 right-0 z-40 border-b border-white/[0.06] backdrop-blur-xl shadow-[0_1px_24px_rgba(0,0,0,0.25)]">
        <div className="w-56 min-w-56 font-bold flex items-center gap-2">
          <span className="bg-gradient-to-r from-[#60A5FA] to-[#38BDF8] bg-clip-text text-transparent">Sabre GDS</span>
        </div>
        <div className="flex-1 text-sm text-center text-[#94A3B8] flex items-center justify-center gap-2">
          {/* Online status glowing dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          </span>
          Agent: Jordan Ellis · PCC: 901
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg p-1.5 hover:bg-white/[0.06] transition-colors duration-200" aria-label="notifications">
            <Bell className="h-4 w-4" />
          </button>
          <button className="rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#172946] text-xs h-8 w-8 ring-1 ring-white/[0.08] hover:ring-white/[0.15] transition-all duration-200">JE</button>
        </div>
      </header>

      <div className="pt-[var(--nav-height)] flex min-h-screen">
        {/* Sidebar with vertical gradient and glass border */}
        <aside className={cn('fixed left-0 top-[var(--nav-height)] bottom-0 z-30 bg-gradient-to-b from-[#0A1628] to-[#0D1B2E] text-white border-r border-white/[0.06]', sidebarWidth, 'transition-all duration-300 ease-in-out') }>
          <nav className="py-3 flex flex-col gap-0.5">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#64748B] font-medium">{collapsed ? '' : 'Navigation'}</div>
            {/* Subtle separator */}
            <div className="mx-3 mb-1 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'group mx-1.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-200 relative',
                    active
                      ? 'bg-white/[0.07] text-white shadow-[0_0_12px_rgba(96,165,250,0.08)]'
                      : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-white hover:shadow-[0_0_8px_rgba(96,165,250,0.04)]'
                  )}
                  onClick={() => {
                    if (item.path === '/terminal') {
                      toggleTerminal();
                    }
                  }}
                >
                  {/* Active left accent bar */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-[#60A5FA] to-[#22D3EE] shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                  )}
                  <Icon className={cn('h-4 w-4 flex-shrink-0', active && 'text-[#60A5FA]')} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          {/* Bottom separator and collapse button */}
          <div className="absolute right-2 bottom-3">
            <div className="mx-2 mb-2 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            <button
              className="rounded-lg p-2 hover:bg-white/[0.06] transition-colors duration-200 text-[#94A3B8] hover:text-white"
              aria-label="collapse nav"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <main className={cn('flex-1 min-h-[calc(100vh-var(--nav-height))]', collapsed ? 'ml-14' : 'ml-56', 'transition-all duration-300 ease-in-out')}>
          <div className="p-6">{children}</div>
        </main>
      </div>

      <TerminalPanel />
    </div>
  );
}
