import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, Plus, MapPin, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

const ScheduleTab = ({ slug }) => {
  const queryClient = useQueryClient();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '', description: '', start_time: '', end_time: '', day: 1, session_type: '', location: '', speaker: '', sort_order: 0
  });

  const { data: scheduleData = [], isLoading: isScheduleLoading } = useQuery({
    queryKey: ['schedule', slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${slug}/schedule/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!slug,
  });

  const { data: speakersData = [] } = useQuery({
    queryKey: ['speakers', slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${slug}/speakers/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!slug,
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${slug}/schedule/`, payload),
    onSuccess: () => {
      toast.success('Schedule item added.');
      setShowScheduleModal(false);
      setScheduleForm({ title: '', description: '', start_time: '', end_time: '', day: 1, session_type: '', location: '', speaker: '', sort_order: 0 });
      queryClient.invalidateQueries({ queryKey: ['schedule', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to add schedule item.')
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${slug}/schedule/${id}/`),
    onSuccess: () => {
      toast.success('Schedule item removed.');
      queryClient.invalidateQueries({ queryKey: ['schedule', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove schedule item.')
  });

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Event Schedule</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage event agenda and sessions.</p>
          </div>
          <Button className="bg-[#02338D] hover:bg-[#022A78] text-white text-xs lg:text-sm" onClick={() => setShowScheduleModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Session
          </Button>
        </CardHeader>
        <CardContent>
          {isScheduleLoading ? (
            <p className="text-sm text-gray-500">Loading schedule...</p>
          ) : scheduleData && scheduleData.length > 0 ? (
            <div className="space-y-4">
              {scheduleData.map(session => (
                <div key={session.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl relative group hover:shadow-md transition-shadow">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      if(window.confirm('Remove this session?')) deleteScheduleMutation.mutate(session.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <div className="w-20 flex-shrink-0 text-center flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2">
                    <p className="text-sm font-bold text-[#0F172A]">{session.start_time?.substring(0, 5)}</p>
                    {session.end_time && <p className="text-xs text-gray-500">to {session.end_time?.substring(0, 5)}</p>}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A]">{session.title}</h4>
                    {session.speaker_name && <p className="text-sm text-[#02338D]">Speaker: {session.speaker_name}</p>}
                    {session.location && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <CalendarRange className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[#0F172A] font-medium text-sm">No schedule items added</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#02338D] px-6 py-4 text-white flex justify-between">
              <h3 className="font-semibold">Add Schedule Item</h3>
              <button onClick={() => setShowScheduleModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <Label>Session Title *</Label>
                <Input value={scheduleForm.title} onChange={e => setScheduleForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time *</Label>
                  <Input type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm(p => ({ ...p, start_time: e.target.value }))} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm(p => ({ ...p, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location / Room</Label>
                  <Input value={scheduleForm.location} onChange={e => setScheduleForm(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div>
                  <Label>Speaker (Optional)</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={scheduleForm.speaker} onChange={e => setScheduleForm(p => ({ ...p, speaker: e.target.value }))}>
                    <option value="">None</option>
                    {speakersData.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white" onClick={() => {
                  const payload = { ...scheduleForm };
                  if (!payload.speaker) delete payload.speaker;
                  createScheduleMutation.mutate(payload);
                }} disabled={createScheduleMutation.isPending}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleTab;


