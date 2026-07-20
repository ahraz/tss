import { Building2, MapPin, Phone, User } from 'lucide-react';
import { Card } from '../ui/Card';
import type { Site } from '../../types';

interface Props {
  site: Site;
  clientName?: string;
}

export function ProfileCard({ site, clientName }: Props) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Building2 size={18} className="text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">Business Profile</h2>
      </div>

      <div className="space-y-2 text-sm">
        <p className="font-medium text-gray-800">{site.name}</p>
        <p className="flex items-center gap-1.5 text-gray-500">
          <MapPin size={14} />
          {site.address}, {site.city}, {site.province} {site.postalCode}
        </p>
        {site.contactName && (
          <p className="flex items-center gap-1.5 text-gray-500">
            <User size={14} />
            {site.contactName}
          </p>
        )}
        {site.contactPhone && (
          <p className="flex items-center gap-1.5 text-gray-500">
            <Phone size={14} />
            {site.contactPhone}
          </p>
        )}
      </div>
    </Card>
  );
}
