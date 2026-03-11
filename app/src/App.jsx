import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import useScrollTop from './hooks/useScrollTop';
import { Toaster } from './components/ui/sonner';
import ClassicTicketLoader from './components/ui/ClassicTicketLoader';

// HomePage is eager-loaded (entry point — no spinner on first visit)
import HomePage from './pages/HomePage';

// Other pages are lazy-loaded; JS chunks are preloaded in background by HomePage
const EventsPage = lazy(() => import('./pages/EventsPage'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'));
const OrganizerProfilePage = lazy(() => import('./pages/OrganizerProfilePage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const CreateEventPage = lazy(() => import('./pages/CreateEventPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const MyTicketsPage = lazy(() => import('./pages/MyTicketsPage'));
const FindTicketPage = lazy(() => import('./pages/FindTicketPage'));
const HostEventLandingPage = lazy(() => import('./pages/HostEventLandingPage'));
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage'));
const OrganizerDashboardPage = lazy(() => import('./pages/OrganizerDashboardPage'));
const CheckInPage = lazy(() => import('./pages/CheckInPage'));
const TicketVerificationPage = lazy(() => import('./pages/TicketVerificationPage'));
const OrganizerCheckInLanding = lazy(() => import('./pages/OrganizerCheckInLanding'));
const ForcePasswordResetPage = lazy(() => import('./pages/ForcePasswordResetPage'));

// Loading fallback — plain CSS spinner, no framer-motion transforms
const PageLoader = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="w-16 h-16 border-4 border-[#1E4DB7] border-t-transparent rounded-full animate-spin" />
  </div>
);

const EventDetailChunkLoader = () => (
  <div className="min-h-screen bg-[#020617]">
    <ClassicTicketLoader visible />
  </div>
);

// Scroll to top on route change
const ScrollToTop = () => {
  useScrollTop();
  return null;
};

// Passes the current route key up to the ErrorBoundary so it can reset on navigation.
// onLocationKey is a setter from the App parent.
const LocationBridge = ({ onLocationKey }) => {
  const location = useLocation();
  useEffect(() => {
    onLocationKey(location.key);
  }, [location.key, onLocationKey]);
  return null;
};


// All routes — NO motion wrappers around pages (motion transforms break fixed positioning on iOS)
const PasswordResetGate = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.must_reset_password) return;
    if (location.pathname === '/force-password-reset') return;
    navigate('/force-password-reset', { replace: true });
  }, [user, location.pathname, navigate]);

  return null;
};

