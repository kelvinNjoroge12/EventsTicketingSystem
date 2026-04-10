import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Trash2, X, Pencil, ImagePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

const emptySponsorForm = {
  id: null,
  name: '',
  website: '',
  sort_order: 0,
  logo: null,
  logoPreview: '',
};

const SponsorsTab = ({ slug }) => {
  const queryClient = useQueryClient();
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorForm, setSponsorForm] = useState(emptySponsorForm);

  const { data: sponsorsData = [], isLoading: isSponsorsLoading } = useQuery({
    queryKey: ['sponsors', slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${slug}/sponsors/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!slug,
  });

  const refreshSponsorQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['sponsors', slug] });
    queryClient.invalidateQueries({ queryKey: ['organizer_event_detail', slug] });
    queryClient.invalidateQueries({ queryKey: ['events', 'detail', slug] });
    queryClient.invalidateQueries({ queryKey: ['events', 'detail-lite', slug] });
    queryClient.invalidateQueries({ queryKey: ['events', 'sponsors', slug] });
  };

  const resetSponsorForm = () => {
    setSponsorForm(emptySponsorForm);
    setShowSponsorModal(false);
  };

  const buildSponsorPayload = () => {
    const payload = {
      name: sponsorForm.name,
      website: sponsorForm.website,
      sort_order: sponsorForm.sort_order,
    };

    if (!sponsorForm.logo) return payload;

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, String(value ?? ''));
    });
    formData.append('logo', sponsorForm.logo);
    return formData;
  };

  const createSponsorMutation = useMutation({
    mutationFn: async () => {
      const payload = buildSponsorPayload();
      return payload instanceof FormData
        ? api.postForm(`/api/events/${slug}/sponsors/`, payload)
        : api.post(`/api/events/${slug}/sponsors/`, payload);
    },
    onSuccess: () => {
      toast.success('Sponsor added.');
      resetSponsorForm();
      refreshSponsorQueries();
    },
    onError: (err) => toast.error(err?.message || 'Failed to add sponsor.'),
  });

  const updateSponsorMutation = useMutation({
    mutationFn: async () => {
      const payload = buildSponsorPayload();
      return payload instanceof FormData
        ? api.patchForm(`/api/events/${slug}/sponsors/${sponsorForm.id}/`, payload)
        : api.patch(`/api/events/${slug}/sponsors/${sponsorForm.id}/`, payload);
    },
    onSuccess: () => {
      toast.success('Sponsor updated.');
      resetSponsorForm();
      refreshSponsorQueries();
    },
    onError: (err) => toast.error(err?.message || 'Failed to update sponsor.'),
  });

  const deleteSponsorMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${slug}/sponsors/${id}/`),
    onSuccess: () => {
      toast.success('Sponsor removed.');
      refreshSponsorQueries();
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove sponsor.'),
  });

  const openCreateModal = () => {
    setSponsorForm({
      ...emptySponsorForm,
      sort_order: sponsorsData.length,
    });
    setShowSponsorModal(true);
  };

  const openEditModal = (sponsor) => {
    setSponsorForm({
      id: sponsor.id,
      name: sponsor.name || '',
      website: sponsor.website || '',
      sort_order: sponsor.sort_order ?? 0,
      logo: null,
      logoPreview: sponsor.logo_url || '',
    });
    setShowSponsorModal(true);
  };

  const handleLogoChange = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSponsorForm((prev) => ({
        ...prev,
        logo: file,
        logoPreview: reader.result || '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSponsor = () => {
    if (!sponsorForm.name.trim()) {
      toast.error('Sponsor name is required.');
      return;
    }

    if (sponsorForm.id) {
      updateSponsorMutation.mutate();
      return;
    }

    createSponsorMutation.mutate();
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Event Sponsors</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage sponsor logos, links, and display order.</p>
          </div>
          <Button className="bg-[#02338D] hover:bg-[#022A78] text-white text-xs lg:text-sm" onClick={openCreateModal}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Sponsor
          </Button>
        </CardHeader>
        <CardContent>
          {isSponsorsLoading ? (
            <p className="text-sm text-gray-500">Loading sponsors...</p>
          ) : sponsorsData && sponsorsData.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sponsorsData.map((sponsor) => (
                <div key={sponsor.id} className="border border-gray-100 rounded-xl p-4 text-center relative group hover:shadow-md transition-shadow">
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-[#02338D]"
                      onClick={() => openEditModal(sponsor)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                      onClick={() => {
                        if (window.confirm('Remove this sponsor?')) {
                          deleteSponsorMutation.mutate(sponsor.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="mb-3 flex h-16 items-center justify-center">
                    {sponsor.logo_url ? (
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white p-3 shadow-sm">
                        <img src={sponsor.logo_url} alt={sponsor.name} className="h-full w-full rounded-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold">
                        {sponsor.name.charAt(0)}
                      </div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetSponsorForm}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="bg-[#02338D] px-6 py-4 text-white flex justify-between">
              <h3 className="font-semibold">{sponsorForm.id ? 'Edit Sponsor' : 'Add Sponsor'}</h3>
              <button onClick={resetSponsorForm}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <label className="mx-auto flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-[#CBD5E1] bg-[#F8FAFC]">
                {sponsorForm.logoPreview ? (
                  <img src={sponsorForm.logoPreview} alt="Sponsor preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center text-[#94A3B8]">
                    <ImagePlus className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-[11px]">Upload Logo</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(event) => handleLogoChange(event.target.files?.[0])} />
              </label>

              <div>
                <Label>Sponsor Name *</Label>
                <Input value={sponsorForm.name} onChange={(event) => setSponsorForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={sponsorForm.website} placeholder="https://" onChange={(event) => setSponsorForm((prev) => ({ ...prev, website: event.target.value }))} />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={resetSponsorForm}>Cancel</Button>
                <Button
                  className="bg-[#C58B1A] hover:bg-[#A56F14] text-white"
                  onClick={handleSaveSponsor}
                  disabled={createSponsorMutation.isPending || updateSponsorMutation.isPending}
                >
                  {createSponsorMutation.isPending || updateSponsorMutation.isPending
                    ? 'Saving...'
                    : (sponsorForm.id ? 'Update Sponsor' : 'Add Sponsor')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SponsorsTab;
