import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Heart,
  Menu,
  X,
  ChevronDown,
  User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useSavedEvents from '../../hooks/useSavedEvents';
import CustomButton from '../ui/CustomButton';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuth();
  const { savedCount } = useSavedEvents();
  const location = useLocation();
  const navigate = useNavigate();

  // Track scroll for shadow effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Events', path: '/events' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      <motion.header
        className={`
          fixed top-0 left-0 w-full z-40 bg-white max-w-[100vw] overflow-x-hidden
          transition-shadow duration-300
          ${isScrolled ? 'shadow-md' : ''}
        `}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#1E4DB7]">EventHub</span>
            </Link>

            {/* Desktop Navigation & Search */}
            <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
              <nav className="flex items-center gap-1" role="navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`
                      relative px-4 py-2 text-sm font-medium transition-colors
                      ${isActive(link.path) ? 'text-[#1E4DB7]' : 'text-[#64748B] hover:text-[#0F172A]'}
                    `}
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

              {/* Inline search bar */}
              <form onSubmit={handleSearch} className="hidden md:flex items-center w-64 lg:w-80">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#ef4444] text-sm text-[#0F172A]"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#ef4444] text-white hover:bg-[#b91c1c] transition-colors"
                    aria-label="Search events"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">

              {/* Saved Events */}
              <Link
                to="/events"
                className="relative p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
                aria-label={`Saved events (${savedCount})`}
              >
                <Heart className="w-5 h-5" />
                {savedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#DC2626] text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {savedCount > 9 ? '9+' : savedCount}
                  </span>
                )}
              </Link>

              {/* Auth Buttons - Desktop */}
              <div className="hidden md:flex items-center gap-2">
                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <Link
                      to={user.role === 'organizer' ? '/organizer-dashboard' : '/my-tickets'}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                      title={user.role === 'organizer' ? 'Dashboard' : 'My Tickets'}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#1E4DB7] text-white flex items-center justify-center text-sm font-medium">
                        {user.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                      </div>
                      <span className="text-sm font-medium text-[#0F172A]">{user.name?.split(' ')[0]}</span>
                    </Link>
                    <Link to="/settings" className="text-sm text-[#64748B] hover:text-[#0F172A] transition-colors">
                      Settings
                    </Link>
                    <button
                      onClick={logout}
                      className="text-sm text-[#64748B] hover:text-[#DC2626] transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <>
                    <Link to="/login">
                      <CustomButton variant="ghost" size="sm">Login</CustomButton>
                    </Link>
                    <Link to="/signup">
                      <CustomButton variant="primary" size="sm">Sign Up</CustomButton>
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-[#E2E8F0] overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                    <input
                      type="text"
                      placeholder="Search events, categories, or keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E4DB7] focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <CustomButton type="submit" variant="primary">Search</CustomButton>
                  <CustomButton type="button" variant="ghost" onClick={() => setIsSearchOpen(false)}>
                    Cancel
                  </CustomButton>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-[#E2E8F0] overflow-hidden bg-white"
            >
              <nav className="px-4 py-4 space-y-1" role="navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`
                      block px-4 py-3 rounded-lg text-base font-medium
                      ${isActive(link.path)
                        ? 'bg-[#EFF6FF] text-[#1E4DB7]'
                        : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'}
                    `}
                  >
                    {link.name}
                  </Link>
                ))}

                <div className="pt-4 border-t border-[#E2E8F0] mt-4 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <Link
                        to={user.role === 'organizer' ? '/organizer-dashboard' : '/my-tickets'}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#F1F5F9]"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#1E4DB7] text-white flex items-center justify-center">
                          {user.name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-[#0F172A]">{user.name}</p>
                          <p className="text-sm text-[#64748B]">{user.role === 'organizer' ? 'Dashboard' : 'My Tickets'}</p>
                        </div>
                      </Link>
                      <Link
                        to="/settings"
                        className="block w-full px-4 py-3 text-left text-[#0F172A] font-medium rounded-lg hover:bg-[#F1F5F9]"
                      >
                        Settings
                      </Link>
                      <button
                        onClick={logout}
                        className="w-full px-4 py-3 text-left text-[#DC2626] font-medium rounded-lg hover:bg-[#FEF2F2]"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login">
                        <CustomButton variant="outline" fullWidth>Login</CustomButton>
                      </Link>
                      <Link to="/signup">
                        <CustomButton variant="primary" fullWidth>Sign Up</CustomButton>
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  );
};

export default Navbar;
