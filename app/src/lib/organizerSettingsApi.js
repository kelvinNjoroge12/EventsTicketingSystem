import { api } from './apiClient';

export const fetchNotificationPreferences = async () => api.get('/api/settings/notifications/');

export const updateNotificationPreferences = async (payload) =>
  api.put('/api/settings/notifications/', payload);

export const fetchIntegrations = async () => api.get('/api/settings/integrations/');

export const connectIntegration = async (integrationId) =>
  api.post(`/api/settings/integrations/${integrationId}/connect/`, {});

export const disconnectIntegration = async (integrationId) =>
  api.post(`/api/settings/integrations/${integrationId}/disconnect/`, {});

export const fetchTeamMembers = async () => api.get('/api/organizer/team/');

export const inviteTeamMember = async (payload) =>
  api.post('/api/organizer/team/invite/', payload);

export const updateTeamMember = async (id, payload) =>
  api.patch(`/api/organizer/team/${id}/`, payload);

export const removeTeamMember = async (id) =>
  api.delete(`/api/organizer/team/${id}/`);

export const fetchSecuritySettings = async () => api.get('/api/auth/security/');

export const updateTwoFactor = async (enabled) =>
  api.post('/api/auth/2fa/', { enabled });

export const fetchSessions = async () => api.get('/api/auth/sessions/');

export const revokeSession = async (id) =>
  api.post(`/api/auth/sessions/${id}/revoke/`, {});

export const fetchPaymentSettings = async () => api.get('/api/settings/payments/');

export const createStripeConnectLink = async (payload = {}) =>
  api.post('/api/settings/payments/connect/', payload);

export const createStripeDashboardLink = async () =>
  api.post('/api/settings/payments/dashboard/', {});
