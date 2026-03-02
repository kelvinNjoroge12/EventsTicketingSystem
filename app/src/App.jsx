import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import useScrollTop from './hooks/useScrollTop';
import useToast from './hooks/useToast';
import Toast from './components/ui/Toast';

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
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage'));
const OrganizerDashboardPage = lazy(() => import('./pages/OrganizerDashboardPage'));

// Loading fallback — plain CSS spinner, no framer-motion transforms
const PageLoader = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="w-16 h-16 border-4 border-[#1E4DB7] border-t-transparent rounded-full animate-spin" />
  </div>
);

// Scroll to top on route change
const ScrollToTop = () => {
  useScrollTop();
  return null;
};

// All routes — NO motion wrappers around pages (motion transforms break fixed positioning on iOS)
const AppRoutes = () => {
  const { toasts, removeToast } = useToast();

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Toast toasts={toasts} removeToast={removeToast} />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events" element={<Suspense fallback={<PageLoader />}><EventsPage /></Suspense>} />
        <Route path="/events/:slug" element={<Suspense fallback={<PageLoader />}><EventDetailPage /></Suspense>} />
        <Route path="/checkout/:slug" element={<Suspense fallback={<PageLoader />}><CheckoutPage /></Suspense>} />
        <Route path="/confirmation/:orderId" element={<Suspense fallback={<PageLoader />}><ConfirmationPage /></Suspense>} />
        <Route path="/search" element={<Suspense fallback={<PageLoader />}><SearchResultsPage /></Suspense>} />
        <Route path="/organizers/:id" element={<Suspense fallback={<PageLoader />}><OrganizerProfilePage /></Suspense>} />
        <Route path="/edit-event/:slug" element={<Suspense fallback={<PageLoader />}><CreateEventPage /></Suspense>} />
        <Route path="/create-event" element={<Suspense fallback={<PageLoader />}><CreateEventPage /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
        <Route path="/signup" element={<Suspense fallback={<PageLoader />}><SignUpPage /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPasswordPage /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
        <Route path="/organizer-profile" element={<Suspense fallback={<PageLoader />}><OrganizerProfilePage /></Suspense>} />
        <Route path="/my-tickets" element={<Suspense fallback={<PageLoader />}><MyTicketsPage /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageLoader />}><AccountSettingsPage /></Suspense>} />
        <Route path="/organizer-dashboard" element={<Suspense fallback={<PageLoader />}><OrganizerDashboardPage /></Suspense>} />
        <Route path="/verify-email" element={<Suspense fallback={<PageLoader />}><EmailVerificationPage /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
      </Routes>

      <Footer />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppRoutes />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
