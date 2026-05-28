import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
}

export function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }: DateRangePickerProps) {
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const now = new Date();

  const presets = [
    { label: 'Today', start: fmt(now), end: fmt(now) },
    { label: 'This Week', start: fmt(startOfWeek(now)), end: fmt(endOfWeek(now)) },
    { label: 'This Month', start: fmt(startOfMonth(now)), end: fmt(endOfMonth(now)) },
    { label: 'This Year', start: fmt(startOfYear(now)), end: fmt(endOfYear(now)) },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => { onStartChange(p.start); onEndChange(p.end); }}
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={e => onStartChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
        />
        <span className="text-gray-400 text-xs">to</span>
        <input
          type="date"
          value={endDate}
          onChange={e => onEndChange(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
        />
      </div>
    </div>
  );
}
