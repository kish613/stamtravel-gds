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
      <header className="h-[var(--nav-height)] bg-[#0A1628] text-white flex items-center px-4 fixed top-0 left-0 right-0 z-40">
        <div className="w-56 min-w-56 font-bold">Sabre GDS</div>
        <div className="flex-1 text-sm text-center text-[#94A3B8]">Agent: Jordan Ellis · PCC: 901</div>
        <div className="flex items-center gap-2">
          <button className="rounded p-1 hover:bg-[#172946]" aria-label="notifications">
            <Bell className="h-4 w-4" />
          </button>
          <button className="rounded-full bg-[#172946] text-xs h-8 w-8">JE</button>
        </div>
      </header>

      <div className="pt-[var(--nav-height)] flex min-h-screen">
        <aside className={cn('fixed left-0 top-[var(--nav-height)] bottom-0 z-30 bg-[#0A1628] text-white', sidebarWidth, 'transition-all duration-150') }>
          <nav className="py-2 flex flex-col gap-1">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[#94A3B8]">{collapsed ? '' : 'Navigation'}</div>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'group mx-1 flex items-center gap-2 rounded px-2 py-2 text-[13px]',
                    active ? 'bg-[#162C4F]' : 'hover:bg-[#122744]'
                  )}
                  onClick={() => {
                    if (item.path === '/terminal') {
                      toggleTerminal();
                    }
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="absolute right-2 bottom-2">
            <button
              className="rounded p-2 hover:bg-[#122744]"
              aria-label="collapse nav"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <main className={cn('flex-1 min-h-[calc(100vh-var(--nav-height))]', collapsed ? 'ml-14' : 'ml-56')}>
          <div className="p-4">{children}</div>
        </main>
      </div>

      <TerminalPanel />
    </div>
  );
}
