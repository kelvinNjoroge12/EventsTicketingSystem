import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mic, Plus, Trash2, X, Pencil, ImagePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

const emptySpeakerForm = {
  id: null,
  name: '',
  title: '',
  organization: '',
  bio: '',
  twitter: '',
  linkedin: '',
  is_mc: false,
  sort_order: 0,
  avatar: null,
  photoPreview: '',
};

const SpeakersTab = ({ slug, eventDetail = null }) => {
  const queryClient = useQueryClient();
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [speakerForm, setSpeakerForm] = useState(emptySpeakerForm);

  const { data: speakersData = [], isLoading: isSpeakersLoading } = useQuery({
    queryKey: ['speakers', slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${slug}/speakers/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!slug,
    staleTime: 30 * 1000,
    placeholderData: () => {
      const speakers = Array.isArray(eventDetail?.speakers) ? eventDetail.speakers : [];
      const mc = eventDetail?.mc ? [eventDetail.mc] : [];
      const combined = [...speakers, ...mc]
        .filter((speaker) => speaker && (speaker.id || speaker.name))
        .map((speaker, index) => ({
          ...speaker,
          avatar_url: speaker.avatar_url || speaker.avatar || '',
          sort_order: speaker.sort_order ?? index,
        }));
      return combined.length > 0 ? combined : undefined;
    },
  });

  const resetSpeakerForm = () => {
    setSpeakerForm(emptySpeakerForm);
    setShowSpeakerModal(false);
  };

  const refreshSpeakerQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['speakers', slug] });
    queryClient.invalidateQueries({ queryKey: ['organizer_event_detail', slug] });
    queryClient.invalidateQueries({ queryKey: ['events', 'detail', slug] });
    queryClient.invalidateQueries({ queryKey: ['events', 'detail-lite', slug] });
    queryClient.invalidateQueries({ queryKey: ['events', 'speakers', slug] });
  };

  const buildSpeakerPayload = () => {
    const payload = {
      name: speakerForm.name,
      title: speakerForm.title,
      organization: speakerForm.organization,
      bio: speakerForm.bio,
      twitter: speakerForm.twitter,
      linkedin: speakerForm.linkedin,
      is_mc: speakerForm.is_mc,
      sort_order: speakerForm.sort_order,
    };

    if (!speakerForm.avatar) {
      return payload;
    }

    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, String(value ?? ''));
    });
    formData.append('avatar', speakerForm.avatar);
    return formData;
  };

  const createSpeakerMutation = useMutation({
    mutationFn: async () => {
      const payload = buildSpeakerPayload();
      return payload instanceof FormData
        ? api.postForm(`/api/events/${slug}/speakers/`, payload)
        : api.post(`/api/events/${slug}/speakers/`, payload);
    },
    onSuccess: () => {
      toast.success('Speaker added.');
      resetSpeakerForm();
      refreshSpeakerQueries();
    },
    onError: (err) => toast.error(err?.message || 'Failed to add speaker.')
  });

  const updateSpeakerMutation = useMutation({
    mutationFn: async () => {
      const payload = buildSpeakerPayload();
      return payload instanceof FormData
        ? api.patchForm(`/api/events/${slug}/speakers/${speakerForm.id}/`, payload)
        : api.patch(`/api/events/${slug}/speakers/${speakerForm.id}/`, payload);
    },
    onSuccess: () => {
      toast.success('Speaker updated.');
      resetSpeakerForm();
      refreshSpeakerQueries();
    },
    onError: (err) => toast.error(err?.message || 'Failed to update speaker.')
  });

  const deleteSpeakerMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${slug}/speakers/${id}/`),
    onSuccess: () => {
      toast.success('Speaker removed.');
      refreshSpeakerQueries();
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove speaker.')
  });

  const openCreateModal = () => {
    setSpeakerForm({
      ...emptySpeakerForm,
      sort_order: speakersData.length,
    });
    setShowSpeakerModal(true);
  };

  const openEditModal = (speaker) => {
    setSpeakerForm({
      id: speaker.id,
      name: speaker.name || '',
      title: speaker.title || '',
      organization: speaker.organization || '',
      bio: speaker.bio || '',
      twitter: speaker.twitter || '',
      linkedin: speaker.linkedin || '',
      is_mc: Boolean(speaker.is_mc),
      sort_order: speaker.sort_order ?? 0,
      avatar: null,
      photoPreview: speaker.avatar_url || '',
    });
    setShowSpeakerModal(true);
  };

  const handlePhotoChange = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSpeakerForm((prev) => ({
        ...prev,
        avatar: file,
        photoPreview: reader.result || '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSpeaker = () => {
    if (!speakerForm.name.trim()) {
      toast.error('Speaker name is required.');
      return;
    }

    if (speakerForm.id) {
      updateSpeakerMutation.mutate();
      return;
    }

    createSpeakerMutation.mutate();
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Speakers / Lineup</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage speaker profiles, bios, and photos for your event.</p>
          </div>
          <Button className="bg-[#02338D] hover:bg-[#022A78] text-white text-xs lg:text-sm" onClick={openCreateModal}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Speaker
          </Button>
        </CardHeader>
        <CardContent>
          {isSpeakersLoading ? (
            <p className="text-sm text-gray-500">Loading speakers...</p>
          ) : speakersData && speakersData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {speakersData.map((speaker) => (
                <div key={speaker.id} className="border border-gray-100 rounded-xl p-4 flex gap-4 relative group hover:shadow-md transition-shadow">
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-[#02338D]"
                      onClick={() => openEditModal(speaker)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => {
                        if (window.confirm('Remove this speaker?')) {
                          deleteSpeakerMutation.mutate(speaker.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {speaker.avatar_url ? (
                      <img src={speaker.avatar_url} alt={speaker.name} className="w-full h-full object-cover" />
                    ) : (
                      <Mic className="w-7 h-7 m-3.5 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-[#0F172A] truncate">{speaker.name}</h4>
                    <p className="text-xs text-gray-500">
                      {speaker.title}
                      {speaker.organization ? ` @ ${speaker.organization}` : ''}
                    </p>
                    {speaker.bio && <p className="text-xs text-gray-500 mt-2 line-clamp-3">{speaker.bio}</p>}
                    {speaker.is_mc && <Badge className="mt-2 bg-purple-100 text-purple-700 text-[10px]" variant="outline">Host / MC</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Mic className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[#0F172A] font-medium text-sm">No speakers added</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showSpeakerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetSpeakerForm}>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#02338D] px-6 py-4 text-white flex justify-between">
              <h3 className="font-semibold">{speakerForm.id ? 'Edit Speaker' : 'Add Speaker'}</h3>
              <button onClick={resetSpeakerForm}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="w-28 h-28 rounded-full border border-dashed border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden flex items-center justify-center cursor-pointer flex-shrink-0">
                  {speakerForm.photoPreview ? (
                    <img src={speakerForm.photoPreview} alt="Speaker preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-[#94A3B8]">
                      <ImagePlus className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-[11px]">Upload Photo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePhotoChange(event.target.files?.[0])} />
                </label>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Name *</Label>
                    <Input value={speakerForm.name} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Title / Role</Label>
                    <Input value={speakerForm.title} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, title: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Organization</Label>
                    <Input value={speakerForm.organization} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, organization: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div>
                <Label>Bio</Label>
                <textarea
                  rows={4}
                  value={speakerForm.bio}
                  onChange={(e) => setSpeakerForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Short speaker introduction"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Twitter</Label>
                  <Input value={speakerForm.twitter} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, twitter: e.target.value }))} placeholder="@handle" />
                </div>
                <div>
                  <Label>LinkedIn</Label>
                  <Input value={speakerForm.linkedin} onChange={(e) => setSpeakerForm((prev) => ({ ...prev, linkedin: e.target.value }))} placeholder="Profile link" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="is_mc"
                  checked={speakerForm.is_mc}
                  onChange={(e) => setSpeakerForm((prev) => ({ ...prev, is_mc: e.target.checked }))}
                  className="rounded text-[#02338D]"
                />
                <Label htmlFor="is_mc" className="cursor-pointer text-sm">Is this speaker the Host / MC?</Label>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={resetSpeakerForm}>Cancel</Button>
                <Button
                  className="bg-[#C58B1A] hover:bg-[#A56F14] text-white"
                  onClick={handleSaveSpeaker}
                  disabled={createSpeakerMutation.isPending || updateSpeakerMutation.isPending}
                >
                  {createSpeakerMutation.isPending || updateSpeakerMutation.isPending
                    ? 'Saving...'
                    : (speakerForm.id ? 'Update Speaker' : 'Add Speaker')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakersTab;
