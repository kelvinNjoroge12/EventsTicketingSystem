import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/apiClient';
import { REVENUE_SOURCES } from './dashboardUtils';

const RevenueFormModal = ({ isOpen, onClose, events, defaultEventId }) => {
    const queryClient = useQueryClient();
    const [revenueForm, setRevenueForm] = useState({ event: '', description: '', amount: '', source: 'sponsorship' });
    const [customRevenueSource, setCustomRevenueSource] = useState('');

    useEffect(() => {
        if (isOpen) {
            setRevenueForm(prev => ({ ...prev, event: defaultEventId || '', description: '', amount: '', source: 'sponsorship' }));
            setCustomRevenueSource('');
        }
    }, [isOpen, defaultEventId]);

    const addRevenueMutation = useMutation({
        mutationFn: async (payload) => api.post('/api/finances/revenues/', payload),
        onSuccess: () => {
            toast.success('Revenue added.');
            onClose();
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
            queryClient.invalidateQueries({ queryKey: ['event_revenues'] });
        },
        onError: (error) => {
            toast.error(error?.message || 'Failed to add revenue.');
        },
    });

    if (!isOpen) return null;

    const selectedRevenueSource = REVENUE_SOURCES.find((item) => item.id === revenueForm.source) || REVENUE_SOURCES[1];
    const revenueNeedsCustomLabel = Boolean(selectedRevenueSource?.custom);
    const isFormValid =
        revenueForm.event &&
        revenueForm.description &&
        revenueForm.amount &&
        !Boolean(selectedRevenueSource?.auto) &&
        (!revenueNeedsCustomLabel || customRevenueSource.trim());

    const submitRevenueEntry = () => {
        if (!isFormValid) return;
        const customLabel = customRevenueSource.trim();
        const description = revenueForm.description.trim();
        const payload = {
            event: revenueForm.event,
            source: selectedRevenueSource.backend,
            description: revenueNeedsCustomLabel ? `${customLabel}: ${description}` : description,
            amount: Number(revenueForm.amount),
        };
        addRevenueMutation.mutate(payload);
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="bg-[#C58B1A] px-6 py-4 text-white flex items-center justify-between">
                    <h3 className="font-semibold">Add Revenue</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5 break-normal">Event *</label>
                        <select
                            value={revenueForm.event}
                            onChange={(event) => setRevenueForm((prev) => ({ ...prev, event: event.target.value }))}
                            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 bg-white text-black"
                        >
                            <option value="">Select event...</option>
                            {events.map((eventItem) => (
                                <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5 break-normal">Source *</label>
                        <div className="grid grid-cols-3 gap-2">
                            {REVENUE_SOURCES.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={item.auto}
                                        onClick={() => {
                                            if (item.auto) return;
                                            setRevenueForm((prev) => ({ ...prev, source: item.id }));
                                            if (!item.custom) setCustomRevenueSource('');
                                        }}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${revenueForm.source === item.id
                                                ? 'border-[#16A34A] bg-green-50'
                                                : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                                            } ${item.auto ? 'opacity-70 cursor-not-allowed bg-[#F8FAFC]' : ''}`}
                                    >
                                        {Icon && <Icon className="w-4 h-4" style={{ color: item.color }} />}
                                        <span className="text-[9px] font-medium text-[#64748B] leading-tight break-words whitespace-normal">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-2">
                            Ticket Sales revenue is automatic and recorded after successful ticket purchase.
                        </p>
                    </div>

                    {revenueNeedsCustomLabel && (
                        <div>
                            <label className="block text-xs font-medium text-[#64748B] mb-1.5 break-normal">Custom Source Name *</label>
                            <input
                                type="text"
                                value={customRevenueSource}
                                onChange={(event) => setCustomRevenueSource(event.target.value)}
                                placeholder="e.g., Main brand sponsor"
                                className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 bg-white text-black"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5 break-normal">Description *</label>
                        <input
                            type="text"
                            value={revenueForm.description}
                            onChange={(event) => setRevenueForm((prev) => ({ ...prev, description: event.target.value }))}
                            placeholder="e.g., Gold sponsor package"
                            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 bg-white text-black"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5 break-normal">Amount (KES) *</label>
                        <input
                            type="number"
                            value={revenueForm.amount}
                            onChange={(event) => setRevenueForm((prev) => ({ ...prev, amount: event.target.value }))}
                            placeholder="0"
                            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 bg-white text-black"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={submitRevenueEntry}
                        disabled={!isFormValid || addRevenueMutation.isPending}
                        className="w-full py-3 bg-[#C58B1A] hover:bg-[#A56F14] text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {addRevenueMutation.isPending ? 'Saving...' : 'Add Revenue'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RevenueFormModal;
