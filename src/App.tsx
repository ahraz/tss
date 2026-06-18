import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PwaUpdatePrompt } from './components/ui/PwaUpdatePrompt';

// Pages (eager — always needed immediately)
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ClockPage } from './pages/ClockPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { SitesPage } from './pages/SitesPage';
import { SiteDetailPage } from './pages/SiteDetailPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { QuotesPage } from './pages/QuotesPage';
import { QuoteDetailPage } from './pages/QuoteDetailPage';
import { SchedulePage } from './pages/SchedulePage';
import { MoneyBookPage } from './pages/MoneyBookPage';
import { TasksPage } from './pages/TasksPage';
import { SettingsPage } from './pages/SettingsPage';
import { TeamPage } from './pages/TeamPage';
import { InventoryPage } from './pages/InventoryPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { InspectionsPage } from './pages/InspectionsPage';
import { PayrollPage } from './pages/PayrollPage';

// AnalyticsPage lazy-loaded because it pulls in ~300 KB of recharts
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { currentUser } = useApp();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { state } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle auto-logout if session is missing but user is thought to be logged in,
  // or redirect to login if not authenticated and not already there.
  useEffect(() => {
    if (state.isInitialized && !state.session && location.pathname !== '/login') {
       navigate('/login');
    }
  }, [state.isInitialized, state.session, location.pathname, navigate]);

  if (!state.isInitialized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <ErrorBoundary>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/clock" element={<ProtectedRoute><ClockPage /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><SchedulePage /></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute><ShiftsPage /></ProtectedRoute>} />
        
        <Route path="/sites" element={<ProtectedRoute><SitesPage /></ProtectedRoute>} />
        <Route path="/sites/:id" element={<ProtectedRoute><SiteDetailPage /></ProtectedRoute>} />
        
        <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
        
        <Route path="/quotes" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><QuotesPage /></ProtectedRoute>} />
        <Route path="/quotes/:id" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><QuoteDetailPage /></ProtectedRoute>} />
        
        <Route path="/team" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><TeamPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/incidents" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><IncidentsPage /></ProtectedRoute>} />
        <Route path="/inspections" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><InspectionsPage /></ProtectedRoute>} />
        <Route path="/money" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><MoneyBookPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Loading analytics…</div>}><AnalyticsPage /></Suspense></ProtectedRoute>} />
        <Route path="/payroll" element={<ProtectedRoute allowedRoles={['owner', 'partner']}><PayrollPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['owner']}><SettingsPage /></ProtectedRoute>} />
        
        <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
      <PwaUpdatePrompt />
    </>
  );
}
