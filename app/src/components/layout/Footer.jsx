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
    'Strathmore University': [
      { name: 'Brand Guidelines', href: 'https://strathmore.edu/brand-guidelines/' },
      { name: 'Lectures Guide for Online Learning', href: 'https://strathmore.edu/lectures-guide-for-online-learning/' },
      { name: 'Graduation Policy', href: 'https://strathmore.edu/graduation-policy/' },
      { name: 'Lecturers Regulations for Live Video Class', href: 'https://strathmore.edu/wp-content/uploads/2023/06/Draft-SU-Online-Live-Class-Regulations-lecturers.pdf' },
      { name: 'Students Regulations for Live Video Class', href: 'https://strathmore.edu/wp-content/uploads/2023/06/Draft-SU-Online-Live-Class-Regulations-students.pdf' },
      { name: 'Strathmore Medical Service Providers', href: 'https://strathmore.edu/strathmore-medical-service-providers/' },
      { name: 'ICT Services', href: 'https://icts.strathmore.edu/' },
    ],
    'Quick Links': [
      { name: 'SAGANA', href: 'https://sagana.strathmore.edu/' },
      { name: "Students' e-Learning System", href: 'https://masomo.strathmore.edu/' },
      { name: "AMS Students' Module", href: 'https://su-sso.strathmore.edu/susams/' },
      { name: "Vice Chancellor's Blog", href: 'https://strathmore.edu/vice-chancellors-blog/' },
      { name: 'FAQS', href: 'https://strathmore.edu/faqs/' },
    ],
  };

  const footerBottomLinks = [
    { name: 'University Relations & Communications', href: 'https://strathmore.edu/communication-office/' },
    { name: 'Data Privacy Policy', href: 'https://strathmore.edu/fr/privacy-policy/' },
    { name: 'Legal Notice', href: 'https://strathmore.edu/legal-notice/' },
    { name: 'Whistle Blowing Platform', href: 'https://strathmore.edu/whistle-blowing-platform/' },
    { name: 'Contact Us', href: 'https://strathmore.edu/contacts/' },
    { name: 'Cookie Policy (EU)', href: 'https://strathmore.edu/cookie-policy-eu/' },
  ];

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  return (
    <footer className="bg-[#02338D] text-white">
      {/* Main Footer */}
      {!isDashboard && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            {/* Logo & Tagline */}
            <div className="lg:col-span-2">
              <p className="mt-4 text-white/70 text-sm max-w-xs">
                Official ticketing platform for Strathmore University-organized and affiliated events for alumni, students, and corporate guests.
              </p>
              <div className="mt-5 text-sm text-white/70 space-y-1">
                <p>Ole Sangale Road, Madaraka Estate</p>
                <p>P.O. Box 59857, 00200, Nairobi, Kenya</p>
                <p>Tel: +254 703 034 000 / +254 703 034 200</p>
                <p>Email: info@strathmore.edu</p>
                <a href="https://strathmore.edu/" target="_blank" rel="noreferrer" className="inline-block hover:text-white">
                  Website: strathmore.edu
                </a>
              </div>

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
                      {link.href?.startsWith('http') ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white/70 hover:text-white transition-colors text-sm"
                        >
                          {link.name}
                        </a>
                      ) : (
                        <Link
                          to={link.href || '#'}
                          className="text-white/70 hover:text-white transition-colors text-sm"
                        >
                          {link.name}
                        </Link>
                      )}
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
                  Stay updated on Strathmore events
                </h3>
                <p className="text-white/70 text-sm">
                  Receive weekly highlights, ticket alerts, and official updates.
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
                  className="whitespace-nowrap bg-white text-[#02338D] hover:bg-white/90 border-0"
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
          <div className={`flex flex-col md:flex-row md:items-center ${!isDashboard ? 'md:justify-between' : 'justify-center'} gap-3 text-sm text-white/60`}>
            <p className={isDashboard ? "text-center w-full" : ""}>
              &copy; {new Date().getFullYear()} Strathmore University. All Rights Reserved.
            </p>
            {!isDashboard && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {footerBottomLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


