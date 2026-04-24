'use client';

import { FormEvent, useState } from 'react';
import { useAppStore } from '@/stores/app-store';

export function CommandBar() {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const openTerminalWithCommand = useAppStore((s) => s.openTerminalWithCommand);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cmd = value.trim().toUpperCase();
    if (!cmd) {
      // empty submit → just open the terminal
      useAppStore.setState({ terminalOpen: true, terminalDrawerOpen: false });
      return;
    }
    openTerminalWithCommand(cmd);
    setValue('');
  };

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 12,
        background: '#0A0D14',
        border: '1px solid ' + (focused ? '#25A5B4' : 'rgba(37,165,180,0.25)'),
        boxShadow: focused
          ? '0 0 0 3px rgba(37,165,180,0.25), 0 8px 20px -10px rgba(37,165,180,0.35)'
          : '0 2px 8px -2px rgba(0,0,0,0.2)',
        transition: 'all 180ms cubic-bezier(.22,1,.36,1)'
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px',
          borderRadius: 4,
          background: 'rgba(37,165,180,0.15)',
          color: '#7CD3DB',
          fontFamily: 'var(--font-jetbrains)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.14em'
        }}
      >
        SABRE
      </span>
      <span
        style={{
          color: '#5EE1A3',
          fontFamily: 'var(--font-jetbrains)',
          fontSize: 14,
          fontWeight: 700
        }}
      >
        »
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Enter Sabre command…  e.g.  WABCD12   *R   A TLVJFK12MAY   QC/"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#fff',
          fontFamily: 'var(--font-jetbrains)',
          fontSize: 14,
          letterSpacing: '0.02em'
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-jetbrains)',
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.5)',
          padding: '3px 7px',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4
        }}
      >
        Ctrl + `
      </span>
      <button
        type="submit"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          background: 'linear-gradient(135deg,#0A2540 0%,#14476B 55%,#25A5B4 100%)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em'
        }}
      >
        EXPAND
      </button>
    </form>
  );
}
