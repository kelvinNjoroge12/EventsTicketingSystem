import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const WaitlistTab = ({ slug, waitlistEnabled }) => {
  const queryClient = useQueryClient();

  const { data: waitlistUsers = [], isLoading: isWaitlistLoading } = useQuery({
    queryKey: ['waitlist', slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${slug}/waitlist/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!slug,
  });

  const notifyWaitlistMutation = useMutation({
    mutationFn: async (id) => api.post(`/api/events/${slug}/waitlist/${id}/notify/`),
    onSuccess: () => {
      toast.success('Waitlist entry notified successfully.');
      queryClient.invalidateQueries({ queryKey: ['waitlist', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to notify entry.')
  });

  const deleteWaitlistMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${slug}/waitlist/${id}/`),
    onSuccess: () => {
      toast.success('Waitlist entry removed.');
      queryClient.invalidateQueries({ queryKey: ['waitlist', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove entry.')
  });

  const toggleWaitlistMutation = useMutation({
    mutationFn: async (enabled) => api.patch(`/api/events/${slug}/live-settings/`, { enable_waitlist: enabled }),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? 'Waitlist enabled.' : 'Waitlist disabled.');
      queryClient.invalidateQueries({ queryKey: ['organizer_event_detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['organizer_events'] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to update waitlist settings.')
  });

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Waitlist</CardTitle>
          <p className="text-sm text-gray-500 mt-1">Guests waiting for tickets to become available.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => toggleWaitlistMutation.mutate(!waitlistEnabled)}
            disabled={toggleWaitlistMutation.isPending}
          >
            {waitlistEnabled ? <ToggleRight className="w-4 h-4 mr-1.5" /> : <ToggleLeft className="w-4 h-4 mr-1.5" />}
            {toggleWaitlistMutation.isPending ? 'Saving...' : (waitlistEnabled ? 'Disable' : 'Enable')}
          </Button>
          <Badge variant="outline" className="text-xs">
            {waitlistUsers.length} queued
          </Badge>
          {!waitlistEnabled && (
            <Badge className="bg-gray-100 text-gray-500 text-xs" variant="outline">
              Disabled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!waitlistEnabled ? (
          <div className="p-6 text-sm text-gray-500">
            Waitlist is currently disabled for this event. Enable it in the event settings to start collecting guests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Guest</th>
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Phone</th>
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Position</th>
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-right py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isWaitlistLoading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-gray-500">Loading waitlist...</td>
                  </tr>
                ) : waitlistUsers.length > 0 ? (
                  waitlistUsers.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2 lg:py-3 px-3 lg:px-4">
                        <div>
                          <p className="font-medium text-[#0F172A] text-sm">{entry.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {entry.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-2 lg:py-3 px-3 lg:px-4 text-xs text-gray-500 hidden md:table-cell">
                        {entry.phone || '-'}
                      </td>
                      <td className="py-2 lg:py-3 px-3 lg:px-4">
                        <Badge variant="outline" className="text-xs">{entry.position}</Badge>
                      </td>
                      <td className="py-2 lg:py-3 px-3 lg:px-4">
                        <Badge className={cn(
                          'text-xs',
                          entry.status === 'notified' && 'bg-[#C58B1A]/20 text-[#C58B1A]',
                          entry.status === 'converted' && 'bg-green-100 text-green-700',
                          (!entry.status || entry.status === 'waiting') && 'bg-gray-100 text-gray-600'
                        )} variant="outline">
                          {entry.status || 'waiting'}
                        </Badge>
                      </td>
                      <td className="py-2 lg:py-3 px-3 lg:px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => notifyWaitlistMutation.mutate(entry.id)}
                            disabled={notifyWaitlistMutation.isPending || entry.status === 'notified' || entry.status === 'converted'}
                          >
                            Notify
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm('Delete this waitlist entry?')) {
                                deleteWaitlistMutation.mutate(entry.id);
                              }
                            }}
                            disabled={deleteWaitlistMutation.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-gray-500">No guests on the waitlist.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WaitlistTab;
