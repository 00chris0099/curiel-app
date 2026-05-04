import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { PrivateRoute } from './auth/PrivateRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Inspections } from './pages/Inspections';
import { CreateInspection } from './pages/CreateInspection';
import { InspectionDetail } from './pages/InspectionDetail';
import { InspectionExecution } from './pages/InspectionExecution';
import { Users } from './pages/Users';

// Layout con Navbar y Sidebar
const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="min-h-screen px-4 pb-10 pt-20 sm:px-6 lg:ml-64 lg:px-8 lg:pt-24">
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

      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/users"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <DashboardLayout>
                <Users />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/inspections"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Inspections />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/inspections/:id"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <InspectionDetail />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/inspections/:id/execute"
          element={
            <PrivateRoute allowedRoles={['admin', 'arquitecto', 'inspector']}>
              <DashboardLayout>
                <ErrorBoundary backHref="/inspections">
                  <InspectionExecution />
                </ErrorBoundary>
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/inspections/create"
          element={
            <PrivateRoute allowedRoles={['admin', 'arquitecto']}>
              <DashboardLayout>
                <CreateInspection />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        {/* Redirecciones */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
