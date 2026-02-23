import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/shared';
import AuthGuard from '@/components/auth/AuthGuard';
import LoginPage from '@/components/auth/LoginPage';
import ForgotPasswordPage from '@/components/auth/ForgotPasswordPage';
import AppLayout from '@/components/layout/AppLayout';

const DashboardPage = lazy(() => import('@/components/dashboard/DashboardPage'));
const WorkplanPage = lazy(() => import('@/components/workplan/WorkplanPage'));
const TimelinePage = lazy(() => import('@/components/timeline/TimelinePage'));
const ResourcesPage = lazy(() => import('@/components/resources/ResourcesPage'));
const SheetsPage = lazy(() => import('@/components/sheets/SheetsPage'));
const DiagramsPage = lazy(() => import('@/components/diagrams/DiagramsPage'));
const ProfilePage = lazy(() => import('@/components/profile/ProfilePage'));
const TeamPage = lazy(() => import('@/components/admin/TeamPage'));
const AuditLogsPage = lazy(() => import('@/components/admin/AuditLogsPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-gray-400 text-sm">Loading...</div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h2>
      <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm">Back to Dashboard</Link>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              element={
                <AuthGuard>
                  <AppLayout />
                </AuthGuard>
              }
            >
              <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
              <Route path="workplan" element={<Suspense fallback={<PageLoader />}><WorkplanPage /></Suspense>} />
              <Route path="workplan/:code" element={<Suspense fallback={<PageLoader />}><WorkplanPage /></Suspense>} />
              <Route path="timeline" element={<Suspense fallback={<PageLoader />}><TimelinePage /></Suspense>} />
              <Route path="resources" element={<Suspense fallback={<PageLoader />}><ResourcesPage /></Suspense>} />
              <Route path="sheets" element={<Suspense fallback={<PageLoader />}><SheetsPage /></Suspense>} />
              <Route path="sheets/:id" element={<Suspense fallback={<PageLoader />}><SheetsPage /></Suspense>} />
              <Route path="diagrams" element={<Suspense fallback={<PageLoader />}><DiagramsPage /></Suspense>} />
              <Route path="diagrams/:id" element={<Suspense fallback={<PageLoader />}><DiagramsPage /></Suspense>} />
              <Route path="profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
              <Route path="admin/team" element={<Suspense fallback={<PageLoader />}><TeamPage /></Suspense>} />
              <Route path="admin/audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogsPage /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
