import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import strathmoreLogo from '../../assets/strathmore-logo.png';

const CheckInStaffHeader = ({ title = 'Check-In Staff' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const avatarUrl = user?.avatar || user?.photo || user?.image || user?.profile_image || user?.profileImage;
  const initials = user?.name
    ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#0F172A] text-white border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={strathmoreLogo}
            alt="Strathmore University"
            className="h-12 w-12 object-contain"
          />
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/settings')}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-white/10 hover:bg-white/20"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-white/10 hover:bg-white/20"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name || 'Staff'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{initials}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default CheckInStaffHeader;
