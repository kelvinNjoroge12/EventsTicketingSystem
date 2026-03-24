import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  User,
  Bell,
  CreditCard,
  Shield,
  Users,
  Link,
  ArrowUpRight,
  RefreshCcw,
  Camera,
  Mail,
  Phone,
  Save,
  Check,
  Plus,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  fetchIntegrations,
  connectIntegration,
  disconnectIntegration,
  fetchTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
  fetchSecuritySettings,
  updateTwoFactor,
  fetchSessions,
  revokeSession,
  fetchPaymentSettings,
  createStripeConnectLink,
  createStripeDashboardLink,
} from '@/lib/organizerSettingsApi';

const DEFAULT_NOTIFICATIONS = {
  emailNewSales: true,
  emailEventReminders: true,
  emailMarketing: false,
  pushCheckIns: true,
  pushEventUpdates: true,
  smsImportant: false,
};

const INTEGRATION_COLORS = {
  Mailchimp: '#FFE01B',
  Zapier: '#FF4A00',
  Slack: '#4A154B',
  'Google Analytics': '#E37400',
  Zoom: '#2D8CFF',
  HubSpot: '#FF7A59',
};

const FALLBACK_INTEGRATIONS = [
  { id: 'mailchimp', name: 'Mailchimp', description: 'Email marketing', connected: false },
  { id: 'zapier', name: 'Zapier', description: 'Automation', connected: false },
  { id: 'slack', name: 'Slack', description: 'Team messaging', connected: false },
  { id: 'google-analytics', name: 'Google Analytics', description: 'Analytics', connected: false },
  { id: 'zoom', name: 'Zoom', description: 'Video conferencing', connected: false },
  { id: 'hubspot', name: 'HubSpot', description: 'CRM', connected: false },
];

const normalizeProfile = (profile) => ({
  firstName: profile?.first_name || '',
  lastName: profile?.last_name || '',
  email: profile?.email || '',
  phone: profile?.phone_number || '',
  bio: profile?.organizer_profile?.organization_bio || profile?.organizer_profile?.bio || '',
  company: profile?.organizer_profile?.organization_name || profile?.company || '',
  website: profile?.organizer_profile?.website || profile?.website || '',
  avatar: profile?.organizer_profile?.logo || profile?.avatar || '',
});

const normalizeNotifications = (data) => {
  const source = data?.preferences || data || {};
  return {
    emailNewSales: source.email_new_sales ?? source.emailNewSales ?? DEFAULT_NOTIFICATIONS.emailNewSales,
    emailEventReminders: source.email_event_reminders ?? source.emailEventReminders ?? DEFAULT_NOTIFICATIONS.emailEventReminders,
    emailMarketing: source.email_marketing ?? source.emailMarketing ?? DEFAULT_NOTIFICATIONS.emailMarketing,
    pushCheckIns: source.push_check_ins ?? source.pushCheckIns ?? DEFAULT_NOTIFICATIONS.pushCheckIns,
    pushEventUpdates: source.push_event_updates ?? source.pushEventUpdates ?? DEFAULT_NOTIFICATIONS.pushEventUpdates,
    smsImportant: source.sms_important ?? source.smsImportant ?? DEFAULT_NOTIFICATIONS.smsImportant,
  };
};

const buildNotificationPayload = (prefs) => ({
  email_new_sales: prefs.emailNewSales,
  email_event_reminders: prefs.emailEventReminders,
  email_marketing: prefs.emailMarketing,
  push_check_ins: prefs.pushCheckIns,
  push_event_updates: prefs.pushEventUpdates,
  sms_important: prefs.smsImportant,
});

const normalizeIntegrations = (data) => {
  const list = Array.isArray(data) ? data : data?.results || [];
  if (list.length === 0) return FALLBACK_INTEGRATIONS;
  return list.map((item) => ({
    id: item.id || item.key || item.slug || item.name?.toLowerCase().replace(/\s+/g, '-') || '',
    name: item.name || item.label || 'Integration',
    description: item.description || item.desc || '',
    connected: item.connected ?? item.is_connected ?? false,
  }));
};

