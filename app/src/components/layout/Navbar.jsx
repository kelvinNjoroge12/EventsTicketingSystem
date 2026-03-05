import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, Menu, X, User, Plus, CalendarDays, LogOut, Settings, LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useSavedEvents from '../../hooks/useSavedEvents';
import CustomButton from '../ui/CustomButton';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { savedCount } = useSavedEvents();
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  const isOrganizer = user?.role === 'organizer';
  const isOrganizerArea = location.pathname.startsWith('/organizer-dashboard') ||
    location.pathname.startsWith('/create-event') ||
    location.pathname.startsWith('/edit-event');

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
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // ── Organizer Navbar ──────────────────────────────────────────
  if (isOrganizer && isOrganizerArea) {
    return (
      <>
        <a href="#main-content" className="skip-to-main">Skip to main content</a>
        <header
          className={`fixed top-0 left-0 right-0 z-40 bg-[#0F172A] transition-shadow duration-300 ${isScrolled ? 'shadow-xl shadow-black/30' : ''}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/organizer-dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED] flex items-center justify-center">
                  <LayoutDashboard className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-lg tracking-tight">EventHub <span className="text-[#7C3AED] text-sm font-medium">Organizer</span></span>
              </Link>

              {/* Desktop Organizer Nav */}
              <nav className="hidden md:flex items-center gap-1">
                <Link
                  to="/create-event"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" /> Create Event
                </Link>
                <Link
                  to="/organizer-dashboard"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/organizer-dashboard') ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                >
                  <CalendarDays className="w-4 h-4" /> My Events
                </Link>
              </nav>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED] flex items-center justify-center text-white text-sm font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                  <span className="text-white text-sm font-medium hidden md:block">{user?.name?.split(' ')[0]}</span>
                </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-[#F1F5F9]">
                        <p className="font-semibold text-[#0F172A] text-sm">{user?.name}</p>
                        <p className="text-xs text-[#64748B] truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC] transition-colors">
                          <Settings className="w-4 h-4 text-[#64748B]" /> Edit Profile
                        </Link>
                        <button onClick={() => { logout(); setShowProfileMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Organizer Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden border-t border-white/10 bg-[#0F172A] overflow-hidden"
              >
                <nav className="px-4 py-4 space-y-2">
                  <Link to="/create-event" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] text-white text-sm font-semibold">
                    <Plus className="w-4 h-4" /> Create Event
                  </Link>
                  <Link to="/organizer-dashboard" className="flex items-center gap-2 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 text-sm font-medium">
                    <CalendarDays className="w-4 h-4" /> My Events
                  </Link>
                  <Link to="/settings" className="flex items-center gap-2 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 text-sm font-medium">
                    <Settings className="w-4 h-4" /> Edit Profile
                  </Link>
                  <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-[#FC8181] hover:bg-red-500/10 text-sm font-medium">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
        <div className="h-16" />
      </>
    );
  }

  // ── Standard Attendee Navbar ──────────────────────────────────
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Events', path: '/events' },
  ];

  return (
    <>
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-white transition-shadow duration-300 ${isScrolled ? 'shadow-md' : ''}`}
        style={{ overflowX: 'hidden', maxWidth: '100vw' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#1E4DB7]">EventHub</span>
            </Link>

            {/* Desktop Nav + Search */}
            <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
              <nav className="flex items-center gap-1" role="navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`relative px-4 py-2 text-sm font-medium transition-colors ${isActive(link.path) ? 'text-[#1E4DB7]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
                  >
                    {link.name}
                    {isActive(link.path) && (
                      <motion.div
                        layoutId="navUnderline"
                        className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#1E4DB7]"
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      />
                    )}
                  </Link>
                ))}
              </nav>

              <form onSubmit={handleSearch} className="hidden md:flex items-center w-64 lg:w-80">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#ef4444] text-sm text-[#0F172A]"
                  />
                  <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#ef4444] text-white hover:bg-[#b91c1c] transition-colors" aria-label="Search">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Link to="/events" className="relative p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors" aria-label="Saved events">
                <Heart className="w-5 h-5" />
                {savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#DC2626] text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {savedCount > 9 ? '9+' : savedCount}
                  </span>
                )}
              </Link>

              <div className="hidden md:flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative" ref={profileRef}>
                    <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#F1F5F9] transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[#1E4DB7] text-white flex items-center justify-center text-sm font-medium">
                        {user.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                      </div>
                      <span className="text-sm font-medium text-[#0F172A]">{user.name?.split(' ')[0]}</span>
                    </button>
                    <AnimatePresence>
                      {showProfileMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden z-50"
                        >
                          <div className="px-4 py-3 border-b border-[#F1F5F9]">
                            <p className="font-semibold text-[#0F172A] text-sm">{user.name}</p>
                            <p className="text-xs text-[#64748B] truncate">{user.email}</p>
                          </div>
                          <div className="py-1">
                            {user.role === 'organizer' && (
                              <Link to="/organizer-dashboard" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                                <LayoutDashboard className="w-4 h-4 text-[#1E4DB7]" /> Organizer Dashboard
                              </Link>
                            )}
                            <Link to="/my-tickets" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                              My Tickets
                            </Link>
                            <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                              <Settings className="w-4 h-4 text-[#64748B]" /> Settings
                            </Link>
                            <button onClick={() => { logout(); setShowProfileMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#DC2626] hover:bg-[#FEF2F2]">
                              <LogOut className="w-4 h-4" /> Logout
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <>
                    <Link to="/login"><CustomButton variant="ghost" size="sm">Login</CustomButton></Link>
                    <Link to="/signup"><CustomButton variant="primary" size="sm">Sign Up</CustomButton></Link>
                  </>
                )}
              </div>

              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors" aria-label="Menu">
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
              className="md:hidden border-t border-[#E2E8F0] bg-white overflow-hidden"
            >
              <nav className="px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link key={link.name} to={link.path} className={`block px-4 py-3 rounded-lg text-base font-medium ${isActive(link.path) ? 'bg-[#EFF6FF] text-[#1E4DB7]' : 'text-[#64748B] hover:bg-[#F1F5F9]'}`}>
                    {link.name}
                  </Link>
                ))}

                <form onSubmit={handleSearch} className="pt-2">
                  <div className="relative">
                    <input type="text" placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-sm focus:outline-none" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#ef4444] text-white">
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

                <div className="pt-4 border-t border-[#E2E8F0] space-y-2">
                  {isAuthenticated ? (
                    <>
                      <Link to={user.role === 'organizer' ? '/organizer-dashboard' : '/my-tickets'} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#F1F5F9]">
                        <div className="w-10 h-10 rounded-full bg-[#1E4DB7] text-white flex items-center justify-center">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#0F172A]">{user.name}</p>
                          <p className="text-sm text-[#64748B]">{user.role === 'organizer' ? 'Dashboard' : 'My Tickets'}</p>
                        </div>
                      </Link>
                      <Link to="/settings" className="block px-4 py-3 text-[#0F172A] font-medium rounded-lg hover:bg-[#F1F5F9]">Settings</Link>
                      <button onClick={logout} className="w-full px-4 py-3 text-left text-[#DC2626] font-medium rounded-lg hover:bg-[#FEF2F2]">Logout</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login"><CustomButton variant="outline" fullWidth>Login</CustomButton></Link>
                      <Link to="/signup"><CustomButton variant="primary" fullWidth>Sign Up</CustomButton></Link>
                    </>
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
