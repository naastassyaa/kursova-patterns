import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, type Location } from 'react-router-dom';

import AppShell from './components/layout/AppShell';
import LoadingState from './components/common/LoadingState';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';
import AuthProvider, { useAuth } from './context/AuthContext';
import AccountDrawer, { type AccountSection } from './components/account/AccountDrawer';
import { useBrowserNotifications } from './hooks/useBrowserNotifications';

const HomePage = lazy(() => import('./pages/HomePage'));
const CenterPage = lazy(() => import('./pages/CenterPage'));
const SectionPage = lazy(() => import('./pages/SectionPage'));
const TrainerPage = lazy(() => import('./pages/TrainerPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const AdminWorkspacePage = lazy(() => import('./pages/AdminWorkspacePage'));
const SectionsExplorerPage = lazy(() => import('./pages/SectionsExplorerPage'));
const CentersPage = lazy(() => import('./pages/CentersPage'));
const CoachesPage = lazy(() => import('./pages/CoachesPage'));

const withRouteBoundary = (node: JSX.Element) => <RouteErrorBoundary>{node}</RouteErrorBoundary>;

type AccountModalState = {
  background?: Location;
  section?: AccountSection;
  from?: string;
  modal?: 'account';
};

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as AccountModalState | undefined;
  const backgroundLocation = state?.background;
  const { isAuthenticated } = useAuth();
  
  // Enable browser notifications for authenticated users
  useBrowserNotifications(isAuthenticated);

  const closeAccountDrawer = () => {
    if (backgroundLocation) {
      navigate(backgroundLocation.pathname + backgroundLocation.search, {
        replace: true,
        state: backgroundLocation.state,
      });
      return;
    }
    if (state?.from) {
      navigate(state.from, { replace: true });
      return;
    }
    navigate('/', { replace: true });
  };

  const accountSection = (state?.section ?? 'profile') as AccountSection;

  return (
    <>
      <Routes location={backgroundLocation ?? location}>
        <Route element={<AppShell />}>
          <Route index element={withRouteBoundary(<HomePage />)} />
          <Route path="centers/:centerId" element={withRouteBoundary(<CenterPage />)} />
          <Route path="sections" element={withRouteBoundary(<SectionsExplorerPage />)} />
          <Route path="sections/:sectionId" element={withRouteBoundary(<SectionPage />)} />
          <Route path="centers" element={withRouteBoundary(<CentersPage />)} />
          <Route path="coaches" element={withRouteBoundary(<CoachesPage />)} />
          <Route path="trainers/:trainerId" element={withRouteBoundary(<TrainerPage />)} />
          <Route path="subscriptions" element={withRouteBoundary(<SubscriptionsPage />)} />
          <Route
            path="account"
            element={
              <ProtectedRoute>
                {withRouteBoundary(<AccountPage />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <AdminRoute>
                {withRouteBoundary(<AdminWorkspacePage />)}
              </AdminRoute>
            }
          />
          <Route path="auth/login" element={withRouteBoundary(<LoginPage />)} />
          <Route path="auth/register" element={withRouteBoundary(<RegisterPage />)} />
          <Route path="*" element={withRouteBoundary(<Navigate to="/" replace />)} />
        </Route>
      </Routes>
      {state?.modal === 'account' && (
        <ProtectedRoute>
          <AccountDrawer isOpen initialSection={accountSection} onClose={closeAccountDrawer} />
        </ProtectedRoute>
      )}
    </>
  );
};

const App = () => (
  <AuthProvider>
    <Suspense fallback={<LoadingState message="Завантаження сторінки..." />}>
      <AppContent />
    </Suspense>
  </AuthProvider>
);

export default App;

