export const API_BASE_URL = '/api/mock';

export const APP_COLORS = {
  navy: '#0A1628',
  canvas: '#F8FAFC',
  status: {
    confirmed: '#059669',
    warning: '#D97706',
    danger: '#DC2626'
  }
} as const;

export const STATUS_MAP: Record<string, string> = {
  Confirmed: APP_COLORS.status.confirmed,
  Ticketed: APP_COLORS.status.confirmed,
  'Within Limits': APP_COLORS.status.confirmed,
  'Approaching Deadline': APP_COLORS.status.warning,
  'Booked': APP_COLORS.status.warning,
  'Awaiting Ticket': APP_COLORS.status.warning,
  'Urgent': APP_COLORS.status.danger,
  'Past Deadline': APP_COLORS.status.danger,
  'Void': APP_COLORS.status.danger,
  'Canceled': APP_COLORS.status.danger
};
