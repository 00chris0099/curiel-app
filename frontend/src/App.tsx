import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState, Suspense, lazy, type ReactNode } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { PrivateRoute } from './auth/PrivateRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { NotFound } from './pages/NotFound';
import { usePrefetchCriticalData } from './hooks/usePrefetchCriticalData';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Inspections = lazy(() => import('./pages/Inspections').then(m => ({ default: m.Inspections })));
const CreateInspection = lazy(() => import('./pages/CreateInspection').then(m => ({ default: m.CreateInspection })));
const InspectionDetail = lazy(() => import('./pages/InspectionDetail').then(m => ({ default: m.InspectionDetail })));
const InspectionExecution = lazy(() => import('./pages/InspectionExecution').then(m => ({ default: m.InspectionExecution })));
const InspectionAreaDetail = lazy(() => import('./pages/InspectionAreaDetail').then(m => ({ default: m.InspectionAreaDetail })));
const Users = lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const Clients = lazy(() => import('./pages/Clients').then(m => ({ default: m.Clients })));
const ClientDetail = lazy(() => import('./pages/ClientDetail').then(m => ({ default: m.ClientDetail })));
const SupervisorDashboard = lazy(() => import('./pages/SupervisorDashboard').then(m => ({ default: m.SupervisorDashboard })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const Evaluations = lazy(() => import('./pages/Evaluations').then(m => ({ default: m.Evaluations })));
const Suspensions = lazy(() => import('./pages/Suspensions').then(m => ({ default: m.Suspensions })));
const SupervisorActions = lazy(() => import('./pages/SupervisorActions').then(m => ({ default: m.SupervisorActions })));
const Config = lazy(() => import('./pages/Config').then(m => ({ default: m.Config })));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
  </div>
);

const PrefetchData = () => {
  usePrefetchCriticalData();
  return null;
};

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="min-h-screen px-3 pb-10 pt-[4.5rem] sm:px-6 sm:pt-20 lg:ml-64 lg:px-8 lg:pt-24">
        <div className="mx-auto w-full max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  const isDark = useThemeStore((state) => state.isDark);
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <PrefetchData />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: isDark ? '#1f2937' : '#fff',
            color: isDark ? '#f9fafb' : '#111827',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Ruta publica */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Rutas protegidas */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardLayout><ErrorBoundary><Dashboard /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><DashboardLayout><ErrorBoundary><Profile /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><DashboardLayout><ErrorBoundary><Notifications /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute allowedRoles={['admin']}><DashboardLayout><ErrorBoundary><Users /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute allowedRoles={['admin']}><DashboardLayout><ErrorBoundary><Clients /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/clients/:id" element={<PrivateRoute allowedRoles={['admin']}><DashboardLayout><ErrorBoundary><ClientDetail /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/inspections" element={<PrivateRoute><DashboardLayout><ErrorBoundary><Inspections /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/inspections/:id" element={<PrivateRoute><DashboardLayout><ErrorBoundary><InspectionDetail /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/inspections/:id/execute" element={<PrivateRoute allowedRoles={['admin', 'arquitecto', 'supervisor', 'inspector']}><DashboardLayout><ErrorBoundary backHref="/inspections"><InspectionExecution /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/inspections/:id/execute/areas/:areaId" element={<PrivateRoute allowedRoles={['admin', 'arquitecto', 'supervisor', 'inspector']}><DashboardLayout><ErrorBoundary backHref="/inspections"><InspectionAreaDetail /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/inspections/create" element={<PrivateRoute allowedRoles={['admin', 'arquitecto', 'supervisor']}><DashboardLayout><ErrorBoundary><CreateInspection /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/supervisor" element={<PrivateRoute allowedRoles={['supervisor', 'admin']}><DashboardLayout><ErrorBoundary><SupervisorDashboard /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/alerts" element={<PrivateRoute allowedRoles={['supervisor', 'admin']}><DashboardLayout><ErrorBoundary><Alerts /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/evaluations" element={<PrivateRoute allowedRoles={['supervisor', 'admin']}><DashboardLayout><ErrorBoundary><Evaluations /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/suspensions" element={<PrivateRoute allowedRoles={['supervisor', 'admin']}><DashboardLayout><ErrorBoundary><Suspensions /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/supervisor/actions" element={<PrivateRoute allowedRoles={['supervisor', 'admin']}><DashboardLayout><ErrorBoundary><SupervisorActions /></ErrorBoundary></DashboardLayout></PrivateRoute>} />
          <Route path="/config" element={<PrivateRoute allowedRoles={['admin']}><DashboardLayout><ErrorBoundary><Config /></ErrorBoundary></DashboardLayout></PrivateRoute>} />

          {/* Redirecciones */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