const CheckInStaffGate = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (user.must_reset_password) return;
    const isStaff = user.role === 'checkin' || user.role === 'staff';
    if (!isStaff) return;
    const allowed = [
      /^\/organizer-checkin\/?$/,
      /^\/organizer\/events\/[^/]+\/checkin\/?$/,
      /^\/force-password-reset\/?$/,
      /^\/settings\/?$/,
    ];
    const isAllowed = allowed.some((regex) => regex.test(location.pathname));
    if (!isAllowed) {
      navigate('/organizer-checkin', { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return null;
};

const RequireAuth = ({ children, roles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRoutes = ({ onLocationKey }) => {
  const location = useLocation();
  const organizerRoles = ['organizer', 'admin'];
  const staffRoles = ['organizer', 'admin', 'checkin', 'staff'];
  const isOrganizerRoute =
    /^\/organizer-dashboard\/?$/.test(location.pathname) ||
    /^\/organizer\/events\/[^/]+\/checkin\/?$/.test(location.pathname) ||
    /^\/organizer-checkin\/?$/.test(location.pathname) ||
    /^\/force-password-reset\/?$/.test(location.pathname) ||
    /^\/create-event\/?$/.test(location.pathname) ||
    /^\/edit-event\/[^/]+\/?$/.test(location.pathname);
  const hideFooter =
    /^\/organizer\/events\/[^/]+\/checkin\/?$/.test(location.pathname) ||
    /^\/organizer-checkin\/?$/.test(location.pathname) ||
    /^\/force-password-reset\/?$/.test(location.pathname) ||
    /^\/settings\/?$/.test(location.pathname) ||
    /^\/create-event\/?$/.test(location.pathname) ||
    /^\/edit-event\/[^/]+\/?$/.test(location.pathname) ||
    /^\/organizer-dashboard\/?$/.test(location.pathname);

  return (
    <>
      <ScrollToTop />
      <LocationBridge onLocationKey={onLocationKey} />
      <PasswordResetGate />
      <CheckInStaffGate />
      {!isOrganizerRoute && <Navbar />}
      <Toaster position="top-right" />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<Suspense fallback={<PageLoader />}><EventsPage /></Suspense>} />
        <Route path="/events/:slug" element={<Suspense fallback={<EventDetailChunkLoader />}><EventDetailPage /></Suspense>} />
        <Route path="/checkout/:slug" element={<Suspense fallback={<PageLoader />}><CheckoutPage /></Suspense>} />
        <Route path="/confirmation/:orderId" element={<Suspense fallback={<PageLoader />}><ConfirmationPage /></Suspense>} />
        <Route path="/search" element={<Suspense fallback={<PageLoader />}><SearchResultsPage /></Suspense>} />
        <Route path="/organizers/:id" element={<Suspense fallback={<PageLoader />}><OrganizerProfilePage /></Suspense>} />
        <Route path="/edit-event/:slug" element={
          <RequireAuth roles={organizerRoles}>
            <Suspense fallback={<PageLoader />}><CreateEventPage /></Suspense>
          </RequireAuth>
        } />
        <Route path="/create-event" element={
          <RequireAuth roles={organizerRoles}>
            <Suspense fallback={<PageLoader />}><CreateEventPage /></Suspense>
          </RequireAuth>
        } />
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
        <Route path="/signup" element={<Suspense fallback={<PageLoader />}><SignUpPage /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
        <Route path="/organizer-profile" element={<Suspense fallback={<PageLoader />}><OrganizerProfilePage /></Suspense>} />
        <Route path="/find-ticket" element={<Suspense fallback={<PageLoader />}><FindTicketPage /></Suspense>} />
        <Route path="/sell-tickets" element={<Suspense fallback={<PageLoader />}><HostEventLandingPage /></Suspense>} />
        <Route path="/my-tickets" element={
          <RequireAuth>
            <Suspense fallback={<PageLoader />}><MyTicketsPage /></Suspense>
          </RequireAuth>
        } />
        <Route path="/settings" element={
          <RequireAuth>
            <Suspense fallback={<PageLoader />}><AccountSettingsPage /></Suspense>
          </RequireAuth>
        } />
        <Route path="/organizer-dashboard" element={
          <RequireAuth roles={organizerRoles}>
            <Suspense fallback={<PageLoader />}><OrganizerDashboardPage /></Suspense>
          </RequireAuth>
        } />
        <Route path="/organizer-checkin" element={
          <RequireAuth roles={staffRoles}>
            <Suspense fallback={<PageLoader />}><OrganizerCheckInLanding /></Suspense>
          </RequireAuth>
        } />
        <Route path="/organizer/events/:slug/checkin" element={
          <RequireAuth roles={staffRoles}>
            <Suspense fallback={<PageLoader />}><CheckInPage /></Suspense>
          </RequireAuth>
        } />
        <Route path="/force-password-reset" element={<Suspense fallback={<PageLoader />}><ForcePasswordResetPage /></Suspense>} />
        <Route path="/verify-email" element={<Suspense fallback={<PageLoader />}><EmailVerificationPage /></Suspense>} />
        <Route path="/t/:uuid" element={<Suspense fallback={<PageLoader />}><TicketVerificationPage /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
      </Routes>

      {!hideFooter && <Footer />}
    </>
  );
};

function App() {
  const [locationKey, setLocationKey] = useState('');
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <ErrorBoundary locationKey={locationKey}>
            <AppRoutes onLocationKey={setLocationKey} />
          </ErrorBoundary>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
