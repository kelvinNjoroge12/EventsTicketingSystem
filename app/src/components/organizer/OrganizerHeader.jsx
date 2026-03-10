import React, { useEffect, useState } from 'react';
import { Search, Bell, Calendar, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const initialNotifications = [
  { id: 1, title: 'New ticket sale!', message: 'Someone just bought a VIP ticket', time: '2 min ago', read: false },
  { id: 2, title: 'Event reminder', message: 'Your next event starts tomorrow', time: '1 hour ago', read: false },
  { id: 3, title: 'Check-in alert', message: '50 guests have checked in', time: '3 hours ago', read: true },
  { id: 4, title: 'Payment received', message: 'Payout has been processed', time: '5 hours ago', read: true },
];

const OrganizerHeader = ({ title, onMenuClick, showMenu }) => {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [notificationList, setNotificationList] = useState(initialNotifications);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const unreadCount = notificationList.filter((n) => !n.read).length;
  const markAsRead = (id) => {
    setNotificationList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };
  const markAllAsRead = () => {
    setNotificationList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const initials = user?.name
    ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header
      className={cn(
        'fixed top-0 right-0 h-16 z-30 transition-all duration-300 flex items-center justify-between px-4 lg:px-6',
        'lg:left-64 left-0',
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100'
          : 'bg-white border-b border-gray-100'
      )}
    >
      <div className="flex items-center gap-3">
        {showMenu && (
          <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-[#1E4DB7]" />
          </button>
        )}
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-[#0F172A]">{title}</h1>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{currentDate}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search events, guests..."
            className="pl-10 pr-4 w-48 lg:w-64 h-9 rounded-full border-gray-200 focus:border-[#C58B1A] focus:ring-[#C58B1A]/20 transition-all duration-200"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors group">
              <Bell className="w-5 h-5 text-gray-600 group-hover:text-[#C58B1A] transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#B91C1C] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-[#1E4DB7] hover:text-[#C58B1A]">
                  Mark all read
                </button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-auto">
              {notificationList.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn('flex flex-col items-start gap-1 p-3 cursor-pointer', !notification.read && 'bg-[#C58B1A]/5')}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-sm font-medium flex-1">{notification.title}</span>
                    {!notification.read && <span className="w-2 h-2 bg-[#C58B1A] rounded-full" />}
                  </div>
                  <span className="text-xs text-gray-500">{notification.message}</span>
                  <span className="text-xs text-[#C58B1A]">{notification.time}</span>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-[#1E4DB7] font-medium cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C58B1A] to-[#B91C1C] flex items-center justify-center">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[#B91C1C]">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default OrganizerHeader;
