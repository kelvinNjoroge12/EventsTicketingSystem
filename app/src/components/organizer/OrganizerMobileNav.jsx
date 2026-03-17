import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Calendar, QrCode, PlusCircle, Settings, LogOut, Ticket, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const navItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'events', label: 'My Events', icon: Calendar },
  { id: 'checkin', label: 'Check-in', icon: QrCode },
  { id: 'create', label: 'Create Event', icon: PlusCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const OrganizerMobileNav = ({ currentPage, onPageChange, onClose }) => {
  const { user, logout } = useAuth();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
    navigate('/', { replace: true });
  };

  const initials = user?.name
    ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <aside className="h-full w-72 bg-[#1E4DB7] text-white flex flex-col shadow-2xl">
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C58B1A] to-[#FDE68A] flex items-center justify-center flex-shrink-0">
            <Ticket className="w-5 h-5 text-[#1E4DB7]" />
          </div>
          <span className="font-bold text-sm leading-tight">
            Strathmore University
            <span className="block text-[10px] font-semibold text-white/80 tracking-wide uppercase">Event Ticketing</span>
          </span>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id || (item.id === 'events' && currentPage === 'event-detail');

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative',
                isActive
                  ? 'bg-white/10 border-l-4 border-[#C58B1A]'
                  : 'hover:bg-white/5 hover:border-l-4 hover:border-[#C58B1A]/50 border-l-4 border-transparent'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-all duration-200 flex-shrink-0',
                  isActive ? 'text-[#C58B1A]' : 'text-white/70 group-hover:text-[#FDE68A]'
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium whitespace-nowrap transition-all duration-200',
                  isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-[#C58B1A] animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C58B1A] to-[#B91C1C] flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Organizer'}</p>
            <p className="text-xs text-white/50 truncate">{user?.email || 'info@strathmore.edu'}</p>
          </div>
        </div>

        <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <button
            onClick={() => setLogoutDialogOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/70 hover:text-white hover:bg-[#B91C1C]/20 transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-medium">Logout</span>
          </button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be redirected to the login page and your session will be ended.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-[#B91C1C] hover:bg-[#991B1B]">
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </aside>
  );
};

export default OrganizerMobileNav;
