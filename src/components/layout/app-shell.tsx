'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BarChart3, ListTodo, Map as MapIcon, Moon, Plane, Settings, Sun, Ticket, Menu, TerminalSquare, Radar, LucideIcon } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { TerminalPanel } from '@/components/terminal/terminal-overlay';
import { useFlightAlerts } from '@/lib/query';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className="font-display font-extrabold tracking-tight text-[20px] leading-none select-none"
      style={{ color: dark ? '#FFFFFF' : '#0A2540' }}
    >
      GDS<span className="font-medium" style={{ color: '#25A5B4' }}>imple</span>
    </span>
  );
}

type NavItem = { path: string; label: string; icon: LucideIcon; matchPrefix?: string };

const NAV: NavItem[] = [
  { path: '/mission-control', label: 'Mission Control', icon: Radar },
  { path: '/search/air', label: 'Search', icon: Plane, matchPrefix: '/search' },
  { path: '/bookings', label: 'Bookings', icon: Ticket, matchPrefix: '/bookings' },
  { path: '/map', label: 'Map', icon: MapIcon },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/queues', label: 'Queues', icon: ListTodo },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const toggleTerminal = useAppStore((state) => state.toggleTerminal);
  const dashboardTheme = useAppStore((state) => state.dashboardTheme);
  const toggleDashboardTheme = useAppStore((state) => state.toggleDashboardTheme);
  const notificationsLastSeenAt = useAppStore((state) => state.notificationsLastSeenAt);
  const { data: flightAlerts } = useFlightAlerts();
  const [collapsed, setCollapsed] = useState(false);

  const unreadCount = (() => {
    if (!flightAlerts || flightAlerts.length === 0) return 0;
    if (!notificationsLastSeenAt) return flightAlerts.length;
    const cutoff = Date.parse(notificationsLastSeenAt);
    return flightAlerts.filter((a) => Date.parse(a.createdAt) > cutoff).length;
  })();

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
  const isMissionControlRoute = pathname === '/mission-control' || pathname.startsWith('/mission-control/');
  const showLogomark = isMissionControlRoute || isDashboardRoute;
  const isDashboardDark = isDashboardRoute && dashboardTheme === 'dark';
  const logomarkSrc = isDashboardDark ? '/brand/logomark-on-dark.svg' : '/brand/logomark.svg';

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-40 border-r transition-all duration-300 ease-in-out flex flex-col',
          isDashboardDark ? 'bg-black border-white/[0.10]' : 'bg-white border-[#EEF2F7]',
          sidebarWidth
        )}
      >
        <div className={cn('h-[var(--nav-height)] flex items-center mt-2', collapsed ? 'justify-center px-0' : 'px-5 gap-2')}>
          {showLogomark && (
            <Image
              src={logomarkSrc}
              alt="GDSimple"
              width={28}
              height={28}
              priority
              className="h-7 w-7 flex-shrink-0"
            />
          )}
          {collapsed ? (
            !showLogomark && (
              <Image
                src={logomarkSrc}
                alt="GDSimple"
                width={28}
                height={28}
                priority
                className="h-7 w-7"
              />
            )
          ) : (
            <Wordmark dark={isDashboardDark} />
          )}
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto px-4">
          {!collapsed && (
            <p
              className={cn(
                'px-2 py-2 text-[11px] uppercase tracking-[0.14em] font-bold mt-2 mb-1',
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
            const showUnread =
              item.path === '/notifications' && !active && unreadCount > 0;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-all font-medium',
                  active
                    ? isDashboardDark
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'bg-[#E4F5F7] text-[#0A2540]'
                    : isDashboardDark
                      ? 'text-white/[0.88] hover:bg-white/[0.10] hover:text-white'
                      : 'text-slate-500 hover:bg-[#F6F8FB] hover:text-[#0A2540]'
                )}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                    active
                      ? 'text-[#25A5B4]'
                      : isDashboardDark
                        ? 'text-white/[0.72] group-hover:text-white'
                        : 'text-slate-400 group-hover:text-[#475569]'
                  )}
                />
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between gap-2">
                    <span>{item.label}</span>
                    {showUnread && (
                      <Badge variant="danger" className="tabular-nums">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn('p-4 border-t flex flex-col gap-1', isDashboardDark ? 'border-white/[0.10]' : 'border-[#EEF2F7]')}>
          <button
            onClick={toggleTerminal}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors',
              isDashboardDark ? 'text-white/[0.88] hover:bg-white/[0.10] hover:text-white' : 'text-slate-500 hover:bg-[#F6F8FB] hover:text-[#0A2540]',
              collapsed && 'justify-center px-0'
            )}
            aria-label="Open terminal"
          >
            <TerminalSquare
              className={cn(
                'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                isDashboardDark ? 'text-white/[0.72] group-hover:text-white' : 'text-slate-400 group-hover:text-[#475569]'
              )}
            />
            {!collapsed && <span>Terminal</span>}
          </button>

          <button
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors',
              isDashboardDark ? 'text-white/[0.88] hover:bg-white/[0.10] hover:text-white' : 'text-slate-500 hover:bg-[#F6F8FB] hover:text-[#0A2540]',
              collapsed && 'justify-center px-0'
            )}
            aria-label="collapse nav"
            onClick={() => setCollapsed((prev) => !prev)}
          >
            <Menu className={cn('h-[18px] w-[18px] flex-shrink-0', isDashboardDark ? 'text-white/[0.72] group-hover:text-white' : 'text-slate-400 group-hover:text-[#475569]')} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out',
          isDashboardDark ? 'bg-black' : 'bg-background',
          collapsed ? 'pl-14' : 'pl-56'
        )}
      >
        <header
          className={cn(
            'h-[var(--nav-height)] backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-8 border-b shadow-sm',
            isDashboardDark ? 'bg-black/[0.92] border-white/[0.10]' : 'bg-[#F6F8FB]/90 border-[#E2E8F0]'
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
                'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ring-1 select-none cursor-pointer transition-colors shadow-sm font-display',
                isDashboardDark
                  ? 'bg-white text-slate-950 ring-white/[0.20] hover:bg-slate-100'
                  : 'bg-white text-[#0A2540] ring-[#E2E8F0] hover:bg-[#F6F8FB]'
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
