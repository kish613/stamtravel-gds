'use client';

import { useEffect, useRef, useState } from 'react';

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :→-';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function Flap({ char, delay = 0 }: { char: string; delay?: number }) {
  const [display, setDisplay] = useState(char);
  const targetRef = useRef(char);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    targetRef.current = char;

    if (prefersReducedMotion()) {
      setDisplay(char);
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    let ticks = 0;
    const maxTicks = 6 + Math.floor(Math.random() * 5);

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        ticks += 1;
        if (ticks >= maxTicks) {
          setDisplay(targetRef.current);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else {
          setDisplay(POOL[Math.floor(Math.random() * POOL.length)]);
        }
      }, 45);
    }, delay);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [char, delay]);

  return (
    <span
      style={{
        display: 'inline-block',
        width: '0.65em',
        textAlign: 'center',
        fontFamily: 'var(--font-jetbrains)',
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {display}
    </span>
  );
}

export function FlapText({
  text,
  delayBase = 0,
  color = '#F5C56B'
}: {
  text: string;
  delayBase?: number;
  color?: string;
}) {
  const chars = String(text).toUpperCase().split('');
  return (
    <span style={{ color, letterSpacing: '0.02em' }}>
      {chars.map((c, i) => (
        <Flap key={i + '-' + c} char={c === ' ' ? '\u00A0' : c} delay={i * 35 + delayBase} />
      ))}
    </span>
  );
}
