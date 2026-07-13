import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState, AppAction, User, QuoteTemplate } from '../types';
import { getDefaultTemplates } from '../types';
import { generateId } from '../utils/storage';
import { toast } from 'react-hot-toast';
import { setSession, getSession } from '../utils/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import app from '../lib/firebase';
import {
  subscribeToCollections,
  syncActionToFirestore,
  fetchAllCollectionsOnce,
  seedIfEmpty
} from '../lib/firebaseSync';

// ─── Initial State ──────────────────────────────────────────
const initialState: AppState = {
  users: [],
  sites: [],
  shifts: [],
  payments: [],
  expenses: [],
  payroll: [],
  tasks: [],
  clients: [],
  quotes: [],
  supplyItems: [],
  siteInventory: [],
  inspections: [],
  inspectionTemplates: [],
  incidentReports: [],
  callLogs: [],
  leads: [],
  quoteTemplates: [],
  sharedContracts: [],
  settings: {
    businessName: 'GTA Scrub',
    ownerName: 'Ahraz Malik',
    currency: 'CAD',
    payPeriod: 'biweekly',
    dataVersion: 1,
  },
  session: null,
  isInitialized: false,
};

// ─── Reducer ────────────────────────────────────────────────
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'INITIALIZE':
      return { ...state, ...action.payload, isInitialized: true };

    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_SITES':
      return { ...state, sites: action.payload };
    case 'SET_SHIFTS':
      return { ...state, shifts: action.payload };
    case 'SET_PAYMENTS':
      return { ...state, payments: action.payload };
    case 'SET_EXPENSES':
      return { ...state, expenses: action.payload };
    case 'SET_PAYROLL':
      return { ...state, payroll: action.payload };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload };
    case 'SET_QUOTES':
      return { ...state, quotes: action.payload };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };

    case 'SET_SESSION':
      setSession(action.payload);
      return { ...state, session: action.payload };

    case 'LOGOUT':
      setSession(null);
      return { ...state, session: null };

    // Users
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload] };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? { ...u, ...action.payload } : u) };
    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.payload) };

    // Sites
    case 'ADD_SITE':
      return { ...state, sites: [...state.sites, action.payload] };
    case 'UPDATE_SITE':
      return { ...state, sites: state.sites.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SITE':
      return { ...state, sites: state.sites.filter(s => s.id !== action.payload) };

    // Shifts
    case 'ADD_SHIFT':
      return { ...state, shifts: [...state.shifts, action.payload] };
    case 'UPDATE_SHIFT':
      return { ...state, shifts: state.shifts.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SHIFT':
      return { ...state, shifts: state.shifts.filter(s => s.id !== action.payload) };

    // Payments
    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, action.payload] };
    case 'UPDATE_PAYMENT':
      return { ...state, payments: state.payments.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PAYMENT':
      return { ...state, payments: state.payments.filter(p => p.id !== action.payload) };

    // Expenses
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.payload] };
    case 'UPDATE_EXPENSE':
      return { ...state, expenses: state.expenses.map(e => e.id === action.payload.id ? action.payload : e) };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };

    // Payroll
    case 'ADD_PAYROLL':
      return { ...state, payroll: [...state.payroll, action.payload] };
    case 'UPDATE_PAYROLL':
      return { ...state, payroll: state.payroll.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PAYROLL':
      return { ...state, payroll: state.payroll.filter(p => p.id !== action.payload) };

    // Tasks
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };

    // Clients
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT':
      return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CLIENT':
      return { ...state, clients: state.clients.filter(c => c.id !== action.payload) };

    // Quotes
    case 'ADD_QUOTE':
      return { ...state, quotes: [...state.quotes, action.payload] };
    case 'UPDATE_QUOTE':
      return { ...state, quotes: state.quotes.map(q => q.id === action.payload.id ? action.payload : q) };
    case 'DELETE_QUOTE':
      return { ...state, quotes: state.quotes.filter(q => q.id !== action.payload) };

    // Settings
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    // Inventory
    case 'SET_SUPPLY_ITEMS':
      return { ...state, supplyItems: action.payload };
    case 'ADD_SUPPLY_ITEM':
      return { ...state, supplyItems: [...state.supplyItems, action.payload] };
    case 'UPDATE_SUPPLY_ITEM':
      return { ...state, supplyItems: state.supplyItems.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUPPLY_ITEM':
      return { ...state, supplyItems: state.supplyItems.filter(s => s.id !== action.payload) };
    case 'SET_SITE_INVENTORY':
      return { ...state, siteInventory: action.payload };
    case 'ADD_SITE_INVENTORY':
      return { ...state, siteInventory: [...state.siteInventory, action.payload] };
    case 'UPDATE_SITE_INVENTORY':
      return { ...state, siteInventory: state.siteInventory.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SITE_INVENTORY':
      return { ...state, siteInventory: state.siteInventory.filter(s => s.id !== action.payload) };

    // Inspections
    case 'SET_INSPECTIONS':
      return { ...state, inspections: action.payload };
    case 'ADD_INSPECTION':
      return { ...state, inspections: [...state.inspections, action.payload] };
    case 'UPDATE_INSPECTION':
      return { ...state, inspections: state.inspections.map(i => i.id === action.payload.id ? action.payload : i) };
    case 'DELETE_INSPECTION':
      return { ...state, inspections: state.inspections.filter(i => i.id !== action.payload) };
    case 'SET_INSPECTION_TEMPLATES':
      return { ...state, inspectionTemplates: action.payload };
    case 'ADD_INSPECTION_TEMPLATE':
      return { ...state, inspectionTemplates: [...state.inspectionTemplates, action.payload] };
    case 'DELETE_INSPECTION_TEMPLATE':
      return { ...state, inspectionTemplates: state.inspectionTemplates.filter(i => i.id !== action.payload) };

    // Incident Reports
    case 'SET_INCIDENT_REPORTS':
      return { ...state, incidentReports: action.payload };
    case 'ADD_INCIDENT_REPORT':
      return { ...state, incidentReports: [...state.incidentReports, action.payload] };
    case 'UPDATE_INCIDENT_REPORT':
      return { ...state, incidentReports: state.incidentReports.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_INCIDENT_REPORT':
      return { ...state, incidentReports: state.incidentReports.filter(r => r.id !== action.payload) };

    // Call Logs
    case 'SET_CALL_LOGS':
      return { ...state, callLogs: action.payload };
    case 'ADD_CALL_LOG':
      return { ...state, callLogs: [...state.callLogs, action.payload] };
    case 'UPDATE_CALL_LOG':
      return { ...state, callLogs: state.callLogs.map(c => c.id === action.payload.id ? action.payload : c) };

    // Leads
    case 'SET_LEADS':
      return { ...state, leads: action.payload };
    case 'UPDATE_LEAD_EMAIL':
      return { ...state, leads: state.leads.map(l => l.placeId === action.payload.leadId ? { ...l, email: action.payload.email } : l) };

    // Quote Templates
    case 'SET_QUOTE_TEMPLATES':
      return { ...state, quoteTemplates: action.payload };
    case 'ADD_QUOTE_TEMPLATE':
      return { ...state, quoteTemplates: [...state.quoteTemplates, action.payload] };
    case 'DELETE_QUOTE_TEMPLATE':
      return { ...state, quoteTemplates: state.quoteTemplates.filter(t => t.id !== action.payload) };

    // Shared Contracts
    case 'SET_SHARED_CONTRACTS':
      return { ...state, sharedContracts: action.payload };
    case 'ADD_SHARED_CONTRACT':
      return { ...state, sharedContracts: [...state.sharedContracts, action.payload] };
    case 'UPDATE_SHARED_CONTRACT':
      return { ...state, sharedContracts: state.sharedContracts.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };

    // Import
    case 'IMPORT_DATA':
      return { ...state, ...action.payload };

    // Clear all
    case 'CLEAR_ALL_DATA':
      return { ...initialState, isInitialized: true };

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  currentUser: User | null;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, originalDispatch] = useReducer(appReducer, initialState);

  // Ref to always hold the latest settings (avoid stale closure in customDispatch)
  const settingsRef = React.useRef(state.settings);
  settingsRef.current = state.settings;

  // Memoized custom dispatch that intercepts modifying actions and sends them to Firestore
  const customDispatch = React.useCallback(
    (action: AppAction) => {
      // 1. Dispatch locally first (optimistic UI update)
      originalDispatch(action);

      // 2. Sync changes to Cloud Firestore
      syncActionToFirestore(action, settingsRef.current).catch((err) => {
        console.error('Failed to sync action to Firestore:', err);
        toast.error('Sync failed. Check your connection or permissions.');
      });
    },
    [] // stable — never needs to be recreated
  );

  // ─── Init: Firestore is the source of truth ──────────────
  useEffect(() => {
    // Restore session so the user stays logged in across page reloads
    const session = getSession();
    if (session) {
      originalDispatch({ type: 'SET_SESSION', payload: session });
    }

    let unsubscribe: (() => void) | null = null;

    async function startFirebaseSync() {
      const handleError = (source: string, err: unknown) => {
        console.error(`Firestore listener error (${source})`, err);
      };

      try {
        // Authenticate anonymously so Firestore rules (request.auth != null) pass
        try {
          const auth = getAuth(app);
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
        } catch (authErr) {
          console.warn('Anonymous auth failed — Firestore reads may be denied', authErr);
        }
        // Hydrate from Firestore
        let remote = await fetchAllCollectionsOnce();

        // First-time setup: seed default users/sites only when Firestore is
        // genuinely brand new (no users AND no settings doc). The settings doc
        // persists independently in Firestore, so its existence proves seeding
        // has been done before. Without this guard, deleting all users would
        // cause seedIfEmpty() to re-run on every page load — resurrecting them.
        if (remote.users.length === 0 && !remote.settings) {
          await seedIfEmpty();
          remote = await fetchAllCollectionsOnce();
        }

        originalDispatch({ type: 'SET_USERS', payload: remote.users });
        originalDispatch({ type: 'SET_SITES', payload: remote.sites });
        originalDispatch({ type: 'SET_SHIFTS', payload: remote.shifts });
        originalDispatch({ type: 'SET_PAYMENTS', payload: remote.payments });
        originalDispatch({ type: 'SET_EXPENSES', payload: remote.expenses });
        originalDispatch({ type: 'SET_PAYROLL', payload: remote.payroll });
        originalDispatch({ type: 'SET_TASKS', payload: remote.tasks });
        originalDispatch({ type: 'SET_CLIENTS', payload: remote.clients });
        originalDispatch({ type: 'SET_QUOTES', payload: remote.quotes });
        if (remote.supplyItems) originalDispatch({ type: 'SET_SUPPLY_ITEMS', payload: remote.supplyItems });
        if (remote.siteInventory) originalDispatch({ type: 'SET_SITE_INVENTORY', payload: remote.siteInventory });
        if (remote.inspections) originalDispatch({ type: 'SET_INSPECTIONS', payload: remote.inspections });
        if (remote.inspectionTemplates) originalDispatch({ type: 'SET_INSPECTION_TEMPLATES', payload: remote.inspectionTemplates });
        if (remote.incidentReports) originalDispatch({ type: 'SET_INCIDENT_REPORTS', payload: remote.incidentReports });
        if (remote.callLogs) originalDispatch({ type: 'SET_CALL_LOGS', payload: remote.callLogs });
        if (remote.leads) originalDispatch({ type: 'SET_LEADS', payload: remote.leads });
        if (remote.sharedContracts) originalDispatch({ type: 'SET_SHARED_CONTRACTS', payload: remote.sharedContracts });
        // Seed default templates if none exist (one per business type)
        const templates: QuoteTemplate[] = remote.quoteTemplates?.length
          ? remote.quoteTemplates
          : getDefaultTemplates().map(t => ({ ...t, id: generateId() } as QuoteTemplate));
        originalDispatch({ type: 'SET_QUOTE_TEMPLATES', payload: templates });

        if (remote.settings) {
          originalDispatch({ type: 'SET_SETTINGS', payload: remote.settings });
        }

        // Mark initialized — app becomes visible
        originalDispatch({ type: 'INITIALIZE', payload: {} });

        // Start real-time listeners for live updates
        unsubscribe = subscribeToCollections(originalDispatch, handleError);
      } catch (err) {
        console.error('Firestore init failed:', err);
        // Still mark initialized so the user sees the app (with empty data)
        // rather than a permanent spinner. They'll see whatever Firestore
        // listeners deliver (or an error toast).
        originalDispatch({ type: 'INITIALIZE', payload: {} });
      }
    }

    startFirebaseSync();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const currentUser = state.session
    ? state.users.find(u => u.id === state.session!.userId) ?? null
    : null;

  return (
    <AppContext.Provider value={{ state, dispatch: customDispatch, currentUser }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
