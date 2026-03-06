import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Send
} from 'lucide-react';
import CustomButton from '../ui/CustomButton';
import CustomInput from '../ui/CustomInput';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { pathname } = useLocation();

  const isDashboard = pathname.startsWith('/organizer-dashboard');

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setIsSubscribed(true);
      setEmail('');
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  const footerLinks = {
    Platform: [
      { name: 'Home', path: '/' },
      { name: 'Events', path: '/events' },
      { name: 'Categories', path: '/events' },
    ],
    Organizers: [
      { name: 'Create Event', path: '/create-event' },
      { name: 'Dashboard', path: '/organizer-profile' },
      { name: 'Pricing', path: '#' },
    ],
    Company: [
      { name: 'About', path: '#' },
      { name: 'Blog', path: '#' },
      { name: 'Careers', path: '#' },
      { name: 'Contact', path: '#' },
    ],
    Legal: [
      { name: 'Terms', path: '#' },
      { name: 'Privacy', path: '#' },
      { name: 'Cookie Policy', path: '#' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  return (
    <footer className="bg-[#1E4DB7] text-white">
      {/* Main Footer */}
      {!isDashboard && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            {/* Logo & Tagline */}
            <div className="lg:col-span-2">
              <Link to="/" className="inline-block">
                <span className="text-2xl font-bold text-white">EventHub</span>
              </Link>
              <p className="mt-4 text-white/70 text-sm max-w-xs">
                Discover amazing events near you. Find, RSVP, and attend events that match your interests.
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3 mt-6">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="font-semibold text-white mb-4">{title}</h3>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.path}
                        className="text-white/70 hover:text-white transition-colors text-sm"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h3 className="font-semibold text-white mb-1">
                  Stay updated on events near you
                </h3>
                <p className="text-white/70 text-sm">
                  Get weekly updates on the best events in your city.
                </p>
              </div>
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-md w-full md:w-auto">
                <CustomInput
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  inputClassName="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                <CustomButton
                  type="submit"
                  variant="primary"
                  leftIcon={Send}
                  className="whitespace-nowrap bg-white text-[#1E4DB7] hover:bg-white/90 border-0"
                >
                  {isSubscribed ? 'Subscribed!' : 'Subscribe'}
                </CustomButton>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className={!isDashboard ? "border-t border-white/10" : ""}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className={`flex flex-col md:flex-row md:items-center ${!isDashboard ? 'md:justify-between' : 'justify-center'} gap-2 text-sm text-white/60`}>
            <p className={isDashboard ? "text-center w-full" : ""}>&copy; {new Date().getFullYear()} EventHub. All rights reserved.</p>
            {!isDashboard && (
              <p className="flex items-center gap-1">
                Made with <span className="text-white">❤️</span> in Nairobi
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
