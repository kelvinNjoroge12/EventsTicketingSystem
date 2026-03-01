import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import useScrollTop from './hooks/useScrollTop';
import useToast from './hooks/useToast';
import Toast from './components/ui/Toast';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
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

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <motion.div
      className="w-16 h-16 border-4 border-[#1E4DB7] border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

// Animated page wrapper
const AnimatedPage = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Scroll to top component
const ScrollToTop = () => {
  useScrollTop();
  return null;
};

// Routes with AnimatePresence
const AnimatedRoutes = () => {
  const location = useLocation();
  const { toasts, removeToast } = useToast();

  return (
    <>
      <ScrollToTop />
      <Navbar />

      <Toast toasts={toasts} removeToast={removeToast} />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <HomePage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/events"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <EventsPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/events/:slug"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <EventDetailPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/checkout/:slug"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <CheckoutPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/confirmation/:orderId"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <ConfirmationPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/search"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <SearchResultsPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/organizers/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <OrganizerProfilePage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/edit-event/:slug"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <CreateEventPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/create-event"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <CreateEventPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <LoginPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/signup"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <SignUpPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <ForgotPasswordPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/reset-password"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <ResetPasswordPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/organizer-profile"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <OrganizerProfilePage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/my-tickets"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <MyTicketsPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <AccountSettingsPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/organizer-dashboard"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <OrganizerDashboardPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="/verify-email"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <EmailVerificationPage />
                </AnimatedPage>
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnimatedPage>
                  <NotFoundPage />
                </AnimatedPage>
              </Suspense>
            }
          />
        </Routes>
      </AnimatePresence>

      <Footer />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AnimatedRoutes />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
