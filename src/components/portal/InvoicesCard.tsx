import { useState } from 'react';
import { DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatCAD, formatDate } from '../../utils/formatters';
import type { Payment } from '../../types';

interface Props {
  payments: Payment[];
  nextBilling?: string;
}

export function InvoicesCard({ payments, nextBilling }: Props) {
  const [expanded, setExpanded] = useState(false);
  const unpaid = payments.filter(p => !p.isPaid);
  const balance = unpaid.reduce((sum, p) => sum + p.amount, 0);
  const lastPaid = payments.filter(p => p.isPaid).sort((a, b) =>
    new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
  )[0] || null;

  if (payments.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={18} className="text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900">Invoices & Payments</h2>
        </div>
        <p className="text-sm text-gray-400">No payment history yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Invoices & Payments</h2>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-sm text-gray-500">Balance:</span>
            <span className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCAD(balance)}
            </span>
          </div>

          {lastPaid && (
            <p className="text-xs text-gray-400">
              Last payment: {formatCAD(lastPaid.amount)} on {formatDate(lastPaid.date || lastPaid.createdAt)}
            </p>
          )}

          {nextBilling && (
            <p className="text-xs text-gray-400 mt-0.5">
              Next billing: {formatDate(nextBilling)}
            </p>
          )}
        </div>

        {payments.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            {expanded ? 'Close' : 'View Invoices'}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          {payments.slice(0, 10).map(payment => (
            <div key={payment.id} className="flex items-center justify-between py-1.5 text-sm">
              <div>
                <span className="text-gray-700">{formatCAD(payment.amount)}</span>
                <span className="text-gray-400 ml-2 text-xs">{formatDate(payment.createdAt)}</span>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                payment.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {payment.isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
