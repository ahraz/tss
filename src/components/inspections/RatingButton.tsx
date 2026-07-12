import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { InspectionRating } from '../../types';

const RATING_ICONS: Record<InspectionRating, { icon: typeof CheckCircle; color: string; label: string }> = {
  pass: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Pass' },
  pass_needs: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-100', label: 'Needs Work' },
  fail: { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Fail' },
};

export function RatingButton({ rating, selected, onClick }: {
  rating: InspectionRating;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = RATING_ICONS[rating];
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        selected ? meta.color + ' ring-2 ring-offset-1 ring-gray-400' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <Icon size={14} />
      {meta.label}
    </button>
  );
}
