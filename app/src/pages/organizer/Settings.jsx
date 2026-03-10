import React, { useState } from 'react';
import {
  User,
  Bell,
  CreditCard,
  Shield,
  Users,
  Link,
  Camera,
  Mail,
  Phone,
  Save,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const OrganizerSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@eventhub.com',
    phone: '+1 (555) 123-4567',
    bio: 'Event organizer with 5+ years of experience in corporate and social events.',
    company: 'EventHub Inc.',
    website: 'www.johndoe.com',
  });

  const [notifications, setNotifications] = useState({
    emailNewSales: true,
    emailEventReminders: true,
    emailMarketing: false,
    pushCheckIns: true,
    pushEventUpdates: true,
    smsImportant: false,
  });

  const [payment, setPayment] = useState({
    stripeConnected: true,
    paypalConnected: false,
    payoutSchedule: 'weekly',
    currency: 'USD',
  });

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field, value) => {
    setNotifications((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Settings saved successfully!');
    setSaving(false);
  };

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
        <Card className="lg:w-64 h-fit overflow-x-auto">
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
                        ? 'bg-[#1E4DB7] text-white'
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
            <Card className="animate-slide-in-right">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Profile Information</CardTitle>
                <CardDescription className="text-sm">Update your personal and professional details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                <div className="flex items-center gap-4 lg:gap-6">
                  <div className="relative">
                    <Avatar className="w-16 h-16 lg:w-20 lg:h-20">
                      <AvatarFallback className="bg-gradient-to-br from-[#C58B1A] to-[#B91C1C] text-white text-lg lg:text-xl">
                        JD
                      </AvatarFallback>
                    </Avatar>
                    <button className="absolute -bottom-1 -right-1 w-6 h-6 lg:w-8 lg:h-8 bg-[#1E4DB7] text-white rounded-full flex items-center justify-center hover:bg-[#163B90] transition-colors">
                      <Camera className="w-3 h-3 lg:w-4 lg:h-4" />
                    </button>
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
                  <Button onClick={handleSave} disabled={saving} className="bg-[#1E4DB7] hover:bg-[#163B90] text-sm">
                    {saving ? (
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
            <Card className="animate-slide-in-right">
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
                  <Button onClick={handleSave} disabled={saving} className="bg-[#1E4DB7] hover:bg-[#163B90] text-sm">
                    {saving ? (
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
            <Card className="animate-slide-in-right">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Payment Settings</CardTitle>
                <CardDescription className="text-sm">Manage your payment methods and payout preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3 lg:mb-4 text-sm lg:text-base">Connected Accounts</h4>
                  <div className="space-y-3 lg:space-y-4">
                    {[
                      { name: 'Stripe', connected: true, color: '#635BFF' },
                      { name: 'PayPal', connected: false, color: '#003087' },
                    ].map((account) => (
                      <div key={account.name} className="flex items-center justify-between p-3 lg:p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3 lg:gap-4">
                          <div
                            className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: account.color }}
                          >
                            <span className="text-white font-bold text-xs lg:text-sm">{account.name[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium text-[#0F172A] text-sm lg:text-base">{account.name}</p>
                            <p className="text-xs text-gray-500">{account.connected ? 'Connected' : 'Not connected'}</p>
                          </div>
                        </div>
                        {account.connected ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-xs lg:text-sm text-green-600">Active</span>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="text-xs">Connect</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3 lg:mb-4 text-sm lg:text-base">Payout Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Payout Schedule</Label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C58B1A]/20 focus:border-[#C58B1A] text-sm"
                        value={payment.payoutSchedule}
                        onChange={(e) => setPayment((prev) => ({ ...prev, payoutSchedule: e.target.value }))}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Currency</Label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C58B1A]/20 focus:border-[#C58B1A] text-sm"
                        value={payment.currency}
                        onChange={(e) => setPayment((prev) => ({ ...prev, currency: e.target.value }))}
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="KES">KES - Kenyan Shilling</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="bg-[#1E4DB7] hover:bg-[#163B90] text-sm">
                    {saving ? (
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

          {activeTab === 'team' && (
            <Card className="animate-slide-in-right">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Team Members</CardTitle>
                <CardDescription className="text-sm">Manage who can access and manage your events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 lg:space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600 text-sm">3 team members</p>
                  <Button className="bg-[#C58B1A] text-white hover:bg-[#A56F14] text-sm">Invite Member</Button>
                </div>

                <div className="space-y-2 lg:space-y-3">
                  {[
                    { name: 'John Doe', email: 'john@eventhub.com', role: 'Owner', avatar: 'JD' },
                    { name: 'Sarah Smith', email: 'sarah@eventhub.com', role: 'Admin', avatar: 'SS' },
                    { name: 'Mike Johnson', email: 'mike@eventhub.com', role: 'Editor', avatar: 'MJ' },
                  ].map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 lg:p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3 lg:gap-4">
                        <Avatar className="w-8 h-8 lg:w-10 lg:h-10">
                          <AvatarFallback className="bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED] text-white text-xs lg:text-sm">
                            {member.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-[#0F172A] text-sm lg:text-base">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 lg:gap-4">
                        <span
                          className={cn(
                            'px-2 lg:px-3 py-1 rounded-full text-xs font-medium',
                            member.role === 'Owner' && 'bg-[#C58B1A]/20 text-[#0F172A]',
                            member.role === 'Admin' && 'bg-[#1E4DB7] text-white',
                            member.role === 'Editor' && 'bg-gray-200 text-gray-700'
                          )}
                        >
                          {member.role}
                        </span>
                        {member.role !== 'Owner' && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 text-xs lg:text-sm h-7 lg:h-8">
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'integrations' && (
            <Card className="animate-slide-in-right">
              <CardHeader>
                <CardTitle className="text-base lg:text-lg">Integrations</CardTitle>
                <CardDescription className="text-sm">Connect with your favorite tools and services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                  {[
                    { name: 'Mailchimp', description: 'Email marketing', connected: true, color: '#FFE01B' },
                    { name: 'Zapier', description: 'Automation', connected: false, color: '#FF4A00' },
                    { name: 'Slack', description: 'Team messaging', connected: true, color: '#4A154B' },
                    { name: 'Google Analytics', description: 'Analytics', connected: false, color: '#E37400' },
                    { name: 'Zoom', description: 'Video conferencing', connected: true, color: '#2D8CFF' },
                    { name: 'HubSpot', description: 'CRM', connected: false, color: '#FF7A59' },
                  ].map((integration, index) => (
                    <div key={index} className="flex items-center justify-between p-3 lg:p-4 border border-gray-200 rounded-lg hover:border-[#C58B1A] transition-colors">
                      <div className="flex items-center gap-3 lg:gap-4">
                        <div
                          className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: integration.color }}
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
                        className={integration.connected ? 'text-xs' : 'bg-[#1E4DB7] hover:bg-[#163B90] text-xs'}
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
                      <Input type="password" placeholder="Enter current password" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">New Password</Label>
                      <Input type="password" placeholder="Enter new password" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Confirm New Password</Label>
                      <Input type="password" placeholder="Confirm new password" />
                    </div>
                    <Button className="bg-[#1E4DB7] hover:bg-[#163B90] text-sm">Update Password</Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3 lg:mb-4 text-sm lg:text-base">Two-Factor Authentication</h4>
                  <div className="flex items-center justify-between p-3 lg:p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-700 text-sm lg:text-base">Enable 2FA</p>
                      <p className="text-xs lg:text-sm text-gray-500">Add an extra layer of security</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-[#0F172A] mb-3 lg:mb-4 text-sm lg:text-base">Active Sessions</h4>
                  <div className="space-y-2 lg:space-y-3">
                    {[
                      { device: 'Chrome on MacOS', location: 'Nairobi, Kenya', current: true },
                      { device: 'Safari on iPhone', location: 'Nairobi, Kenya', current: false },
                    ].map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-3 lg:p-4 border border-gray-100 rounded-lg">
                        <div>
                          <p className="font-medium text-[#0F172A] text-sm lg:text-base">{session.device}</p>
                          <p className="text-xs text-gray-500">{session.location}</p>
                        </div>
                        <div className="flex items-center gap-2 lg:gap-3">
                          {session.current && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Current</span>
                          )}
                          {!session.current && (
                            <Button variant="ghost" size="sm" className="text-red-500 text-xs lg:text-sm h-7 lg:h-8">
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerSettings;

