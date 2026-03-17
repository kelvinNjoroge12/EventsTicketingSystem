import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LogOut, Save, User, Lock, UploadCloud } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CustomInput from '../components/ui/CustomInput';
import CustomButton from '../components/ui/CustomButton';
import { api } from '../lib/apiClient';
import { toast } from 'sonner';

const AccountSettingsPage = () => {
    const { user, updateUser, logout } = useAuth();

    const [activeTab, setActiveTab] = useState('profile');

    // Profile State
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [phone, setPhone] = useState(user?.phone_number || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Password State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Avatar State
    const [avatarFile, setAvatarFile] = useState(null);

    if (!user) {
        return <PageWrapper><div className="text-center py-20">Please log in to view settings.</div></PageWrapper>;
    }

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            const formData = new FormData();
            formData.append('first_name', firstName);
            formData.append('last_name', lastName);
            formData.append('phone_number', phone);

            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            const updatedUser = await api.patchForm('/api/auth/profile/', formData);
            updateUser(updatedUser);
            toast.success('Profile updated successfully');
        } catch (err) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setIsSavingPassword(true);

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            setIsSavingPassword(false);
            return;
        }

        try {
            await api.post('/api/auth/change-password/', {
                old_password: oldPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            toast.success('Password updated successfully');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast.error(err.message || 'Failed to update password');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: User },
        { id: 'security', label: 'Security', icon: Lock },
    ];

    return (
        <PageWrapper>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col md:flex-row gap-8">

                    {/* Sidebar */}
                    <div className="md:w-64 flex-shrink-0">
                        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sticky top-24">
                            <div className="flex items-center gap-3 p-4 mb-4 border-b border-[#E2E8F0]">
                                <div className="w-12 h-12 rounded-full bg-[#02338D] text-white flex items-center justify-center font-bold text-lg">
                                    {user.name?.charAt(0) || 'U'}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-semibold text-[#0F172A] truncate flex items-center gap-1">
                                        {user.name}
                                    </h3>
                                    <p className="text-sm text-[#64748B] truncate">{user.email}</p>
                                </div>
                            </div>

                            <nav className="space-y-1">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                            ? 'bg-[#EFF6FF] text-[#02338D]'
                                            : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                                            }`}
                                    >
                                        <tab.icon className="w-5 h-5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>

                            <div className="mt-8 pt-4 border-t border-[#E2E8F0]">
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1">
                        {activeTab === 'profile' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8"
                            >
                                <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Profile Settings</h2>

                                <form onSubmit={handleProfileSubmit} className="space-y-6 max-w-2xl">
                                    <div>
                                        <label className="block text-sm font-medium text-[#0F172A] mb-2">
                                            Avatar
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden flex items-center justify-center">
                                                {avatarFile ? (
                                                    <img src={URL.createObjectURL(avatarFile)} alt="Preview" className="w-full h-full object-cover" />
                                                ) : user.avatar ? (
                                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-8 h-8 text-[#94A3B8]" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => setAvatarFile(e.target.files[0])}
                                                    className="hidden"
                                                    id="avatar-upload"
                                                />
                                                <label
                                                    htmlFor="avatar-upload"
                                                    className="inline-flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] rounded-lg text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                                                >
                                                    <UploadCloud className="w-4 h-4" />
                                                    Change Picture
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <CustomInput
                                            label="First Name"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="John"
                                        />
                                        <CustomInput
                                            label="Last Name"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Doe"
                                        />
                                    </div>

                                    <CustomInput
                                        label="Email (Cannot be changed)"
                                        value={user.email}
                                        disabled
                                    />

                                    <CustomInput
                                        label="Phone Number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+1 234 567 890"
                                    />

                                    <div className="pt-4 border-t border-[#E2E8F0]">
                                        <CustomButton
                                            type="submit"
                                            variant="primary"
                                            leftIcon={Save}
                                            isLoading={isSavingProfile}
                                        >
                                            Save Changes
                                        </CustomButton>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {activeTab === 'security' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8"
                            >
                                <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Security Settings</h2>

                                <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-2xl">
                                    <CustomInput
                                        label="Current Password"
                                        type="password"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <div className="pt-2 border-t border-[#E2E8F0]"></div>
                                    <CustomInput
                                        label="New Password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        required
                                    />
                                    <CustomInput
                                        label="Confirm New Password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repeat your new password"
                                        required
                                    />

                                    <div className="pt-4 border-t border-[#E2E8F0]">
                                        <CustomButton
                                            type="submit"
                                            variant="primary"
                                            leftIcon={Save}
                                            isLoading={isSavingPassword}
                                        >
                                            Update Password
                                        </CustomButton>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default AccountSettingsPage;

