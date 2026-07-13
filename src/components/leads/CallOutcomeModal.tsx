import { Phone, CheckCircle2, XCircle, RotateCcw, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Lead, CallOutcome } from '../../types';

interface Props {
  lead: Lead | null;
  outcome: CallOutcome;
  notes: string;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  setOutcome: (o: CallOutcome) => void;
  setNotes: (n: string) => void;
}

const OUTCOMES: { value: CallOutcome; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'completed', label: 'Completed', icon: <CheckCircle2 size={20} />, color: 'text-green-600 bg-green-100' },
  { value: 'no_answer', label: 'No Answer', icon: <XCircle size={20} />, color: 'text-amber-600 bg-amber-100' },
  { value: 'wrong_number', label: 'Wrong Number', icon: <AlertCircle size={20} />, color: 'text-red-600 bg-red-100' },
  { value: 'callback', label: 'Callback', icon: <RotateCcw size={20} />, color: 'text-blue-600 bg-blue-100' },
];

export function CallOutcomeModal({ lead, outcome, notes, saving, onClose, onSave, setOutcome, setNotes }: Props) {
  if (!lead) return null;

  return (
    <Modal isOpen={!!lead} onClose={onClose} title="Log Call Outcome" size="md">
      <div className="space-y-5">
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900">{lead.businessName}</h4>
          <a href={`tel:${lead.phone}`} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-1">
            <Phone size={12} /> {lead.phone}
          </a>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">How did the call go?</label>
          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map(opt => (
              <button
                key={opt.value}
                onClick={() => setOutcome(opt.value)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  outcome === opt.value
                    ? `${opt.color} border-current`
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px]"
            placeholder="Any notes about the call…"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? 'Saving...' : 'Save Outcome'}</Button>
        </div>
      </div>
    </Modal>
  );
}
