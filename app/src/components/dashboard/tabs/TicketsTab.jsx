import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket, Plus, Pencil, ToggleRight, ToggleLeft, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const formatMoney = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;

const TicketsTab = ({ slug }) => {
  const queryClient = useQueryClient();
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [ticketForm, setTicketForm] = useState({
    name: '', ticket_class: 'paid', price: '', quantity: '', description: '', is_active: true
  });

  const { data: managedTickets = [], isLoading: isManagedTicketsLoading } = useQuery({
    queryKey: ['managed_tickets', slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${slug}/tickets/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!slug,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${slug}/tickets/create/`, payload),
    onSuccess: () => {
      toast.success('Ticket tier created.');
      setShowTicketModal(false);
      setTicketForm({ name: '', ticket_class: 'paid', price: '', quantity: '', description: '', is_active: true });
      queryClient.invalidateQueries({ queryKey: ['managed_tickets', slug] });
      queryClient.invalidateQueries({ queryKey: ['organizer_event_detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['events', 'detail-lite', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to create ticket tier.')
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => api.patch(`/api/events/${slug}/tickets/${id}/`, payload),
    onSuccess: () => {
      toast.success('Ticket tier updated.');
      setShowTicketModal(false);
      setEditingTicket(null);
      setTicketForm({ name: '', ticket_class: 'paid', price: '', quantity: '', description: '', is_active: true });
      queryClient.invalidateQueries({ queryKey: ['managed_tickets', slug] });
      queryClient.invalidateQueries({ queryKey: ['organizer_event_detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['events', 'detail-lite', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to update ticket tier.')
  });

  const toggleTicketMutation = useMutation({
    mutationFn: async ({ id, is_active }) => api.patch(`/api/events/${slug}/tickets/${id}/`, { is_active }),
    onSuccess: () => {
      toast.success('Ticket sales status updated.');
      queryClient.invalidateQueries({ queryKey: ['managed_tickets', slug] });
      queryClient.invalidateQueries({ queryKey: ['organizer_event_detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['events', 'detail-lite', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to toggle ticket.')
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${slug}/tickets/${id}/`),
    onSuccess: () => {
      toast.success('Ticket tier deleted.');
      queryClient.invalidateQueries({ queryKey: ['managed_tickets', slug] });
      queryClient.invalidateQueries({ queryKey: ['organizer_event_detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', slug] });
      queryClient.invalidateQueries({ queryKey: ['events', 'detail-lite', slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete ticket tier.')
  });

  const openEditTicket = (ticket) => {
    setEditingTicket(ticket);
    setTicketForm({
      name: ticket.name || '',
      ticket_class: ticket.ticket_class || 'paid',
      price: ticket.price ?? '',
      quantity: ticket.quantity ?? '',
      description: ticket.description || '',
      is_active: ticket.is_active ?? true
    });
    setShowTicketModal(true);
  };

  const handleSaveTicket = () => {
    if (!ticketForm.name || !ticketForm.quantity) {
      toast.error('Name and quantity are required.');
      return;
    }
    const payload = {
      name: ticketForm.name,
      ticket_class: ticketForm.ticket_class,
      price: Number(ticketForm.price || 0),
      quantity: Number(ticketForm.quantity),
      description: ticketForm.description,
      is_active: ticketForm.is_active,
    };
    if (editingTicket) {
      updateTicketMutation.mutate({ id: editingTicket.id, ...payload });
    } else {
      createTicketMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Ticket Tiers</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage pricing, quantities, and sales status for each tier.</p>
          </div>
          <Button className="bg-[#02338D] hover:bg-[#022A78] text-white text-xs lg:text-sm" onClick={() => { setEditingTicket(null); setTicketForm({ name: '', ticket_class: 'paid', price: '', quantity: '', description: '', is_active: true }); setShowTicketModal(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Ticket Tier
          </Button>
        </CardHeader>
        <CardContent>
          {isManagedTicketsLoading ? (
            <p className="text-sm text-gray-500">Loading tickets...</p>
          ) : managedTickets && managedTickets.length > 0 ? (
            <div className="space-y-3">
              {managedTickets.map(ticket => {
                const soldPct = ticket.quantity ? Math.round((ticket.quantity_sold / ticket.quantity) * 100) : 0;
                return (
                  <div key={ticket.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Ticket className="w-4 h-4 text-[#C58B1A]" />
                          <h4 className="font-bold text-[#0F172A]">{ticket.name}</h4>
                          <Badge className={ticket.is_active ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'} variant="outline">
                            {ticket.is_active ? 'On Sale' : 'Paused'}
                          </Badge>
                          {ticket.is_sold_out && <Badge className="bg-red-100 text-red-700 text-[10px]" variant="outline">Sold Out</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                          <span>Class: <strong className="text-[#0F172A] capitalize">{ticket.ticket_class}</strong></span>
                          <span>Price: <strong className="text-[#0F172A]">{formatMoney(ticket.price)}</strong></span>
                          <span>Sold: <strong className="text-[#0F172A]">{ticket.quantity_sold || 0}</strong> / {ticket.quantity}</span>
                          <span>Available: <strong className="text-[#0F172A]">{ticket.quantity_available ?? (ticket.quantity - (ticket.quantity_sold || 0))}</strong></span>
                        </div>
                        <div className="w-full max-w-xs h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-[#C58B1A] rounded-full transition-all" style={{ width: `${soldPct}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditTicket(ticket)} className="text-gray-400 hover:text-[#02338D]">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title={ticket.is_active ? 'Pause Sales' : 'Resume Sales'} onClick={() => toggleTicketMutation.mutate({ id: ticket.id, is_active: !ticket.is_active })} className="text-gray-400 hover:text-[#C58B1A]">
                          {ticket.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (window.confirm('Delete this ticket tier?')) deleteTicketMutation.mutate(ticket.id); }} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[#0F172A] font-medium text-sm">No ticket tiers</p>
              <p className="text-gray-500 text-xs mt-1">Create your first ticket tier to start selling.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTicket ? 'Edit Ticket Tier' : 'Create Ticket Tier'}</DialogTitle>
            <DialogDescription>Set pricing and availability for this ticket type.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ticketName">Tier Name</Label>
              <Input
                id="ticketName"
                value={ticketForm.name}
                onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                placeholder="e.g., Early Bird, VIP"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ticket Class</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={ticketForm.ticket_class}
                  onChange={(e) => setTicketForm({ ...ticketForm, ticket_class: e.target.value })}
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                  <option value="donation">Donation</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ticketQuantity">Quantity</Label>
                <Input
                  id="ticketQuantity"
                  type="number"
                  min="1"
                  value={ticketForm.quantity}
                  onChange={(e) => setTicketForm({ ...ticketForm, quantity: e.target.value === '' ? '' : Math.max(1, Number(e.target.value)) })}
                  placeholder="Total tickets"
                />
              </div>
            </div>
            {ticketForm.ticket_class === 'paid' && (
              <div className="grid gap-2">
                <Label htmlFor="ticketPrice">Price (KES)</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  min="0"
                  value={ticketForm.price}
                  onChange={(e) => setTicketForm({ ...ticketForm, price: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })}
                  placeholder="e.g., 2000"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="ticketDesc">Description (Optional)</Label>
              <Input
                id="ticketDesc"
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="What is included in this tier?"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="ticketActive"
                checked={ticketForm.is_active}
                onChange={(e) => setTicketForm({ ...ticketForm, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="ticketActive" className="text-sm font-normal">Active (available for purchase)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketModal(false)}>Cancel</Button>
            <Button onClick={handleSaveTicket} disabled={createTicketMutation.isPending || updateTicketMutation.isPending} className="bg-[#02338D] text-white">
              {editingTicket ? 'Update Tier' : 'Create Tier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketsTab;


