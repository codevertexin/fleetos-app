import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Home, Calendar, FileText, User, LayoutGrid, ClipboardList, Clock } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Layouts
import { AdminLayout } from '@/components/layout/AdminLayout';
import { MobileLayout } from '@/components/layout/MobileLayout';

// Admin pages (lazy)
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Vehicles = lazy(() => import('./pages/admin/Vehicles'));
const VehicleDetail = lazy(() => import('./pages/admin/VehicleDetail'));
const Drivers = lazy(() => import('./pages/admin/Drivers'));
const DriverDetail = lazy(() => import('./pages/admin/DriverDetail'));
const Bookings = lazy(() => import('./pages/admin/Bookings'));
const BookingDetail = lazy(() => import('./pages/admin/BookingDetail'));
const Contracts = lazy(() => import('./pages/admin/Contracts'));
const Owners = lazy(() => import('./pages/admin/Owners'));
const OwnerDetail = lazy(() => import('./pages/admin/OwnerDetail'));
const Assignments = lazy(() => import('./pages/admin/Assignments'));
const Finance = lazy(() => import('./pages/admin/Finance'));
const Documents = lazy(() => import('./pages/admin/Documents'));
const Alerts = lazy(() => import('./pages/admin/Alerts'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Settings = lazy(() => import('./pages/admin/Settings'));

// Auth pages (lazy)
const Login = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const SsoCallback = lazy(() => import('./pages/auth/SsoCallback'));

// Driver pages (lazy)
const DriverHome = lazy(() => import('./pages/driver/DriverHome'));
const DriverAssignments = lazy(() => import('./pages/driver/DriverAssignments'));
const DriverSchedule = lazy(() => import('./pages/driver/DriverSchedule'));
const DriverDocuments = lazy(() => import('./pages/driver/DriverDocuments'));
const DriverProfile = lazy(() => import('./pages/driver/DriverProfile'));

// Customer pages (lazy)
const CustomerBook = lazy(() => import('./pages/customer/CustomerBook'));
const CustomerTrips = lazy(() => import('./pages/customer/CustomerTrips'));
const CustomerSupport = lazy(() => import('./pages/customer/CustomerSupport'));
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile'));

// Owner & Operations portals (lazy)
const OwnerPortal = lazy(() => import('./pages/owner/OwnerPortal'));
const OperationsPortal = lazy(() => import('./pages/operations/OperationsPortal'));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00B39A] border-t-transparent" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

// ─── Nav configs ─────────────────────────────────────────────────────────────

const driverNav = [
  { path: '/driver', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { path: '/driver/assignments', label: 'Trips', icon: <ClipboardList className="w-5 h-5" /> },
  { path: '/driver/schedule', label: 'Schedule', icon: <Clock className="w-5 h-5" /> },
  { path: '/driver/documents', label: 'Docs', icon: <FileText className="w-5 h-5" /> },
  { path: '/driver/profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

function getCustomerNav(slug: string) {
  return [
    { path: `/book/${slug}`, label: 'Book', icon: <Home className="w-5 h-5" /> },
    { path: `/book/${slug}/trips`, label: 'Trips', icon: <Calendar className="w-5 h-5" /> },
    { path: `/book/${slug}/support`, label: 'Support', icon: <LayoutGrid className="w-5 h-5" /> },
    { path: `/book/${slug}/profile`, label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];
}

// ─── Layout wrappers ──────────────────────────────────────────────────────────

function AdminWrapper({
  children,
  darkMode,
  setDarkMode,
}: {
  children: React.ReactNode;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}) {
  return (
    <AdminLayout darkMode={darkMode} setDarkMode={setDarkMode}>
      {children}
    </AdminLayout>
  );
}

function DriverWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MobileLayout navItems={driverNav} darkMode={false} setDarkMode={() => {}}>
      {children}
    </MobileLayout>
  );
}

function CustomerSlugRoutes() {
  const { companySlug = 'demo' } = useParams<{ companySlug: string }>();
  const nav = getCustomerNav(companySlug);

  return (
    <MobileLayout navItems={nav} darkMode={false} setDarkMode={() => {}}>
      <Routes>
        <Route index element={<CustomerBook />} />
        <Route path="trips" element={<CustomerTrips />} />
        <Route path="support" element={<CustomerSupport />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Routes>
    </MobileLayout>
  );
}

function CustomerRoutes() {
  return (
    <Routes>
      <Route path=":companySlug/*" element={<CustomerSlugRoutes />} />
      <Route index element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return (
        localStorage.getItem('fleetos-dark') === 'true' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('fleetos-dark', String(darkMode));
    } catch {
      // ignore
    }
  }, [darkMode]);

  const protectedAdmin = (page: React.ReactNode) => (
    <ProtectedRoute>
      <AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}>
        {page}
      </AdminWrapper>
    </ProtectedRoute>
  );

  const protectedPage = (page: React.ReactNode) => (
    <ProtectedRoute>{page}</ProtectedRoute>
  );

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Public auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/sso/callback" element={<SsoCallback />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Admin (protected) */}
        <Route path="/dashboard" element={protectedAdmin(<Dashboard />)} />
        <Route path="/vehicles" element={protectedAdmin(<Vehicles />)} />
        <Route path="/vehicles/:id" element={protectedAdmin(<VehicleDetail />)} />
        <Route path="/drivers" element={protectedAdmin(<Drivers />)} />
        <Route path="/drivers/:id" element={protectedAdmin(<DriverDetail />)} />
        <Route path="/bookings" element={protectedAdmin(<Bookings />)} />
        <Route path="/bookings/:id" element={protectedAdmin(<BookingDetail />)} />
        <Route path="/contracts" element={protectedAdmin(<Contracts />)} />
        <Route path="/assignments" element={protectedAdmin(<Assignments />)} />
        <Route path="/finance" element={protectedAdmin(<Finance />)} />
        <Route path="/expenses" element={<Navigate to="/finance" replace />} />
        <Route path="/incomes" element={<Navigate to="/finance?tab=incomes" replace />} />
        <Route path="/payouts" element={<Navigate to="/finance?tab=payouts" replace />} />
        <Route path="/documents" element={protectedAdmin(<Documents />)} />
        <Route path="/alerts" element={protectedAdmin(<Alerts />)} />
        <Route path="/reports" element={protectedAdmin(<Reports />)} />
        <Route path="/settings" element={protectedAdmin(<Settings />)} />
        <Route path="/owners" element={protectedAdmin(<Owners />)} />
        <Route path="/owners/:id" element={protectedAdmin(<OwnerDetail />)} />

        {/* Owner portal (protected) */}
        <Route path="/owner/*" element={protectedPage(<OwnerPortal />)} />

        {/* Operations portal (protected) */}
        <Route path="/operations/*" element={protectedPage(<OperationsPortal />)} />

        {/* Driver mobile (protected) */}
        <Route path="/driver" element={protectedPage(<DriverWrapper><DriverHome /></DriverWrapper>)} />
        <Route path="/driver/assignments" element={protectedPage(<DriverWrapper><DriverAssignments /></DriverWrapper>)} />
        <Route path="/driver/schedule" element={protectedPage(<DriverWrapper><DriverSchedule /></DriverWrapper>)} />
        <Route path="/driver/documents" element={protectedPage(<DriverWrapper><DriverDocuments /></DriverWrapper>)} />
        <Route path="/driver/profile" element={protectedPage(<DriverWrapper><DriverProfile /></DriverWrapper>)} />

        {/* Customer booking portal (public) */}
        <Route path="/book/*" element={<CustomerRoutes />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
