import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

const SponsorsTab = ({ slug }) => {
  const queryClient = useQueryClient();
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorForm, setSponsorForm] = useState({
    name: '', website: '', sort_order: 0
  });

  const { data: sponsorsData = [], isLoading: isSponsorsLoading } = useQuery({
    queryKey: ['sponsors', slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${slug}/sponsors/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!slug,
  });

  const createSponsorMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${slug}/sponsors/`, payload),
    onSuccess: () => {
      toast.success('Sponsor added.');
      setShowSponsorModal(false);
      setSponsorForm({ name: '', website: '', sort_order: 0 });
      queryClient.invalidateQueries({ queryKey: ['sponsors', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to add sponsor.')
  });

  const deleteSponsorMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${slug}/sponsors/${id}/`),
    onSuccess: () => {
      toast.success('Sponsor removed.');
      queryClient.invalidateQueries({ queryKey: ['sponsors', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove sponsor.')
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Event Sponsors</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage sponsors.</p>
          </div>
          <Button className="bg-[#02338D] hover:bg-[#022A78] text-white text-xs lg:text-sm" onClick={() => setShowSponsorModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Sponsor
          </Button>
        </CardHeader>
        <CardContent>
          {isSponsorsLoading ? (
            <p className="text-sm text-gray-500">Loading sponsors...</p>
          ) : sponsorsData && sponsorsData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sponsorsData.map(sponsor => (
                <div key={sponsor.id} className="border border-gray-100 rounded-xl p-4 text-center relative group hover:shadow-md transition-shadow">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if(window.confirm('Remove this sponsor?')) deleteSponsorMutation.mutate(sponsor.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                  <div className="mb-3 flex h-16 items-center justify-center">
                    {sponsor.logo_url ? (
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white p-3 shadow-sm">
                        <img src={sponsor.logo_url} alt={sponsor.name} className="h-full w-full rounded-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold">{sponsor.name.charAt(0)}</div>
                    )}
                  </div>
                  <h4 className="font-bold text-[#0F172A] text-sm truncate">{sponsor.name}</h4>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[#0F172A] font-medium text-sm">No sponsors added</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showSponsorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSponsorModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#02338D] px-6 py-4 text-white flex justify-between">
              <h3 className="font-semibold">Add Sponsor</h3>
              <button onClick={() => setShowSponsorModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Sponsor Name *</Label>
                <Input value={sponsorForm.name} onChange={e => setSponsorForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={sponsorForm.website} placeholder="https://" onChange={e => setSponsorForm(p => ({ ...p, website: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowSponsorModal(false)}>Cancel</Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white" onClick={() => createSponsorMutation.mutate(sponsorForm)} disabled={createSponsorMutation.isPending}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SponsorsTab;


