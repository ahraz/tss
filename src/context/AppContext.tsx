import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState, AppAction, User } from '../types';
import { toast } from 'react-hot-toast';
import {
  initializeStorage, loadAllState, persistState,
  setSession, clearAllData, importAllData, getSession
} from '../utils/storage';
import {
  migrateLocalToFirebase,
  subscribeToCollections,
  syncActionToFirestore,
  fetchAllCollectionsOnce
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
  settings: {
    businessName: 'TSS Cleaners',
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
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u) };
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

    // Settings
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    // Import
    case 'IMPORT_DATA':
      return { ...state, ...action.payload };

    // Clear all
    case 'CLEAR_ALL_DATA': {
      clearAllData();
      initializeStorage();
      const fresh = loadAllState();
      return { ...state, ...fresh, session: null, isInitialized: true };
    }

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

  // Memoized custom dispatch that intercepts modifying actions and sends them to Firestore
  const customDispatch = React.useCallback(
    (action: AppAction) => {
      // 1. Dispatch locally first (optimistic UI update)
      originalDispatch(action);

      // 2. Sync changes to Cloud Firestore
      syncActionToFirestore(action, state.settings).catch((err) => {
        console.error('Failed to sync action to Firestore:', err);
        toast.error('Sync failed. Check your connection or permissions.');
      });
    },
    [state.settings]
  );

  // Initialize and synchronize with Firebase on mount
  useEffect(() => {
    // 1. First, seed and load from local storage as a quick fallback cache
    initializeStorage();
    const loaded = loadAllState();
    originalDispatch({
      type: 'INITIALIZE',
      payload: {
        ...loaded,
        session: getSession(),
      },
    });

    // 2. Safely connect and sync with Firebase online
    let unsubscribe: (() => void) | null = null;
    
    async function startFirebaseSync() {
      const handleSnapshotError = (source: string, err: unknown) => {
        console.error(`Firestore listener error (${source})`, err);
        toast.error(`Live sync error (${source}). Check connection/permissions.`);
      };

      try {
        // Run migration if the online database is currently empty
        await migrateLocalToFirebase();
        
        // Hydrate once from Firestore to ensure cross-session consistency
        const remote = await fetchAllCollectionsOnce();
        originalDispatch({ type: 'SET_USERS', payload: remote.users });
        originalDispatch({ type: 'SET_SITES', payload: remote.sites });
        originalDispatch({ type: 'SET_SHIFTS', payload: remote.shifts });
        originalDispatch({ type: 'SET_PAYMENTS', payload: remote.payments });
        originalDispatch({ type: 'SET_EXPENSES', payload: remote.expenses });
        originalDispatch({ type: 'SET_PAYROLL', payload: remote.payroll });
        originalDispatch({ type: 'SET_TASKS', payload: remote.tasks });
        if (remote.settings) {
          originalDispatch({ type: 'SET_SETTINGS', payload: remote.settings });
        }
        
        // Start listening to the real-time collections
        unsubscribe = subscribeToCollections(originalDispatch, handleSnapshotError);
      } catch (err) {
        console.error('Failed to initialize Firebase syncing:', err);
        toast.error('Could not connect to Firestore. Working locally only.');
      }
    }

    startFirebaseSync();

    // Clean up real-time listeners on component unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Persist to localStorage on every state change (except session — handled in reducer)
  useEffect(() => {
    if (!state.isInitialized) return;
    persistState({
      users: state.users,
      sites: state.sites,
      shifts: state.shifts,
      payments: state.payments,
      expenses: state.expenses,
      payroll: state.payroll,
      tasks: state.tasks,
      settings: state.settings,
    });
  }, [
    state.isInitialized,
    state.users,
    state.sites,
    state.shifts,
    state.payments,
    state.expenses,
    state.payroll,
    state.tasks,
    state.settings,
  ]);

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
