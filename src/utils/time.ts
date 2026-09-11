/**
 * Helper utilities for formatting game playtime.
 */
export function formatPlaytime(totalSeconds: number = 0): string {
  if (!totalSeconds || totalSeconds <= 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatTotalHours(totalSeconds: number = 0): string {
  if (!totalSeconds || totalSeconds <= 0) return '0.0h';
  const hours = totalSeconds / 3600;
  if (hours < 0.1) {
    const mins = Math.max(1, Math.round(totalSeconds / 60));
    return `${mins}m`;
  }
  return `${hours.toFixed(1)}h`;
}
