import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Menu, X, User, Plus, CalendarDays, LogOut, Settings, LayoutDashboard,
  Users, Wallet, Home,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useSavedEvents from '../../hooks/useSavedEvents';
import CustomButton from '../ui/CustomButton';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { savedCount } = useSavedEvents();
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

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

  const navLinks = isOrganizer ? [
    { name: 'Home', path: '/organizer-dashboard?tab=overview', icon: Home },
    { name: 'Attendees', path: '/organizer-dashboard?tab=attendees', icon: Users },
    { name: 'Finance', path: '/organizer-dashboard?tab=finances', icon: Wallet },
    { name: 'My Events', path: '/organizer-dashboard?tab=events', icon: CalendarDays },
    { name: 'Create Event', path: '/create-event', icon: Plus, highlight: true },
  ] : [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Events', path: '/events', icon: CalendarDays },
  ];

  return (
    <>
      <a href="#main-content" className="skip-to-main">Skip to main content</a>
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-[#1E4DB7] transition-all duration-300 ${isScrolled ? 'shadow-lg bg-[#1E4DB7]/95 backdrop-blur-sm' : ''}`}
        style={{ overflowX: 'hidden', maxWidth: '100vw' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={isOrganizer ? "/organizer-dashboard" : "/"} className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">EventHub</span>
              {isOrganizer && <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">Organizer</span>}
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1" role="navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`
                    relative px-4 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-2
                    ${link.highlight
                      ? 'bg-white text-[#1E4DB7] hover:bg-white/90 shadow-sm ml-2'
                      : isActive(link.path)
                        ? 'text-white bg-white/10'
                        : 'text-white/80 hover:text-white hover:bg-white/10'}
                  `}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.name}
                  {isActive(link.path) && !link.highlight && (
                    <motion.div
                      layoutId="navUnderline"
                      className="absolute bottom-1 left-2 right-2 h-0.5 bg-white rounded-full"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {!isOrganizer && (
                <Link to="/events" className="relative p-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors" aria-label="Saved events">
                  <Heart className="w-5 h-5" />
                  {savedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ef4444] text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[#1E4DB7]">
                      {savedCount > 9 ? '9+' : savedCount}
                    </span>
                  )}
                </Link>
              )}

              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center text-sm font-bold border border-white/30">
                        {user.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
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
                            <p className="text-xs text-[#64748B] truncate">{user.role}</p>
                          </div>

                          {isOrganizer && (
                            <Link to="/organizer-dashboard" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                              <LayoutDashboard className="w-4 h-4 text-[#1E4DB7]" /> Dashboard
                            </Link>
                          )}
                          {!isOrganizer && (
                            <Link to="/my-tickets" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                              <CalendarDays className="w-4 h-4 text-[#1E4DB7]" /> My Tickets
                            </Link>
                          )}
                          <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC]">
                            <Settings className="w-4 h-4 text-[#64748B]" /> Settings
                          </Link>
                          <div className="h-px bg-[#F1F5F9] my-1" />
                          <button
                            onClick={() => { logout(); setShowProfileMenu(false); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                          >
                            <LogOut className="w-4 h-4" /> Logout
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link to="/login" className="text-white text-sm font-semibold px-4 py-2 hover:bg-white/10 rounded-lg transition-colors">Login</Link>
                    <Link to="/signup">
                      <CustomButton size="sm" className="bg-white text-[#1E4DB7] hover:bg-white/90 border-0">Sign Up</CustomButton>
                    </Link>
                  </div>
                )}
              </div>

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
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors
                      ${isActive(link.path) ? 'bg-white/10 text-white shadow-inner' : 'text-white/80 hover:bg-white/10 hover:text-white'}
                      ${link.highlight ? 'bg-white !text-[#1E4DB7] mt-2' : ''}
                    `}
                  >
                    {link.icon && <link.icon className="w-5 h-5" />}
                    {link.name}
                  </Link>
                ))}

                <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
                  {isAuthenticated ? (
                    <div className="flex flex-col gap-1">
                      <Link to="/settings" className="flex items-center gap-3 px-4 py-3 text-white/80 font-medium rounded-xl hover:bg-white/10">
                        <Settings className="w-5 h-5" /> Settings
                      </Link>
                      <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 text-left text-white/80 font-medium rounded-xl hover:bg-red-500/20">
                        <LogOut className="w-5 h-5" /> Logout
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Link to="/login"><CustomButton variant="outline" fullWidth className="border-white text-white hover:bg-white/10">Login</CustomButton></Link>
                      <Link to="/signup"><CustomButton variant="primary" fullWidth className="bg-white text-[#1E4DB7] border-0 hover:bg-white/90">Sign Up</CustomButton></Link>
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
