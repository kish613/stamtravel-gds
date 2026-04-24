// Mission Control color palette, lifted from the design bundle's
// colors_and_type.css.  Kept local to this feature — we're not extending
// the global Tailwind theme for a single page.

export const mcColors = {
  navy900: '#05192E',
  navy800: '#0A2540',
  navy700: '#123256',
  navy600: '#1A3F6B',
  mid500: '#14476B',
  teal500: '#25A5B4',
  teal400: '#3DBBC8',
  teal300: '#7CD3DB',
  teal200: '#B7E6EB',
  teal100: '#E4F5F7',

  neutral0: '#FFFFFF',
  neutral25: '#FBFCFD',
  neutral50: '#F6F8FB',
  neutral100: '#EEF2F7',
  neutral150: '#E2E8F0',
  neutral200: '#CBD5E1',
  neutral300: '#94A3B8',
  neutral400: '#64748B',
  neutral500: '#475569',
  neutral600: '#334155',
  neutral700: '#1E293B',
  neutral800: '#0F172A',

  // Signals
  good: '#0E9F6E',
  goodBg: '#E7F7EF',
  warn: '#D9892B',
  warnBg: '#FDF5E6',
  danger: '#D93141',
  dangerBg: '#FCECEE',
  amber: '#F5C56B',
  amberBright: '#FF8A3D',
  emerald: '#5EE1A3',

  // Gradients / backgrounds
  gradientBrand: 'linear-gradient(135deg, #0A2540 0%, #14476B 55%, #25A5B4 100%)',
  gradientTerminal: 'linear-gradient(135deg, #05070A 0%, #0A1624 60%, #14476B 100%)',
  gradientFids: 'linear-gradient(180deg, #05070A 0%, #0A0D14 100%)'
} as const;

export const fontDisplay = "var(--font-plus-jakarta), var(--font-inter), system-ui, sans-serif";
export const fontMono = "var(--font-jetbrains), ui-monospace, SF Mono, monospace";

export const statusTone = (status: string): 'confirmed' | 'warning' | 'danger' | 'neutral' => {
  if (status === 'Ticketed') return 'confirmed';
  if (status === 'Awaiting Ticket' || status === 'Booked') return 'warning';
  if (status === 'Void' || status === 'Canceled') return 'danger';
  return 'neutral';
};

export const toneColor = (tone: 'confirmed' | 'warning' | 'danger' | 'neutral' | 'good' | 'warn' | 'ok'): string => {
  switch (tone) {
    case 'confirmed':
    case 'good':
    case 'ok':
      return mcColors.good;
    case 'warning':
    case 'warn':
      return mcColors.warn;
    case 'danger':
      return mcColors.danger;
    default:
      return mcColors.neutral400;
  }
};
