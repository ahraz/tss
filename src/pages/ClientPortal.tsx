import { useParams } from 'react-router-dom';
import { useClientPortal } from '../hooks/useClientPortal';
import { Building2 } from 'lucide-react';
import { PortalHeader } from '../components/portal/PortalHeader';
import { CleanCheckCard } from '../components/portal/CleanCheckCard';
import { ScheduleCard } from '../components/portal/ScheduleCard';
import { InvoicesCard } from '../components/portal/InvoicesCard';
import { QuoteCard } from '../components/portal/QuoteCard';
import { ProfileCard } from '../components/portal/ProfileCard';

export function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const { site, client, inspections, templates, shifts, payments, quote, loading, error } = useClientPortal(token);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Portal Unavailable</h2>
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

  if (error || !site) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Portal Unavailable</h2>
          <p className="text-sm text-gray-500">{error || 'Portal not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <PortalHeader site={site} latestInspection={inspections[0] || null} />
        <CleanCheckCard inspections={inspections} templates={templates} />
        <ScheduleCard site={site} shifts={shifts} />
        <InvoicesCard payments={payments} />
        <QuoteCard quote={quote} />
        <ProfileCard site={site} />
      </div>
    </div>
  );
}
