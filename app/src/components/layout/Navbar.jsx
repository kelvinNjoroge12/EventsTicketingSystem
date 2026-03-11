import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OrganizerNavbar from './nav/OrganizerNavbar';
import AttendeeNavbar from './nav/AttendeeNavbar';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

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

  if (isOrganizerArea) {
    return <OrganizerNavbar isScrolled={isScrolled} isActive={isActive} />;
  }

  return <AttendeeNavbar isScrolled={isScrolled} isActive={isActive} />;
};

export default Navbar;
