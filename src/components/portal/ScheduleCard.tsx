import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatDate } from '../../utils/formatters';
import type { Shift, Site } from '../../types';

interface Props {
  site: Site;
  shifts: Shift[];
}

export function ScheduleCard({ site, shifts }: Props) {
  const [expanded, setExpanded] = useState(false);
  const nextShifts = shifts.filter(s => s.status === 'active');
  const nextShift = nextShifts[0] || null;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Cleaning Schedule</h2>
          </div>

          {!nextShift ? (
            <p className="text-sm text-gray-400">No upcoming visits scheduled.</p>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                Next visit: <span className="font-medium">{nextShift.clockInTime ? formatDate(nextShift.clockInTime) : 'Scheduled'}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Frequency: {site.frequency} · {site.cleaningDays.map(d => d.charAt(0).toUpperCase() + d.slice(1,3)).join(', ')}
              </p>
            </>
          )}
        </div>

        {shifts.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            {expanded ? 'Close' : 'View Schedule'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {shifts.slice(0, 10).map(shift => (
            <div key={shift.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-600">{formatDate(shift.clockInTime)}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                shift.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {shift.status === 'completed' ? 'Completed' : 'Upcoming'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
