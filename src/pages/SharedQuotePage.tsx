import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getDoc } from 'firebase/firestore';
import { sanitizeForFirestore } from '../lib/firebaseSync';
import { generateId } from '../utils/storage';
import type { Quote, QuoteView } from '../types';
import { CheckCircle2, Building2, Star, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export function SharedQuotePage() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const tokenVal = token;

    async function load() {
      try {
        const q = query(collection(db, 'quotes'), where('shareToken', '==', tokenVal));
        const snap = await getDocs(q);
        if (snap.empty) {
          const contractSnap = await getDoc(doc(db, 'sharedContracts', tokenVal));
          if (contractSnap.exists()) {
            const data = contractSnap.data();
            setQuote({
              id: contractSnap.id,
              clientId: null,
              prospectName: data.prospectName || data.businessName || '',
              prospectAddress: data.prospectAddress || '',
              prospectCity: data.prospectCity || '',
              prospectProvince: data.prospectProvince || 'ON',
              prospectPostalCode: data.prospectPostalCode || '',
              prospectPhone: data.prospectPhone || '',
              lineItems: data.lineItems || [],
              totalMonthly: data.totalMonthly || 0,
              status: data.status || 'draft',
              validUntil: data.validUntil || '',
              notes: data.notes || '',
              createdBy: data.createdBy || '',
              createdAt: data.createdAt || '',
              updatedAt: data.updatedAt || '',
              shareToken: token,
              acceptedAt: data.acceptedAt || undefined,
            });
          } else {
            setError('Quote not found. The link may have expired.');
            setLoading(false);
            return;
          }
        } else {
          const doc = snap.docs[0];
          setQuote({ id: doc.id, ...doc.data() } as Quote);
        }

        // Track the view
        const view: QuoteView = {
          id: generateId(),
          quoteId: snap.docs[0]?.id || token || '',
          token: token || '',
          viewedAt: new Date().toISOString(),
        };
        try {
          await setDoc(doc(db, 'quoteViews', view.id), sanitizeForFirestore(view));
        } catch {
          /* noop */
        }

        setLoading(false);
      } catch {
        setError('Failed to load quote. Please try again.');
        setLoading(false);
      }
    }

    load();
  }, [token]);

  const handleAccept = async () => {
    if (!quote) return;
    try {
      const quoteRef = doc(db, 'quotes', quote.id);
      await setDoc(quoteRef, {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      }, { merge: true });

      // Also try updating shared contract if it exists
      try {
        const contractRef = doc(db, 'sharedContracts', token!);
        await setDoc(contractRef, {
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
        }, { merge: true });
      } catch {
        /* noop */
      }

      setAccepted(true);
      toast.success('Quote accepted! GTA Scrub will be in touch.');
    } catch {
      toast.error('Failed to accept. Please try again.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Quote Unavailable</h2>
          <p className="text-sm text-gray-500">Invalid link</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Quote Unavailable</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  if (accepted || quote.status === 'accepted') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-emerald-100 p-8 text-center">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Quote Accepted</h2>
          <p className="text-sm text-gray-500 mb-6">
            Thank you! We'll be in touch shortly to confirm your first cleaning date.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Star size={12} className="text-amber-400" /> 4.9</span>
            <span>500+ clients</span>
            <span className="flex items-center gap-1"><Shield size={12} /> Insured</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            GTA<span className="text-emerald-600">Scrub</span>
          </h1>
          <p className="text-sm text-gray-400">Commercial Cleaning Quote</p>
        </div>

        {/* Quote Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Business Info */}
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{quote.prospectName}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{quote.prospectAddress}{quote.prospectCity ? `, ${quote.prospectCity}` : ''}</p>
            {quote.validUntil && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Valid until {new Date(quote.validUntil + 'T23:59:59').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Line Items */}
          <div className="px-6 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left py-2 font-medium">Service</th>
                  <th className="text-right py-2 font-medium">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2.5 text-gray-700">
                      <div className="font-medium">{item.description}</div>
                      {item.visitsPerWeek > 0 && (
                        <div className="text-xs text-gray-400">{item.visitsPerWeek}x/week · ${item.amountPerVisit.toFixed(2)}/visit</div>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-medium text-gray-900">
                      ${item.monthlyAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="py-3 text-sm font-semibold text-gray-900">Total Monthly</td>
                  <td className="py-3 text-right text-lg font-bold text-emerald-600">
                    ${quote.totalMonthly.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500">{quote.notes}</p>
            </div>
          )}

          {/* CTA */}
          <div className="px-6 py-5 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAccept}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl text-sm transition-colors"
            >
              Accept Quote
            </button>
            <a
              href="tel:+12892770213"
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl text-sm transition-colors text-center"
            >
              Call (289) 277-0213
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400 space-y-1">
          <p>GTA Scrub · 20 Glenfield Cres, Brampton, ON L6S 1W2</p>
          <div className="flex items-center justify-center gap-3">
            <span className="flex items-center gap-1"><Star size={12} className="text-amber-400 fill-amber-400" /> 4.9</span>
            <span>500+ clients</span>
            <span className="flex items-center gap-1"><Shield size={12} /> Fully insured & bonded</span>
          </div>
        </div>
      </div>
    </div>
  );
}
