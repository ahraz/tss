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
    const tokenValue = token;

    async function load() {
      try {
        // 1. Find site by shareToken
        const sitesSnap = await getDocs(query(collection(db, 'sites'), where('shareToken', '==', tokenValue)));
        if (sitesSnap.empty) {
          const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
          if (isDemo) {
            const demoData = generateDemoData(tokenValue);
            setData({ ...demoData, loading: false, error: null });
            return;
          }
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
        const contractSnap = await getDoc(doc(db, 'sharedContracts', tokenValue));
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

function generateDemoData(token: string): PortalData {
  const demoItems: InspectionItem[] = [
    { id: 'demo-item-0', label: 'Floor Cleaning', category: 'Floors', order: 0 },
    { id: 'demo-item-1', label: 'Surface Sanitization', category: 'Washrooms', order: 1 },
    { id: 'demo-item-2', label: 'High Dusting', category: 'Dusting', order: 2 },
    { id: 'demo-item-3', label: 'Sink Area', category: 'Kitchen', order: 3 },
    { id: 'demo-item-4', label: 'Waste Removal', category: 'General', order: 4 },
    { id: 'demo-item-5', label: 'Glass Cleaning', category: 'Windows', order: 5 },
  ];

  const demoInspection: Inspection = {
    id: 'demo-insp-1',
    siteId: 'demo-site',
    templateId: 'demo-template',
    templateLabel: 'Standard Clean',
    performedById: 'demo-inspector',
    performedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    items: [
      { itemId: 'demo-item-0', rating: 'pass', notes: 'Floors swept and mopped, no residue' },
      { itemId: 'demo-item-1', rating: 'pass', notes: 'All surfaces sanitized' },
      { itemId: 'demo-item-2', rating: 'pass_needs', notes: 'Light dust on top shelves' },
      { itemId: 'demo-item-3', rating: 'fail', notes: 'Sink not fully dried' },
      { itemId: 'demo-item-4', rating: 'pass', notes: 'Garbage bins emptied' },
      { itemId: 'demo-item-5', rating: 'pass', notes: 'Glass surfaces streak-free' },
    ],
    notes: 'Great cleaning overall. Minor touch-up needed on high dusting.',
    photoIds: [],
    clientSigned: true,
    clientSignedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    signedByName: 'Dr. Sarah Johnson',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  };

  const inspections: Inspection[] = [demoInspection];

  const shifts: Shift[] = [
    {
      id: 'demo-shift-1',
      userId: 'demo-cleaner',
      siteId: 'demo-site',
      clockInTime: new Date(Date.now() + 86400000).toISOString(),
      clockInPhotoDataUrl: '',
      clockOutTime: null,
      clockOutPhotoDataUrl: null,
      durationMinutes: null,
      checklistCompletions: [],
      notes: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-shift-2',
      userId: 'demo-cleaner',
      siteId: 'demo-site',
      clockInTime: new Date(Date.now() - 86400000 * 4).toISOString(),
      clockInPhotoDataUrl: '',
      clockOutTime: new Date(Date.now() - 86400000 * 4 + 7200000).toISOString(),
      clockOutPhotoDataUrl: '',
      durationMinutes: 120,
      checklistCompletions: [],
      notes: '',
      status: 'completed',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ];

  const site: Site = {
    id: 'demo-site',
    name: 'Demo Medical Clinic',
    address: '123 Main Street',
    city: 'Brampton',
    province: 'ON',
    postalCode: 'L6V 1A1',
    areaTags: ['brampton'],
    type: 'clinic',
    contactName: 'Dr. Sarah Johnson',
    contactPhone: '(905) 555-0123',
    contractRate: 450,
    frequency: 'weekly',
    cleaningDays: ['monday', 'thursday'],
    scheduleStart: '18:00',
    scheduleEnd: '20:00',
    assignedUserIds: [],
    accessNotes: 'Side door entrance, code #1234',
    status: 'active',
    checklist: [],
    clientId: null,
    isSubSite: false,
    shareToken: token,
    createdAt: new Date().toISOString(),
  };

  const payments: Payment[] = [
    { id: 'demo-pay-1', siteId: 'demo-site', amount: 450, date: new Date(Date.now() - 86400000 * 5).toISOString(), method: 'etransfer', forPeriod: 'March 2026', isPaid: true, notes: 'Monthly payment', createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'demo-pay-2', siteId: 'demo-site', amount: 450, date: new Date(Date.now() - 86400000 * 2).toISOString(), method: 'etransfer', forPeriod: 'April 2026', isPaid: false, notes: 'Due Apr 1', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  ];

  const quote: Quote = {
    id: 'demo-quote',
    clientId: null,
    prospectName: 'Demo Medical Clinic',
    prospectAddress: '123 Main Street',
    prospectCity: 'Brampton',
    prospectProvince: 'ON',
    prospectPostalCode: 'L6V 1A1',
    prospectPhone: '(905) 555-0123',
    lineItems: [
      { id: 'demo-line-1', description: 'Office Cleaning', siteId: 'demo-site', frequency: 'weekly', visitsPerWeek: 3, amountPerVisit: 85, monthlyAmount: 255 },
      { id: 'demo-line-2', description: 'Washroom Sanitization', siteId: 'demo-site', frequency: 'weekly', visitsPerWeek: 5, amountPerVisit: 25, monthlyAmount: 125 },
      { id: 'demo-line-3', description: 'Floor Care', siteId: 'demo-site', frequency: 'monthly', visitsPerWeek: 1, amountPerVisit: 70, monthlyAmount: 70 },
    ],
    totalMonthly: 450,
    status: 'accepted',
    validUntil: '',
    notes: '',
    createdBy: '',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    shareToken: token,
    acceptedAt: new Date(Date.now() - 86400000 * 55).toISOString(),
  };

  return { site, client: null, inspections, templates: demoItems, shifts, payments, quote, loading: false, error: null };
}
