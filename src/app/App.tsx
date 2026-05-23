import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Home, Calendar, FileText, User, LayoutGrid, ClipboardList, Clock } from 'lucide-react';

// Layouts
import { AdminLayout } from '@/components/layout/AdminLayout';
import { MobileLayout } from '@/components/layout/MobileLayout';

// Admin pages
import Dashboard from './pages/admin/Dashboard';
import Vehicles from './pages/admin/Vehicles';
import VehicleDetail from './pages/admin/VehicleDetail';
import Drivers from './pages/admin/Drivers';
import DriverDetail from './pages/admin/DriverDetail';
import Bookings from './pages/admin/Bookings';
import BookingDetail from './pages/admin/BookingDetail';
import Contracts from './pages/admin/Contracts';
import Owners from './pages/admin/Owners';
import OwnerDetail from './pages/admin/OwnerDetail';
import Assignments from './pages/admin/Assignments';
import Finance from './pages/admin/Finance';
import Documents from './pages/admin/Documents';
import Alerts from './pages/admin/Alerts';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';

// Auth pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';

// Driver pages
import DriverHome from './pages/driver/DriverHome';
import DriverAssignments from './pages/driver/DriverAssignments';
import DriverSchedule from './pages/driver/DriverSchedule';
import DriverDocuments from './pages/driver/DriverDocuments';
import DriverProfile from './pages/driver/DriverProfile';

// Customer pages
import CustomerBook from './pages/customer/CustomerBook';
import CustomerTrips from './pages/customer/CustomerTrips';
import CustomerSupport from './pages/customer/CustomerSupport';
import CustomerProfile from './pages/customer/CustomerProfile';

// Owner & Operations portals
import OwnerPortal from './pages/owner/OwnerPortal';
import OperationsPortal from './pages/operations/OperationsPortal';

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

  return (
    <Routes>
      {/* Public auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Admin */}
      <Route path="/dashboard" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Dashboard /></AdminWrapper>} />
      <Route path="/vehicles" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Vehicles /></AdminWrapper>} />
      <Route path="/vehicles/:id" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><VehicleDetail /></AdminWrapper>} />
      <Route path="/drivers" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Drivers /></AdminWrapper>} />
      <Route path="/drivers/:id" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><DriverDetail /></AdminWrapper>} />
      <Route path="/bookings" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Bookings /></AdminWrapper>} />
      <Route path="/bookings/:id" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><BookingDetail /></AdminWrapper>} />
      <Route path="/contracts" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Contracts /></AdminWrapper>} />
      <Route path="/assignments" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Assignments /></AdminWrapper>} />
      <Route path="/finance" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Finance /></AdminWrapper>} />
      <Route path="/expenses" element={<Navigate to="/finance" replace />} />
      <Route path="/incomes" element={<Navigate to="/finance?tab=incomes" replace />} />
      <Route path="/payouts" element={<Navigate to="/finance?tab=payouts" replace />} />
      <Route path="/documents" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Documents /></AdminWrapper>} />
      <Route path="/alerts" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Alerts /></AdminWrapper>} />
      <Route path="/reports" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Reports /></AdminWrapper>} />
      <Route path="/settings" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Settings /></AdminWrapper>} />
      <Route path="/owners" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><Owners /></AdminWrapper>} />
      <Route path="/owners/:id" element={<AdminWrapper darkMode={darkMode} setDarkMode={setDarkMode}><OwnerDetail /></AdminWrapper>} />

      {/* Owner portal */}
      <Route path="/owner/*" element={<OwnerPortal />} />

      {/* Operations portal */}
      <Route path="/operations/*" element={<OperationsPortal />} />

      {/* Driver mobile */}
      <Route path="/driver" element={<DriverWrapper><DriverHome /></DriverWrapper>} />
      <Route path="/driver/assignments" element={<DriverWrapper><DriverAssignments /></DriverWrapper>} />
      <Route path="/driver/schedule" element={<DriverWrapper><DriverSchedule /></DriverWrapper>} />
      <Route path="/driver/documents" element={<DriverWrapper><DriverDocuments /></DriverWrapper>} />
      <Route path="/driver/profile" element={<DriverWrapper><DriverProfile /></DriverWrapper>} />

      {/* Customer booking portal */}
      <Route path="/book/*" element={<CustomerRoutes />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
