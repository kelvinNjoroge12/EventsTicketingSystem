import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../lib/apiClient';
import { EXPENSE_CATEGORIES } from './dashboardUtils';

const ExpenseFormModal = ({ isOpen, onClose, events, defaultEventId }) => {
    const queryClient = useQueryClient();
    const [expenseForm, setExpenseForm] = useState({ event: '', description: '', amount: '', category: 'speakers' });

    useEffect(() => {
        if (isOpen) {
            setExpenseForm(prev => ({ ...prev, event: defaultEventId || '', description: '', amount: '', category: 'speakers' }));
        }
    }, [isOpen, defaultEventId]);

    const addExpenseMutation = useMutation({
        mutationFn: async (payload) => api.post('/api/finances/expenses/', payload),
        onSuccess: () => {
            toast.success('Expense added.');
            onClose();
            queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
            queryClient.invalidateQueries({ queryKey: ['event_expenses'] });
        },
        onError: (error) => {
            toast.error(error?.message || 'Failed to add expense.');
        },
    });

    if (!isOpen) return null;

    const isFormValid = expenseForm.event && expenseForm.description && expenseForm.amount;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-left"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="bg-[#B91C1C] px-6 py-4 text-white flex items-center justify-between">
                    <h3 className="font-semibold">Add Expense</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5 break-normal">Event *</label>
                        <select
                            value={expenseForm.event}
                            onChange={(event) => setExpenseForm((prev) => ({ ...prev, event: event.target.value }))}
                            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 bg-white text-black"
                        >
                            <option value="">Select event...</option>
                            {events.map((eventItem) => (
                                <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5">Category *</label>
                        <div className="grid grid-cols-4 gap-2">
                            {EXPENSE_CATEGORIES.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setExpenseForm((prev) => ({ ...prev, category: item.id }))}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${expenseForm.category === item.id
                                                ? 'border-[#7C3AED] bg-purple-50'
                                                : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                                            }`}
                                    >
                                        {Icon && <Icon className="w-4 h-4" style={{ color: item.color }} />}
                                        <span className="text-[8px] font-medium text-[#64748B] leading-tight break-words whitespace-normal">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5">Description *</label>
                        <input
                            type="text"
                            value={expenseForm.description}
                            onChange={(event) => setExpenseForm((prev) => ({ ...prev, description: event.target.value }))}
                            placeholder="e.g., DJ equipment rental"
                            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 bg-white text-black"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5">Amount (KES) *</label>
                        <input
                            type="number"
                            value={expenseForm.amount}
                            onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))}
                            placeholder="0"
                            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 bg-white text-black"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (!isFormValid) return;
                            addExpenseMutation.mutate({
                                event: expenseForm.event,
                                category: expenseForm.category,
                                description: expenseForm.description,
                                amount: Number(expenseForm.amount),
                            });
                        }}
                        disabled={!isFormValid || addExpenseMutation.isPending}
                        className="w-full py-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {addExpenseMutation.isPending ? 'Saving...' : 'Add Expense'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExpenseFormModal;
