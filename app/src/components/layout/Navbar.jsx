import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Menu, X, User, Plus, CalendarDays, LogOut, Settings, LayoutDashboard,
  Home, Ticket,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import CustomButton from '../ui/CustomButton';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  // Organizer nav is ONLY shown on organizer-specific pages
  const isOrganizerArea = isOrganizer && (
    location.pathname.startsWith('/organizer-dashboard') ||
    location.pathname.startsWith('/create-event') ||
    location.pathname.startsWith('/edit-event')
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const isActive = (path) => {
    const [pathPart, searchPart] = path.split('?');
    if (pathPart === '/') return location.pathname === '/';
    if (searchPart) {
      const currentTab = new URLSearchParams(location.search).get('tab') || 'overview';
      const targetTab = new URLSearchParams('?' + searchPart).get('tab');
      return location.pathname === pathPart && currentTab === targetTab;
    }
    return location.pathname.startsWith(pathPart);
  };

  // ─── ORGANIZER NAVBAR ──────────────────────────────────────────
  if (isOrganizerArea) {
    const orgLinks = [
      { name: 'Home', path: '/organizer-dashboard?tab=overview', icon: Home },
      { name: 'My Events', path: '/organizer-dashboard?tab=events', icon: CalendarDays },
      { name: 'Check-In', path: '/organizer-dashboard?tab=checkin', icon: Ticket },
    ];

    return (
      <>
        <a href="#main-content" className="skip-to-main">Skip to main content</a>
        <header
          className={`fixed top-0 left-0 right-0 z-40 bg-[#1E4DB7] transition-all duration-300 ${isScrolled ? 'shadow-lg bg-[#1E4DB7]/95 backdrop-blur-sm' : ''}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between min-h-[4rem] py-2 gap-2">
              {/* Logo */}
              <Link to="/organizer-dashboard" className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xl font-bold text-white tracking-tight">EventHub</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">Organizer</span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1" role="navigation">
                {orgLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`
                      relative px-4 py-2 text-sm font-medium transition-all rounded-full flex items-center gap-1.5
                      ${isActive(link.path)
                        ? 'text-white bg-white/15'
                        : 'text-white/80 hover:text-white hover:bg-white/10'}
                    `}
                  >
                    {link.icon && <link.icon className="w-4 h-4" />}
                    {link.name}
                    {isActive(link.path) && (
                      <motion.div
                        layoutId="orgNavUnderline"
                        className="absolute bottom-1 left-2 right-2 h-0.5 bg-white rounded-full"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      />
                    )}
                  </Link>
                ))}
                {/* Create Event */}
                <Link
                  to="/create-event"
                  className={`
                    relative px-4 py-2 text-sm font-medium transition-all rounded-full flex items-center gap-1.5
                    ${isActive('/create-event')
                      ? 'text-white bg-white/15'
                      : 'text-white/80 hover:text-white hover:bg-white/10'}
                  `}
                >
                  <Plus className="w-4 h-4" />
                  Create Event
                </Link>
              </nav>

              {/* Profile */}
              <div className="flex items-center gap-2">
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/30 overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-white hidden sm:block">{user?.name?.split(' ')[0]}</span>
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
                          <p className="font-bold text-[#0F172A] text-sm truncate">{user?.name}</p>
                          <p className="text-xs text-[#64748B] capitalize">{user?.role}</p>
                        </div>
                        <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                          <Settings className="w-4 h-4 text-[#64748B]" /> Settings
                        </Link>
                        <div className="h-px bg-[#F1F5F9] my-1" />
                        <button onClick={() => { handleLogout(); setShowProfileMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile hamburger */}
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

          {/* Mobile Organizer Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden border-t border-white/10 bg-[#1E4DB7] overflow-hidden"
              >
                <nav className="px-4 py-4 space-y-1">
                  {orgLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-5 py-3 rounded-full text-base font-medium transition-colors
                        ${isActive(link.path) ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                    >
                      {link.icon && <link.icon className="w-5 h-5" />}
                      {link.name}
                    </Link>
                  ))}
                  <Link
                    to="/create-event"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3 rounded-full text-base font-medium transition-colors
                        ${isActive('/create-event') ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                  >
                    <Plus className="w-5 h-5" /> Create Event
                  </Link>
                  <div className="pt-3 mt-3 border-t border-white/10 space-y-1">
                    <Link
                      to="/settings"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-5 py-3 text-white/80 font-medium rounded-full hover:bg-white/10"
                    >
                      <Settings className="w-5 h-5" /> Settings
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-5 py-3 text-left text-white/80 font-medium rounded-full hover:bg-red-500/20"
                    >
                      <LogOut className="w-5 h-5" /> Logout
                    </button>
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
        <div className="h-16" />
      </>
    );
  }

  // ─── STANDARD / ATTENDEE NAVBAR ───────────────────────────────
  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Create Event', path: isOrganizer ? '/create-event' : '/sell-tickets', icon: Plus },
    ...(isAuthenticated ?
      [{ name: 'My Tickets', path: '/my-tickets', icon: Ticket }] :
      [{ name: 'Search for My Ticket', path: '/find-ticket', icon: Search }]),
  ];

  return (
    <>
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-[#1E4DB7] transition-all duration-300 ${isScrolled ? 'shadow-lg bg-[#1E4DB7]/95 backdrop-blur-sm' : ''}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between min-h-[4rem] py-2 gap-2 sm:gap-4">
            {/* Logo */}
            <Link to={isOrganizer ? "/organizer-dashboard" : "/"} className="flex-shrink-0">
              <span className="text-xl font-bold text-white tracking-tight">EventHub</span>
            </Link>

            {/* Search bar – moved to the left after logo */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-xs items-center"
            >
              <div className="relative w-full group">
                <input
                  type="text"
                  placeholder="Search events..."
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
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`
                    relative px-4 py-2 text-sm font-medium transition-all rounded-full flex items-center gap-1.5
                    ${isActive(link.path)
                      ? 'text-white bg-white/15'
                      : 'text-white/80 hover:text-white hover:bg-white/10'}
                  `}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.name}
                  {isActive(link.path) && (
                    <motion.div
                      layoutId="attendeeNavUnderline"
                      className="absolute bottom-1 left-2 right-2 h-0.5 bg-white rounded-full"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                </Link>
              ))}
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
                        {isOrganizer && (
                          <Link to="/organizer-dashboard" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                            <LayoutDashboard className="w-4 h-4 text-[#1E4DB7]" /> Dashboard
                          </Link>
                        )}
                        <Link to="/my-tickets" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                          <Ticket className="w-4 h-4 text-[#1E4DB7]" /> My Tickets
                        </Link>
                        <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                          <Settings className="w-4 h-4 text-[#64748B]" /> Settings
                        </Link>
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
              className="md:hidden border-t border-white/10 bg-[#1E4DB7] overflow-hidden"
            >
              <nav className="px-4 py-4 space-y-1">
                {/* 1. Home Link */}
                {navLinks.filter(l => l.name === 'Home').map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-5 py-3 rounded-full text-base font-medium transition-colors
                      ${isActive(link.path) ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    {link.icon && <link.icon className="w-5 h-5" />}
                    {link.name}
                  </Link>
                ))}

                {/* 2. Mobile Search - Immediately after home */}
                <form onSubmit={(e) => { handleSearch(e); setIsMobileMenuOpen(false); }} className="py-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-5 pr-10 py-3 rounded-full bg-white/10 border-2 border-[#ef4444] text-white placeholder:text-white/60 text-sm focus:outline-none focus:bg-white/20 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.3)] transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#ef4444] text-white hover:bg-[#dc2626]">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* 3. The rest of the navLinks */}
                {navLinks.filter(l => l.name !== 'Home').map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-5 py-3 rounded-full text-base font-medium transition-colors
                      ${isActive(link.path) ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    {link.icon && <link.icon className="w-5 h-5" />}
                    {link.name}
                  </Link>
                ))}

                <div className="pt-4 mt-2 border-t border-white/10 space-y-2">
                  {isAuthenticated ? (
                    <div className="flex flex-col gap-1">
                      {isOrganizer && (
                        <Link to="/organizer-dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-5 py-3 text-white/80 font-medium rounded-full hover:bg-white/10 transition-colors">
                          <LayoutDashboard className="w-5 h-5" /> Dashboard
                        </Link>
                      )}
                      <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-5 py-3 text-white/80 font-medium rounded-full hover:bg-white/10 transition-colors">
                        <Settings className="w-5 h-5" /> Settings
                      </Link>
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
      <div className="h-16" />
    </>
  );
};

export default Navbar;
