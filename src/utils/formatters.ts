// ============================================================
// GTA Scrub — Display Formatters
// ============================================================

const cadFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number as CAD currency: $1,234.56
 */
export function formatCAD(amount: number): string {
  return cadFormatter.format(amount);
}

/**
 * Format minutes to human readable duration: '2h 34m'
 * Returns '0m' for zero or negative values.
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';

  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * Format ISO string to: 'Oct 14, 2024 at 9:35 AM'
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const parts = dateTimeFormatter.formatToParts(date);

  // Build the formatted string manually to get the "at" separator
  const month = parts.find(p => p.type === 'month')?.value ?? '';
  const day = parts.find(p => p.type === 'day')?.value ?? '';
  const year = parts.find(p => p.type === 'year')?.value ?? '';
  const hour = parts.find(p => p.type === 'hour')?.value ?? '';
  const minute = parts.find(p => p.type === 'minute')?.value ?? '';
  const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value ?? '';

  return `${month} ${day}, ${year} at ${hour}:${minute} ${dayPeriod}`;
}

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/**
 * Format ISO string to: 'Oct 14, 2024'
 */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const parts = dateFormatter.formatToParts(date);

  const month = parts.find(p => p.type === 'month')?.value ?? '';
  const day = parts.find(p => p.type === 'day')?.value ?? '';
  const year = parts.find(p => p.type === 'year')?.value ?? '';

  return `${month} ${day}, ${year}`;
}

/**
 * Get initials from a name: 'Raja Singh' → 'RS'
 * Takes the first letter of each word, up to 2 characters.
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Format relative time: 'Just now', '5m ago', '2h ago', 'Yesterday', 'Oct 14, 2024'
 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Negative diff means future — just show the date
  if (diffMs < 0) return formatDate(iso);

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(iso);
}
