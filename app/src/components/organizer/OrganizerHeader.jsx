import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Bell, Calendar, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/eventsApi';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const apiList = (value) => (Array.isArray(value) ? value : value?.results || []);

const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const OrganizerHeader = ({ title, onMenuClick, showMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(),
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unread_count'],
    queryFn: fetchUnreadCount,
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const notifications = useMemo(() => {
    const items = apiList(notificationsData);
    return items
      .map((item, index) => {
        const title = item.title || item.subject || item.notification_type || item.type || '';
        const message = item.message || item.body || item.description || '';
        return {
          id: item.id ?? item.notification_id ?? item.uuid ?? `${index}`,
          title,
          message,
          time: item.time || formatRelativeTime(item.created_at || item.timestamp || item.date),
          read: item.read ?? item.is_read ?? false,
        };
      })
      .filter((item) => item.title || item.message);
  }, [notificationsData]);

  const unreadCount = unreadCountData ?? notifications.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread_count'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update notification.');
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread_count'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update notifications.');
    },
  });

  const markAsRead = (id) => {
    if (!id) return;
    markReadMutation.mutate(id);
  };
  const markAllAsRead = () => markAllMutation.mutate();

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
        'fixed top-0 right-0 h-16 z-40 transition-all duration-300 flex items-center justify-between px-4 lg:px-6',
        'lg:left-64 left-0',
        scrolled
          ? 'bg-[#1E4DB7]/95 backdrop-blur-xl shadow-md border-b border-[#163B90]'
          : 'bg-[#1E4DB7] border-b border-[#163B90]'
      )}
    >
      <div className="flex items-center gap-3">
        {showMenu && (
          <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Menu className="w-5 h-5 text-white" />
          </button>
        )}
        {title ? (
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-white">{title}</h1>
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/70">
              <Calendar className="w-3 h-3 text-white/70" />
              <span>{currentDate}</span>
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-xs text-white/70">
            <Calendar className="w-3 h-3 text-white/70" />
            <span>{currentDate}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
          <Input
            type="text"
            placeholder="Search events, guests..."
            className="pl-10 pr-4 w-48 lg:w-64 h-9 rounded-full border border-white/20 bg-white/10 text-white placeholder:text-white/60 focus:border-[#FDE68A] focus:ring-[#FDE68A]/30 transition-all duration-200"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors group">
              <Bell className="w-5 h-5 text-white/80 group-hover:text-[#FDE68A] transition-colors" />
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
              {notifications.length > 0 ? (
                notifications.map((notification) => (
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
                ))
              ) : (
                <div className="p-4 text-sm text-gray-500 text-center">No notifications yet.</div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-[#1E4DB7] font-medium cursor-pointer"
              onClick={() => navigate('/organizer-dashboard?tab=settings')}
            >
              Notification settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C58B1A] to-[#B91C1C] flex items-center justify-center">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/organizer-profile')}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/organizer-dashboard?tab=settings')}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[#B91C1C]" onClick={logout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default OrganizerHeader;
