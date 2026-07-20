import { useParams } from 'react-router-dom';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCAD } from '../../utils/formatters';
import type { Quote } from '../../types';

interface Props {
  quote: Quote | null;
}

export function QuoteCard({ quote }: Props) {
  const { token } = useParams<{ token: string }>();

  if (!quote) return null;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Your Cleaning Plan</h2>
          </div>

          <div className="space-y-1 mb-3">
            {(quote.lineItems || []).slice(0, 3).map((item, i) => (
              <p key={i} className="text-sm text-gray-600">
                {item.description}
                {item.visitsPerWeek > 0 && (
                  <span className="text-gray-400 text-xs ml-1">· {item.visitsPerWeek}x/week</span>
                )}
              </p>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-emerald-600">{formatCAD(quote.totalMonthly)}/mo</span>
            <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              {quote.status === 'accepted' ? (
                <><CheckCircle size={12} /> Accepted</>
              ) : (
                <><Clock size={12} /> Pending</>
              )}
            </div>
          </div>

          {token && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <a
                href={`/quote/${token}`}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View Full Quote →
              </a>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
