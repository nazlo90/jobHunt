import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuthStore } from './core/stores/authStore';
import AppShell from './components/layout/AppShell';
import AuthGuard from './components/layout/AuthGuard';
import GuestGuard from './components/layout/GuestGuard';

const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/pages/ResetPasswordPage'));
const OAuthCallbackPage = lazy(() => import('./features/auth/pages/OAuthCallbackPage'));

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const JobsListPage = lazy(() => import('./features/jobs/pages/JobsListPage'));
const JobDetailPage = lazy(() => import('./features/jobs/pages/JobDetailPage'));
const AddJobPage = lazy(() => import('./features/jobs/pages/AddJobPage'));
const ConfigurationsPage = lazy(() => import('./features/configurations/ConfigurationsPage'));

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const initialized = useAuthStore((s) => s.initialized);
  const { pathname } = useLocation();
  const isCallback = pathname === '/auth/callback';
  const initCalled = useRef(false);

  useEffect(() => {
    if (!isCallback && !initCalled.current) {
      initCalled.current = true;
      initialize();
    }
  }, [initialize, isCallback]);

  if (!initialized && !isCallback) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<GuestGuard />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsListPage />} />
            <Route path="/jobs/new" element={<AddJobPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/configurations" element={<ConfigurationsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
