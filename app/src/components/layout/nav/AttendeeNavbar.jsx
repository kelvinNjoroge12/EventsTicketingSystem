import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Menu, X, User, LogOut, Settings, LayoutDashboard,
  Home, Ticket, TicketCheck
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { api } from '../../../lib/apiClient';
import strathmoreLogo from '../../../assets/strathmore-logo.png';
import { canAccessOrganizerDashboard, isCheckinOnlyUser } from '../../../lib/authAccess';

const AttendeeNavbar = ({ isScrolled, isActive }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const profileRef = useRef(null);

  const isOrganizer = canAccessOrganizerDashboard(user);
  const isCheckInStaff = isCheckinOnlyUser(user);
  const canRequestOrganizer = isAuthenticated && !isOrganizer && !isCheckInStaff;

  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement || typeof window === 'undefined') return undefined;

    const rootStyle = document.documentElement.style;
    const syncNavbarHeight = () => {
      rootStyle.setProperty('--app-navbar-height', `${Math.ceil(headerElement.getBoundingClientRect().height)}px`);
    };

    syncNavbarHeight();
    const resizeObserver = new ResizeObserver(syncNavbarHeight);
    resizeObserver.observe(headerElement);
    window.addEventListener('resize', syncNavbarHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncNavbarHeight);
      rootStyle.removeProperty('--app-navbar-height');
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/', { replace: true });
  };

  const handleRequestOrganizer = async () => {
    try {
      const data = await api.post('/api/auth/request-organizer/', {
        organization_name: `${user.name}'s Organization`
      });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Something went wrong.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request.');
    }
  };

  const primaryNavItems = [
    { name: 'Home', path: '/', icon: Home, type: 'link' },
    ...(isAuthenticated
      ? [{ name: 'My Tickets', path: '/my-tickets', icon: Ticket, type: 'link' }]
      : [{ name: 'Search for My Ticket', path: '/find-ticket', icon: Search, type: 'link' }]),
    ...(canRequestOrganizer
      ? [{ name: 'Request Organizer Access', icon: LayoutDashboard, type: 'action', onClick: handleRequestOrganizer }]
      : []),
    ...(isAuthenticated && isCheckInStaff
      ? [{ name: 'Check-In', path: '/organizer-checkin', icon: TicketCheck, type: 'link' }]
      : []),
  ];

  const profileMenuItems = [
    ...(isOrganizer
      ? [{ name: 'Dashboard', path: '/organizer-dashboard', icon: LayoutDashboard, type: 'link' }]
      : []),
    { name: 'Settings', path: '/settings', icon: Settings, type: 'link' },
  ];

  const renderNavItem = (item, className, onAfterClick = () => {}) => {
    const Icon = item.icon;
    const isLink = item.type !== 'action';
    const active = Boolean(item.path) && isActive(item.path);

    if (isLink) {
      return (
        <Link
          key={item.name}
          to={item.path}
          onClick={onAfterClick}
          className={className(active)}
        >
          {Icon && <Icon className="w-4 h-4" />}
          {item.name}
          {active && item.name !== 'Home' && (
            <motion.div
              layoutId="attendeeNavUnderline"
              className="absolute bottom-1 left-2 right-2 h-0.5 bg-white rounded-full"
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            />
          )}
        </Link>
      );
    }

    return (
      <button
        key={item.name}
        type="button"
        onClick={() => {
          item.onClick?.();
          onAfterClick();
        }}
        className={className(false)}
      >
        {Icon && <Icon className="w-4 h-4" />}
        {item.name}
      </button>
    );
  };

  return (
    <>
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-40 bg-[#02338D] transition-all duration-300 ${isScrolled ? 'shadow-lg bg-[#02338D]/95 backdrop-blur-sm' : ''}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 sm:gap-4 md:h-[7.5rem] md:min-h-0 md:flex-nowrap md:py-0">
            {/* Logo */}
            <Link
              to={isOrganizer ? "/organizer-dashboard" : "/"}
              className="flex items-center flex-shrink-0"
              aria-label="Strathmore University Events Ticketing"
            >
              <img
                src={strathmoreLogo}
                alt="Strathmore University"
                className="h-24 w-24 object-contain"
              />
            </Link>

            {/* Search bar */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-xs items-center"
            >
              <div className="relative w-full group">
                <input
                  type="text"
                  placeholder="Search Strathmore events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 rounded-full bg-white/15 border-2 border-[#ef4444] text-white placeholder:text-white/60 focus:outline-none focus:bg-white/25 focus:border-[#ef4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.3)] text-sm transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#ef4444] text-white hover:bg-[#dc2626] transition-colors"
                  aria-label="Search"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1 flex-shrink-0" role="navigation">
              {primaryNavItems.map((item) =>
                renderNavItem(
                  item,
                  (active) => `
                    relative px-4 py-2 text-sm font-medium transition-all rounded-full flex items-center gap-1.5
                    ${active
                      ? 'text-white bg-white/15'
                      : 'text-white/80 hover:text-white hover:bg-white/10'}
                  `
                )
              )}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAuthenticated ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/30 overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-white hidden sm:block">{user.name?.split(' ')[0]}</span>
                  </button>

                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden z-50 py-1"
                      >
                        <div className="px-4 py-3 border-b border-[#F1F5F9]">
                          <p className="font-bold text-[#0F172A] text-sm truncate">{user.name}</p>
                          <p className="text-xs text-[#64748B] capitalize">{user.role}</p>
                        </div>
                        {profileMenuItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.name}
                              to={item.path}
                              onClick={() => setShowProfileMenu(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]"
                            >
                              <Icon className={`w-4 h-4 ${item.name === 'Dashboard' ? 'text-[#02338D]' : 'text-[#64748B]'}`} />
                              {item.name}
                            </Link>
                          );
                        })}
                        <div className="h-px bg-[#F1F5F9] my-1" />
                        <button
                          onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-1">
                  <Link
                    to="/login"
                    className="text-white/80 text-sm font-semibold px-4 py-2 hover:bg-white/10 hover:text-white rounded-full transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="text-white/80 text-sm font-semibold px-4 py-2 hover:bg-white/10 hover:text-white rounded-full transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/10 bg-[#02338D] overflow-hidden"
            >
              <nav className="px-4 py-4 space-y-1">
                {primaryNavItems.map((item) =>
                  renderNavItem(
                    item,
                    (active) => `
                      flex items-center gap-3 px-5 py-3 rounded-full text-base font-medium transition-colors
                      ${active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}
                    `,
                    () => setIsMobileMenuOpen(false)
                  )
                )}

                <form onSubmit={(e) => { handleSearch(e); setIsMobileMenuOpen(false); }} className="py-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search Strathmore events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-5 pr-10 py-3 rounded-full bg-white/10 border-2 border-[#ef4444] text-white placeholder:text-white/60 text-sm focus:outline-none focus:bg-white/20 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.3)] transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#ef4444] text-white hover:bg-[#dc2626]">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                <div className="pt-4 mt-2 border-t border-white/10 space-y-2">
                  {isAuthenticated ? (
                    <div className="flex flex-col gap-1">
                      {profileMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-5 py-3 text-white/80 font-medium rounded-full hover:bg-white/10 transition-colors"
                          >
                            <Icon className="w-5 h-5" />
                            {item.name}
                          </Link>
                        );
                      })}
                      <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 w-full px-5 py-3 text-left text-white/80 font-medium rounded-full hover:bg-red-500/20 transition-colors">
                        <LogOut className="w-5 h-5" /> Logout
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 pt-2">
                      <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-5 py-3 text-white/80 font-medium rounded-full hover:bg-white/10 transition-colors">
                        Login
                      </Link>
                      <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-5 py-3 text-white/80 font-medium rounded-full hover:bg-white/10 transition-colors">
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <div className="h-[6.5rem] md:h-[7.5rem]" style={{ height: 'var(--app-navbar-height, 7.5rem)' }} />
    </>
  );
};

export default AttendeeNavbar;