const normalizeTeamMembers = (data) => {
  const list = Array.isArray(data) ? data : data?.results || [];
  return list.map((member) => ({
    id: member.id || member.user_id || member.uuid,
    name: member.name || [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Team Member',
    email: member.email || member.user_email || '',
    role: member.role || member.permission || 'Check-in',
    assignedEvents: member.assigned_events || member.event_ids || member.event_ids || [],
  }));
};

const normalizeSessions = (data) => {
  const list = Array.isArray(data) ? data : data?.results || [];
  return list.map((session) => ({
    id: session.id || session.session_id || session.uuid,
    device: session.device || session.browser || 'Unknown device',
    location: session.location || session.ip_location || 'Unknown location',
    current: session.current ?? session.is_current ?? false,
  }));
};

const normalizePaymentSettings = (data) => ({
  stripeEnabled: data?.stripe_enabled ?? data?.stripeEnabled ?? false,
  stripeAccountId: data?.stripe_account_id ?? data?.stripeAccountId ?? '',
  connected: data?.connected ?? Boolean(data?.stripe_account_id),
  chargesEnabled: data?.charges_enabled ?? data?.chargesEnabled ?? false,
  payoutsEnabled: data?.payouts_enabled ?? data?.payoutsEnabled ?? false,
  detailsSubmitted: data?.details_submitted ?? data?.detailsSubmitted ?? false,
  requirements: data?.requirements ?? {},
  disabledReason: data?.disabled_reason ?? data?.disabledReason ?? '',
  status: data?.status ?? (data?.stripe_account_id ? 'pending' : 'not_connected'),
  stripeError: data?.stripe_error ?? '',
});

const OrganizerSettings = ({ events = [], onTabChange }) => {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(() => normalizeProfile(user));
  const [avatarFile, setAvatarFile] = useState(null);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [integrations, setIntegrations] = useState(FALLBACK_INTEGRATIONS);
  const [teamMembers, setTeamMembers] = useState([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'checkin', eventId: 'none' });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSupported, setTwoFactorSupported] = useState(false);

  const allowedSettingsTabs = useMemo(
    () => ['profile', 'notifications', 'payment', 'team', 'integrations', 'security'],
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const desiredTab =
      params.get('settingsTab') ||
      params.get('settings_tab') ||
      params.get('section') ||
      '';
    const normalized = desiredTab.toLowerCase();
    if (allowedSettingsTabs.includes(normalized)) {
      setActiveTab(normalized);
    }
  }, [location.search, allowedSettingsTabs]);

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  const eventOptions = useMemo(
    () => events.map((event) => ({ id: String(event.id), slug: event.slug, label: event.name })),
    [events]
  );
  const eventLookup = useMemo(() => {
    const lookup = {};
    events.forEach((event) => {
      if (event.id) lookup[String(event.id)] = event.name;
      if (event.slug) lookup[String(event.slug)] = event.name;
    });
    return lookup;
  }, [events]);
  const eventIdBySlug = useMemo(() => {
    const lookup = {};
    events.forEach((event) => {
      if (event.slug && event.id) lookup[String(event.slug)] = String(event.id);
    });
    return lookup;
  }, [events]);

  const { data: profileData } = useQuery({
    queryKey: ['settings_profile'],
    queryFn: () => api.get('/api/auth/profile/'),
    enabled: !!user,
  });

  useEffect(() => {
    if (profileData) setProfile(normalizeProfile(profileData));
  }, [profileData]);

  const { data: notificationData } = useQuery({
    queryKey: ['settings_notifications'],
    queryFn: fetchNotificationPreferences,
    enabled: !!user,
  });

  useEffect(() => {
    if (notificationData) setNotifications(normalizeNotifications(notificationData));
  }, [notificationData]);

  const { data: integrationsData } = useQuery({
    queryKey: ['settings_integrations'],
    queryFn: fetchIntegrations,
    enabled: !!user,
  });

  useEffect(() => {
    if (integrationsData) setIntegrations(normalizeIntegrations(integrationsData));
  }, [integrationsData]);

  const { data: teamData } = useQuery({
    queryKey: ['settings_team'],
    queryFn: fetchTeamMembers,
    enabled: !!user,
  });

  useEffect(() => {
    if (teamData) setTeamMembers(normalizeTeamMembers(teamData));
  }, [teamData]);

  const { data: securityData } = useQuery({
    queryKey: ['settings_security'],
    queryFn: fetchSecuritySettings,
    enabled: !!user,
  });

  useEffect(() => {
    if (securityData) {
      const enabled = securityData.two_factor_enabled ?? securityData.enabled ?? false;
      setTwoFactorEnabled(Boolean(enabled));
      setTwoFactorSupported(Boolean(securityData.two_factor_supported));
    }
  }, [securityData]);

  const { data: sessionsData } = useQuery({
    queryKey: ['settings_sessions'],
    queryFn: fetchSessions,
    enabled: !!user,
  });

  const sessions = normalizeSessions(sessionsData);

  const {
    data: paymentSettingsData,
    refetch: refetchPaymentSettings,
    isFetching: isFetchingPaymentSettings,
    isLoading: isLoadingPaymentSettings,
  } = useQuery({
    queryKey: ['settings_payments'],
    queryFn: fetchPaymentSettings,
    enabled: !!user,
  });

  const paymentSettings = useMemo(
    () => normalizePaymentSettings(paymentSettingsData),
    [paymentSettingsData]
  );

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    if (params.get('stripe')) {
      refetchPaymentSettings();
    }
  }, [location.search, refetchPaymentSettings, user]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('first_name', profile.firstName);
      formData.append('last_name', profile.lastName);
      formData.append('email', profile.email);
      formData.append('phone_number', profile.phone);
      formData.append('organization_name', profile.company);
      formData.append('organization_bio', profile.bio);
      formData.append('website', profile.website);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      return api.patchForm('/api/auth/profile/', formData);
    },
    onSuccess: (data) => {
      updateUser(data);
      queryClient.invalidateQueries({ queryKey: ['settings_profile'] });
      toast.success('Profile updated successfully.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update profile.');
    },
  });

  const notificationsMutation = useMutation({
    mutationFn: (payload) => updateNotificationPreferences(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings_notifications'] });
      toast.success('Notification preferences saved.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update notifications.');
    },
  });

  const integrationMutation = useMutation({
    mutationFn: ({ id, action }) =>
      action === 'connect' ? connectIntegration(id) : disconnectIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings_integrations'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update integration.');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (payload) => inviteTeamMember(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings_team'] });
      toast.success('Invite sent.');
      setInviteDialogOpen(false);
      setInviteForm({ name: '', email: '', role: 'checkin', eventId: 'none' });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to invite member.');
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, payload }) => updateTeamMember(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings_team'] });
      toast.success('Assignment updated.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update assignment.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => removeTeamMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings_team'] });
      toast.success('Member removed.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to remove member.');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload) => api.post('/api/auth/change-password/', payload),
    onSuccess: () => {
      toast.success('Password updated.');
      setPasswordForm({ current: '', next: '', confirm: '' });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update password.');
    },
  });

  const twoFactorMutation = useMutation({
    mutationFn: (enabled) => updateTwoFactor(enabled),
    onSuccess: (data) => {
      setTwoFactorEnabled(Boolean(data?.two_factor_enabled));
      queryClient.invalidateQueries({ queryKey: ['settings_security'] });
      toast.success('Two-factor settings updated.');
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['settings_security'] });
      toast.error(error?.message || 'Failed to update two-factor settings.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings_sessions'] });
      toast.success('Session revoked.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to revoke session.');
    },
  });

  const stripeConnectMutation = useMutation({
    mutationFn: (payload) => createStripeConnectLink(payload),
    onSuccess: (data) => {
      const url = data?.url;
      if (url) {
        window.location.assign(url);
        return;
      }
      toast.error('Unable to start Stripe onboarding.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to connect Stripe.');
    },
  });

  const stripeDashboardMutation = useMutation({
    mutationFn: () => createStripeDashboardLink(),
    onSuccess: (data) => {
      const url = data?.url;
      if (url) {
        window.location.assign(url);
        return;
      }
      toast.error('Unable to open Stripe dashboard.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to open Stripe dashboard.');
    },
  });

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field, value) => {
    setNotifications((prev) => ({ ...prev, [field]: value }));
  };

  const handleInvite = () => {
    if (!inviteForm.email) {
      toast.error('Email is required.');
      return;
    }
    inviteMutation.mutate({
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      event_id: inviteForm.eventId === 'none' ? null : inviteForm.eventId,
    });
  };

  const handleAssign = (memberId, eventId) => {
    const assigned = eventId && eventId !== 'none' ? [eventId] : [];
    assignMutation.mutate({
      id: memberId,
      payload: {
        assigned_events: assigned,
        assigned_event_id: assigned.length ? assigned[0] : null,
      },
    });
  };

  const paymentStatusMeta = useMemo(
    () => ({
      enabled: { label: 'Enabled', className: 'bg-green-100 text-green-700' },
      pending: { label: 'Pending setup', className: 'bg-amber-100 text-amber-700' },
      restricted: { label: 'Restricted', className: 'bg-red-100 text-red-700' },
      not_connected: { label: 'Not connected', className: 'bg-gray-100 text-gray-600' },
      error: { label: 'Error', className: 'bg-red-100 text-red-700' },
    }),
    []
  );
  const paymentStatusInfo =
    paymentStatusMeta[paymentSettings.status] || paymentStatusMeta.not_connected;
  const paymentRequirements = paymentSettings.requirements || {};
  const paymentOutstanding = [
    ...(paymentRequirements.currently_due || []),
    ...(paymentRequirements.past_due || []),
  ];

  const sidebarItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: Link },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-[#0F172A]">Settings</h2>
        <p className="text-gray-500 text-sm">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <Card className="lg:w-64 h-fit overflow-x-auto pressable-card-static">
          <CardContent className="p-2">
            <nav className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                      activeTab === item.id
                        ? 'bg-[#02338D] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card className="animate-slide-in-right pressable-card-static">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Profile Information</CardTitle>
                <CardDescription className="text-sm">Update your personal and professional details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                <div className="flex items-center gap-4 lg:gap-6">
                  <div className="relative">
                    <Avatar className="w-16 h-16 lg:w-20 lg:h-20">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-br from-[#C58B1A] to-[#B91C1C] text-white text-lg lg:text-xl">
                          {`${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}` || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <label className="absolute -bottom-1 -right-1 w-6 h-6 lg:w-8 lg:h-8 bg-[#02338D] text-white rounded-full flex items-center justify-center hover:bg-[#022A78] transition-colors cursor-pointer">
                      <Camera className="w-3 h-3 lg:w-4 lg:h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="font-medium text-[#0F172A] text-sm lg:text-base">Profile Photo</p>
                    <p className="text-xs lg:text-sm text-gray-500">Recommended: 400x400px, JPG or PNG</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) => handleProfileChange('firstName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) => handleProfileChange('lastName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={profile.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      className="pl-10"
                      value={profile.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm">Company/Organization</Label>
                  <Input
                    id="company"
                    value={profile.company}
                    onChange={(e) => handleProfileChange('company', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="text-sm">Website</Label>
                  <Input
                    id="website"
                    value={profile.website}
                    onChange={(e) => handleProfileChange('website', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm">Bio</Label>
                  <textarea
                    id="bio"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C58B1A]/20 focus:border-[#C58B1A] resize-none text-sm"
                    value={profile.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isLoading} className="bg-[#02338D] hover:bg-[#022A78] text-sm">
                    {profileMutation.isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {activeTab === 'notifications' && (
            <Card className="animate-slide-in-right pressable-card-static">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Notification Preferences</CardTitle>
                <CardDescription className="text-sm">Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3 lg:mb-4 text-sm lg:text-base">Email Notifications</h4>
                  <div className="space-y-3 lg:space-y-4">
                    {[
                      { key: 'emailNewSales', label: 'New Ticket Sales', desc: 'Get notified when someone buys a ticket' },
                      { key: 'emailEventReminders', label: 'Event Reminders', desc: 'Receive reminders before your events' },
                      { key: 'emailMarketing', label: 'Marketing Updates', desc: 'Tips and promotional offers' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-2 lg:py-3 border-b border-gray-50">
                        <div>
                          <p className="font-medium text-gray-700 text-sm lg:text-base">{item.label}</p>
                          <p className="text-xs lg:text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifications[item.key]}
                          onCheckedChange={(checked) => handleNotificationChange(item.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3 lg:mb-4 text-sm lg:text-base">Push Notifications</h4>
                  <div className="space-y-3 lg:space-y-4">
                    {[
                      { key: 'pushCheckIns', label: 'Check-in Updates', desc: 'Real-time check-in notifications' },
                      { key: 'pushEventUpdates', label: 'Event Updates', desc: 'Changes and important updates' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-2 lg:py-3 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="font-medium text-gray-700 text-sm lg:text-base">{item.label}</p>
                          <p className="text-xs lg:text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <Switch
                          checked={notifications[item.key]}
                          onCheckedChange={(checked) => handleNotificationChange(item.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => notificationsMutation.mutate(buildNotificationPayload(notifications))}
                    disabled={notificationsMutation.isLoading}
                    className="bg-[#02338D] hover:bg-[#022A78] text-sm"
                  >
                    {notificationsMutation.isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {activeTab === 'payment' && (
            <Card className="animate-slide-in-right pressable-card-static">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Payment Settings</CardTitle>
                <CardDescription className="text-sm">Connect Stripe to receive payouts and track onboarding status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                {isLoadingPaymentSettings && (
                  <div className="text-xs text-gray-500">Loading payment status...</div>
                )}
                {!paymentSettings.stripeEnabled && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                    Stripe is not configured yet. Add `STRIPE_SECRET_KEY` on the backend to enable onboarding.
                  </div>
                )}

                {paymentSettings.stripeError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {paymentSettings.stripeError}
                  </div>
                )}

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-medium text-[#0F172A]">Stripe Connect</p>
                    <p className="text-xs text-gray-500">Enable card payments and scheduled payouts.</p>
                    {paymentSettings.stripeAccountId && (
                      <p className="text-xs text-gray-400 mt-1">
                        Account: <span className="font-mono">{paymentSettings.stripeAccountId}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('text-xs', paymentStatusInfo.className)}>
                      {paymentStatusInfo.label}
                    </Badge>
                    {paymentSettings.stripeEnabled && (
                      <Button
                        size="sm"
                        className="bg-[#02338D] hover:bg-[#022A78] text-xs"
                        onClick={() => stripeConnectMutation.mutate({})}
                        disabled={stripeConnectMutation.isLoading}
                      >
                        {stripeConnectMutation.isLoading
                          ? 'Opening...'
                          : paymentSettings.stripeAccountId
                            ? 'Continue Onboarding'
                            : 'Connect Stripe'}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500">Charges</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {paymentSettings.chargesEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <Badge
                      className={cn(
                        'text-[10px] mt-2',
                        paymentSettings.chargesEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {paymentSettings.chargesEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="p-3 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500">Payouts</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {paymentSettings.payoutsEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <Badge
                      className={cn(
                        'text-[10px] mt-2',
                        paymentSettings.payoutsEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {paymentSettings.payoutsEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="p-3 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-500">Details</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {paymentSettings.detailsSubmitted ? 'Submitted' : 'Incomplete'}
                    </p>
                    <Badge
                      className={cn(
                        'text-[10px] mt-2',
                        paymentSettings.detailsSubmitted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {paymentSettings.detailsSubmitted ? 'Complete' : 'Needs info'}
                    </Badge>
                  </div>
                </div>

                {paymentOutstanding.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-[#0F172A]">Action required</p>
                    <p className="text-xs text-amber-700">
                      Complete the following items in Stripe to enable payouts.
                    </p>
                    <ul className="list-disc pl-5 text-xs text-amber-800 mt-2 space-y-1">
                      {paymentOutstanding.slice(0, 6).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {paymentSettings.stripeAccountId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => stripeDashboardMutation.mutate()}
                      disabled={stripeDashboardMutation.isLoading}
                    >
                      <ArrowUpRight className="w-4 h-4 mr-1" />
                      {stripeDashboardMutation.isLoading ? 'Opening...' : 'Open Stripe Dashboard'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => refetchPaymentSettings()}
                    disabled={isFetchingPaymentSettings || isLoadingPaymentSettings}
                  >
                    <RefreshCcw className={cn('w-4 h-4 mr-1', isFetchingPaymentSettings && 'animate-spin')} />
                    Refresh status
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {activeTab === 'team' && (
            <Card className="animate-slide-in-right pressable-card-static">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Team Members</CardTitle>
                <CardDescription className="text-sm">Assign team members to check-in specific events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600 text-sm">{teamMembers.length} team members</p>
                  <Button
                    className="bg-[#C58B1A] text-white hover:bg-[#A56F14] text-sm"
                    onClick={() => setInviteDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </div>

                <div className="space-y-2 lg:space-y-3">
                  {teamMembers.map((member) => {
                    const rawAssigned = member.assignedEvents?.[0];
                    const resolvedAssigned = rawAssigned ? (eventIdBySlug[String(rawAssigned)] || String(rawAssigned)) : 'none';
                    const assignedId = resolvedAssigned || 'none';
                    const assignedLabel = assignedId !== 'none' ? eventLookup[String(rawAssigned || assignedId)] : 'None';
                    return (
                      <div key={member.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 lg:p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3 lg:gap-4">
                          <Avatar className="w-8 h-8 lg:w-10 lg:h-10">
                            <AvatarFallback className="bg-gradient-to-br from-[#02338D] to-[#7C3AED] text-white text-xs lg:text-sm">
                              {member.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-[#0F172A] text-sm lg:text-base">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                            <p className="text-xs text-gray-400 mt-1">Assigned: {assignedLabel || 'None'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-4">
                          <span
                            className={cn(
                              'px-2 lg:px-3 py-1 rounded-full text-xs font-medium',
                              member.role === 'Owner' && 'bg-[#C58B1A]/20 text-[#0F172A]',
                              member.role === 'Admin' && 'bg-[#02338D] text-white',
                              member.role !== 'Owner' && member.role !== 'Admin' && 'bg-gray-200 text-gray-700'
                            )}
                          >
                            {member.role}
                          </span>
                          <Select value={String(assignedId)} onValueChange={(value) => handleAssign(member.id, value)}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Assign event" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No assignment</SelectItem>
                              {eventOptions.map((event) => (
                                <SelectItem key={event.id} value={event.id}>
                                  {event.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {member.role !== 'Owner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600 text-xs lg:text-sm h-7 lg:h-8"
                              onClick={() => removeMutation.mutate(member.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {teamMembers.length === 0 && (
                    <div className="text-sm text-gray-500 text-center py-8">No team members yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {activeTab === 'integrations' && (
            <Card className="animate-slide-in-right pressable-card-static">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Integrations</CardTitle>
                <CardDescription className="text-sm">Connect with your favorite tools and services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                  {integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-3 lg:p-4 border border-gray-200 rounded-lg hover:border-[#C58B1A] transition-colors">
                      <div className="flex items-center gap-3 lg:gap-4">
                        <div
                          className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: INTEGRATION_COLORS[integration.name] || '#94A3B8' }}
                        >
                          <span className="text-white font-bold text-xs">{integration.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-[#0F172A] text-sm lg:text-base">{integration.name}</p>
                          <p className="text-xs text-gray-500">{integration.description}</p>
                        </div>
                      </div>
                      <Button
                        variant={integration.connected ? 'outline' : 'default'}
                        size="sm"
                        className={integration.connected ? 'text-xs' : 'bg-[#02338D] hover:bg-[#022A78] text-xs'}
                        onClick={() =>
                          integrationMutation.mutate({
                            id: integration.id,
                            action: integration.connected ? 'disconnect' : 'connect',
                          })
                        }
                      >
                        {integration.connected ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Connected
                          </>
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {activeTab === 'security' && (
            <Card className="animate-slide-in-right">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Security Settings</CardTitle>
                <CardDescription className="text-sm">Manage your account security and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3 lg:mb-4 text-sm lg:text-base">Change Password</h4>
                  <div className="space-y-3 lg:space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Current Password</Label>
                      <Input
                        type="password"
                        placeholder="Enter current password"
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, current: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">New Password</Label>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        value={passwordForm.next}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, next: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Confirm New Password</Label>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="bg-[#02338D] hover:bg-[#022A78] text-sm"
                      onClick={() => {
                        if (passwordForm.next !== passwordForm.confirm) {
                          toast.error('Passwords do not match.');
                          return;
                        }
                        passwordMutation.mutate({
                          old_password: passwordForm.current,
                          new_password: passwordForm.next,
                          confirm_password: passwordForm.confirm,
                        });
                      }}
                      disabled={passwordMutation.isLoading}
                    >
                      Update Password
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3 lg:mb-4 text-sm lg:text-base">Two-Factor Authentication</h4>
                  <div className="flex items-center justify-between p-3 lg:p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-700 text-sm lg:text-base">Enable 2FA</p>
                      <p className="text-xs lg:text-sm text-gray-500">
                        {twoFactorSupported
                          ? 'Add an extra layer of security'
                          : 'Coming soon. 2FA setup is not available yet.'}
                      </p>
                    </div>
                    <Switch
                      checked={twoFactorEnabled}
                      disabled={!twoFactorSupported || twoFactorMutation.isLoading}
                      onCheckedChange={(checked) => {
                        twoFactorMutation.mutate(checked);
                      }}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3 lg:mb-4 text-sm lg:text-base">Active Sessions</h4>
                  <div className="space-y-2 lg:space-y-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-3 lg:p-4 border border-gray-100 rounded-lg">
                        <div>
                          <p className="font-medium text-[#0F172A] text-sm lg:text-base">{session.device}</p>
                          <p className="text-xs text-gray-500">{session.location}</p>
                        </div>
                        <div className="flex items-center gap-2 lg:gap-3">
                          {session.current && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Current</span>
                          )}
                          {!session.current && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 text-xs lg:text-sm h-7 lg:h-8"
                              onClick={() => revokeMutation.mutate(session.id)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <div className="text-sm text-gray-500">No active sessions found.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="bg-white text-[#0F172A]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>Assign a team member to handle check-ins for a specific event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                value={inviteForm.email}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="member@domain.com"
                type="email"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-white text-[#0F172A]">
                  <SelectItem value="checkin">Check-in Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign Event</Label>
              <Select
                value={inviteForm.eventId}
                onValueChange={(value) => setInviteForm((prev) => ({ ...prev, eventId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent className="bg-white text-[#0F172A]">
                  <SelectItem value="none">No assignment</SelectItem>
                  {eventOptions.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#02338D] hover:bg-[#022A78]"
              onClick={handleInvite}
              disabled={inviteMutation.isLoading}
            >
              {inviteMutation.isLoading ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerSettings;


