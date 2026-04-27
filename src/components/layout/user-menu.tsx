'use client';

import Link from 'next/link';
import { Settings, KeyRound, LogOut } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  initials: string;
  isDark: boolean;
}

export function UserMenu({ initials, isDark }: UserMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ring-1 select-none cursor-pointer transition-colors shadow-sm font-display',
            isDark
              ? 'bg-white text-slate-950 ring-white/[0.20] hover:bg-slate-100'
              : 'bg-white text-[#0A2540] ring-[#E2E8F0] hover:bg-[#F6F8FB]'
          )}
          aria-label="User menu"
        >
          {initials}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-48 p-1.5">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-foreground hover:bg-[#F6F8FB] transition-colors"
        >
          <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          Settings
        </Link>
        <Link
          href="/settings/credentials"
          className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-foreground hover:bg-[#F6F8FB] transition-colors"
        >
          <KeyRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          Credentials
        </Link>
        <div className="my-1 border-t border-border" />
        <button
          className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-muted-foreground hover:bg-[#F6F8FB] hover:text-foreground transition-colors"
          onClick={() => {/* sign out placeholder */}}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
