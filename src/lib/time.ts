export function toMinutesLeft(deadline: string): number {
  return Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 60000));
}

export function formatCountdown(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) {
    return '00:00';
  }
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function parseDate(date?: string) {
  return date ? new Date(date) : new Date();
}
