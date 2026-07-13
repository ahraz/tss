import { Search } from 'lucide-react';
import type { FilterMode } from '../../pages/LeadsPage';

interface Props {
  filter: FilterMode;
  typeFilter: string;
  searchQuery: string;
  businessTypes: string[];
  callStatusCounts: Record<string, number>;
  leadCount: number;
  onFilterChange: (f: FilterMode) => void;
  onTypeFilterChange: (t: string) => void;
  onSearchChange: (q: string) => void;
}

export const FILTER_OPTIONS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All Leads' },
  { key: 'not_called', label: 'Not Called' },
  { key: 'today', label: 'Called Today' },
  { key: 'callback', label: 'Needs Callback' },
  { key: 'completed', label: 'Completed' },
  { key: 'no_answer', label: 'No Answer' },
  { key: 'wrong_number', label: 'Wrong Number' },
];

export function LeadFilters({
  filter, typeFilter, searchQuery, businessTypes, callStatusCounts, leadCount,
  onFilterChange, onTypeFilterChange, onSearchChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <div className="flex gap-2 items-center">
        <select
          value={filter}
          onChange={e => onFilterChange(e.target.value as FilterMode)}
          className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-gray-300 text-gray-700 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]"
        >
          {FILTER_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>
              {opt.label} {callStatusCounts[opt.key] ? `(${callStatusCounts[opt.key]})` : ''}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={e => onTypeFilterChange(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm font-medium bg-white border border-gray-300 text-gray-700 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]"
        >
          <option value="all">All Types ({leadCount})</option>
          {businessTypes.map(t => {
            const count = leadCount; // exact count requires full lead list — kept simple
            return <option key={t} value={t}>{t}</option>;
          })}
        </select>
      </div>
      <div className="relative w-full sm:w-64">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search name, phone, email..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
