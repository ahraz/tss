import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Site, Inspection, InspectionItem, Shift, Payment, Quote } from '../types';

interface PortalData {
  site: Site | null;
  client: Record<string, unknown> | null;
  inspections: Inspection[];
  templates: InspectionItem[];
  shifts: Shift[];
  payments: Payment[];
  quote: Quote | null;
  loading: boolean;
  error: string | null;
}

export function useClientPortal(token: string | undefined): PortalData {
  const [data, setData] = useState<PortalData>({
    site: null, client: null, inspections: [], templates: [],
    shifts: [], payments: [], quote: null,
    loading: !!token,
    error: token ? null : 'Invalid link',
  });

  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        // 1. Find site by shareToken
        const sitesSnap = await getDocs(query(collection(db, 'sites'), where('shareToken', '==', token)));
        if (sitesSnap.empty) {
          setData(prev => ({ ...prev, loading: false, error: 'Portal not found. The link may have expired.' }));
          return;
        }
        const site = { id: sitesSnap.docs[0].id, ...sitesSnap.docs[0].data() } as Site;

        // 2. Load client if clientId exists
        let client = null;
        if (site.clientId) {
          const clientSnap = await getDoc(doc(db, 'clients', site.clientId));
          if (clientSnap.exists()) client = { id: clientSnap.id, ...clientSnap.data() };
        }

        // 3. Load all inspection templates (for label/category lookup)
        const templSnap = await getDocs(collection(db, 'inspectionTemplates'));
        const templates = templSnap.docs.map(d => ({ id: d.id, ...d.data() } as InspectionItem));

        // 4. Load inspections
        const inspSnap = await getDocs(query(
          collection(db, 'inspections'),
          where('siteId', '==', site.id),
          orderBy('performedAt', 'desc'),
          limit(10)
        ));
        const inspections = inspSnap.docs.map(d => ({ id: d.id, ...d.data() } as Inspection));

        // 5. Load shifts
        const shiftSnap = await getDocs(query(
          collection(db, 'shifts'),
          where('siteId', '==', site.id),
          orderBy('clockInTime', 'desc'),
          limit(10)
        ));
        const shifts = shiftSnap.docs.map(d => ({ id: d.id, ...d.data() } as Shift));

        // 6. Load payments
        const paySnap = await getDocs(query(
          collection(db, 'payments'),
          where('siteId', '==', site.id),
          orderBy('createdAt', 'desc'),
          limit(10)
        ));
        const payments = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

        // 7. Load quote from sharedContracts
        const contractSnap = await getDoc(doc(db, 'sharedContracts', token));
        const quote = contractSnap.exists()
          ? { id: contractSnap.id, ...contractSnap.data() } as Quote
          : null;

        setData({ site, client, inspections, templates, shifts, payments, quote, loading: false, error: null });
      } catch {
        setData(prev => ({ ...prev, loading: false, error: 'Failed to load portal data.' }));
      }
    }

    load();
  }, [token]);

  return data;
}
