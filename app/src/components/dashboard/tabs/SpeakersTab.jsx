import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mic, Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

const SpeakersTab = ({ slug }) => {
  const queryClient = useQueryClient();
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [speakerForm, setSpeakerForm] = useState({
    name: '', title: '', organization: '', bio: '', twitter: '', linkedin: '', is_mc: false, sort_order: 0
  });

  const { data: speakersData = [], isLoading: isSpeakersLoading } = useQuery({
    queryKey: ['speakers', slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${slug}/speakers/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!slug,
  });

  const createSpeakerMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${slug}/speakers/`, payload),
    onSuccess: () => {
      toast.success('Speaker added.');
      setShowSpeakerModal(false);
      setSpeakerForm({ name: '', title: '', organization: '', bio: '', twitter: '', linkedin: '', is_mc: false, sort_order: 0 });
      queryClient.invalidateQueries({ queryKey: ['speakers', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to add speaker.')
  });

  const deleteSpeakerMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${slug}/speakers/${id}/`),
    onSuccess: () => {
      toast.success('Speaker removed.');
      queryClient.invalidateQueries({ queryKey: ['speakers', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove speaker.')
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Speakers / Lineup</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage speakers and hosts for your event.</p>
          </div>
          <Button className="bg-[#02338D] hover:bg-[#022A78] text-white text-xs lg:text-sm" onClick={() => setShowSpeakerModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Speaker
          </Button>
        </CardHeader>
        <CardContent>
          {isSpeakersLoading ? (
            <p className="text-sm text-gray-500">Loading speakers...</p>
          ) : speakersData && speakersData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {speakersData.map(speaker => (
                <div key={speaker.id} className="border border-gray-100 rounded-xl p-4 flex gap-4 relative group hover:shadow-md transition-shadow">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if(window.confirm('Remove this speaker?')) deleteSpeakerMutation.mutate(speaker.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {speaker.avatar_url ? (
                      <img src={speaker.avatar_url} alt={speaker.name} className="w-full h-full object-cover" />
                    ) : (
                      <Mic className="w-6 h-6 m-3 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A]">{speaker.name}</h4>
                    <p className="text-xs text-gray-500">{speaker.title} {speaker.organization ? `@ ${speaker.organization}` : ''}</p>
                    {speaker.is_mc && <Badge className="mt-1 bg-purple-100 text-purple-700 text-[10px]" variant="outline">Host / MC</Badge>}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSpeakerModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#02338D] px-6 py-4 text-white flex justify-between">
              <h3 className="font-semibold">Add Speaker</h3>
              <button onClick={() => setShowSpeakerModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={speakerForm.name} onChange={e => setSpeakerForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title/Role</Label>
                  <Input value={speakerForm.title} onChange={e => setSpeakerForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Organization</Label>
                  <Input value={speakerForm.organization} onChange={e => setSpeakerForm(p => ({ ...p, organization: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="is_mc" checked={speakerForm.is_mc} onChange={e => setSpeakerForm(p => ({ ...p, is_mc: e.target.checked }))} className="rounded text-[#02338D]" />
                <Label htmlFor="is_mc" className="cursor-pointer text-sm">Is this speaker the Host / MC?</Label>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowSpeakerModal(false)}>Cancel</Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white" onClick={() => createSpeakerMutation.mutate(speakerForm)} disabled={createSpeakerMutation.isPending}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakersTab;


