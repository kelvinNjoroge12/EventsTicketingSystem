import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Power, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

const formatMoney = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;

const PromoCodesTab = ({ slug }) => {
  const queryClient = useQueryClient();
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '',
    usage_limit: '',
    expiry: '',
    is_active: true
  });

  const { data: promoCodesData, isLoading: isPromoCodesLoading } = useQuery({
    queryKey: ['promo_codes', slug],
    queryFn: async () => {
      const response = await api.get(`/api/events/${slug}/promo-codes/`);
      return Array.isArray(response?.results) ? response.results : (Array.isArray(response) ? response : []);
    },
    enabled: !!slug,
  });

  const createPromoMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${slug}/promo-codes/`, payload),
    onSuccess: () => {
      toast.success('Promo code created successfully.');
      setShowPromoModal(false);
      setPromoForm({
        code: '',
        discount_type: 'percent',
        discount_value: '',
        usage_limit: '',
        expiry: '',
        is_active: true
      });
      queryClient.invalidateQueries({ queryKey: ['promo_codes', slug] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create promo code.');
    }
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${slug}/promo-codes/${id}/`),
    onSuccess: () => {
      toast.success('Promo code deleted.');
      queryClient.invalidateQueries({ queryKey: ['promo_codes', slug] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to delete promo code.');
    }
  });

  const togglePromoMutation = useMutation({
    mutationFn: async ({ id, is_active }) => api.patch(`/api/events/${slug}/promo-codes/${id}/`, { is_active }),
    onSuccess: () => {
      toast.success('Promo code status updated.');
      queryClient.invalidateQueries({ queryKey: ['promo_codes', slug] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to update promo code.');
    }
  });

  const handleCreatePromo = () => {
    if (!promoForm.code || !promoForm.discount_value) {
      toast.error('Code and discount value are required.');
      return;
    }
    const payload = {
      code: promoForm.code.toUpperCase().replace(/\s+/g, ''),
      discount_type: promoForm.discount_type,
      discount_value: Number(promoForm.discount_value),
      is_active: promoForm.is_active,
    };
    if (promoForm.usage_limit) payload.usage_limit = Number(promoForm.usage_limit);
    if (promoForm.expiry) payload.expiry = new Date(promoForm.expiry).toISOString();

    createPromoMutation.mutate(payload);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Promo Codes</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage discount codes for your ticket buyers.</p>
          </div>
          <Button className="bg-[#1E4DB7] hover:bg-[#163B90] text-white text-xs lg:text-sm" onClick={() => setShowPromoModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Promo Code
          </Button>
        </CardHeader>
        <CardContent>
          {isPromoCodesLoading ? (
            <p className="text-sm text-gray-500">Loading promo codes...</p>
          ) : promoCodesData && promoCodesData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Discount</th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Usage</th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promoCodesData.map((promo) => (
                    <tr key={promo.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-[#C58B1A]" />
                          <span className="font-bold text-[#0F172A]">{promo.code}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-[#0F172A]">
                        {promo.discount_type === 'percent' ? `${promo.discount_value}%` : formatMoney(promo.discount_value)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {promo.times_used} {promo.usage_limit ? `/ ${promo.usage_limit}` : 'uses'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'} variant="outline">
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={promo.is_active ? "Deactivate" : "Activate"}
                          onClick={() => togglePromoMutation.mutate({ id: promo.id, is_active: !promo.is_active })}
                          className="text-gray-400 hover:text-[#1E4DB7]"
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if(window.confirm('Delete this promo code?')) deletePromoMutation.mutate(promo.id);
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-[#0F172A] font-medium text-sm">No promo codes</p>
              <p className="text-gray-500 text-xs mt-1">Create discount codes to boost ticket sales.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showPromoModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowPromoModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-[#1E4DB7] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-semibold">Create Promo Code</h3>
              <button onClick={() => setShowPromoModal(false)} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-xs mb-1.5 text-gray-500 block">Code Name *</Label>
                <Input
                  value={promoForm.code}
                  onChange={(e) => setPromoForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. EARLYBIRD20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Discount Type</Label>
                  <select
                    value={promoForm.discount_type}
                    onChange={(e) => setPromoForm((prev) => ({ ...prev, discount_type: e.target.value }))}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Discount Value *</Label>
                  <Input
                    type="number"
                    value={promoForm.discount_value}
                    onChange={(e) => setPromoForm((prev) => ({ ...prev, discount_value: e.target.value }))}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Usage Limit (Optional)</Label>
                  <Input
                    type="number"
                    value={promoForm.usage_limit}
                    onChange={(e) => setPromoForm((prev) => ({ ...prev, usage_limit: e.target.value }))}
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Expiry Date (Optional)</Label>
                  <Input
                    type="date"
                    value={promoForm.expiry}
                    onChange={(e) => setPromoForm((prev) => ({ ...prev, expiry: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="promo-active"
                  checked={promoForm.is_active}
                  onChange={(e) => setPromoForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded text-[#1E4DB7] focus:ring-[#1E4DB7]"
                />
                <Label htmlFor="promo-active" className="text-sm cursor-pointer">Activate immediately</Label>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowPromoModal(false)}>Cancel</Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white" onClick={handleCreatePromo} disabled={createPromoMutation.isPending}>
                  {createPromoMutation.isPending ? 'Saving...' : 'Create Code'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodesTab;
