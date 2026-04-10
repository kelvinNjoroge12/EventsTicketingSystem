import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RotateCcw, Save, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { TicketsStep } from '@/components/organizer/EventForm';
import {
  createDefaultRegistrationCategories,
  mapApiPromoToEditorPromo,
  mapApiTicketToEditorTicket,
  mapRefundPolicy,
  mergeRegistrationCategories,
  TICKET_CLASS_BY_TYPE,
  unmapRefundPolicy,
} from '@/lib/eventSetup';

const getTicketSetupErrorMessage = (error) => {
  const response = error?.response;

  if (response && typeof response === 'object' && !Array.isArray(response)) {
    const [firstField, firstValue] = Object.entries(response)[0] || [];
    const firstMessage = Array.isArray(firstValue)
      ? firstValue[0]
      : firstValue && typeof firstValue === 'object'
        ? Object.values(firstValue)[0]
        : firstValue;

    if (typeof firstMessage === 'string' && firstMessage.trim()) {
      if (firstField === 'custom_refund_policy') {
        return 'Please add your custom refund policy before saving.';
      }
      return firstMessage.trim();
    }
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return 'Failed to save the ticket setup.';
};

const isMeaningfulPromo = (promo = {}) =>
  Boolean(
    String(promo.code || '').trim() ||
    String(promo.discount_value ?? '').trim() ||
    String(promo.usage_limit ?? '').trim() ||
    String(promo.expiry || '').trim() ||
    String(promo.minimum_order_amount ?? '').trim()
  );

const buildTicketSetupState = ({ eventDetail, managedTickets, registrationSetupData, promoCodesData }) => ({
  themeColor: eventDetail?.themeColor || eventDetail?.theme_color || '#02338D',
  currency: managedTickets.find((ticket) => ticket?.currency)?.currency || eventDetail?.currency || 'KES',
  tickets: managedTickets.length > 0
    ? managedTickets.map((ticket) => mapApiTicketToEditorTicket(ticket))
    : [{ type: 'Standard', price: 0, quantity: 100, description: '', category: 'guest' }],
  promoCodes: promoCodesData.map((promo) => mapApiPromoToEditorPromo(promo)),
  registrationCategories: mergeRegistrationCategories(
    registrationSetupData?.categories || eventDetail?.registrationCategories || []
  ),
  refundPolicy: unmapRefundPolicy(eventDetail?.refundPolicy || eventDetail?.refund_policy),
  customRefundPolicy: eventDetail?.customRefundPolicy || eventDetail?.custom_refund_policy || '',
  enableWaitlist: Boolean(eventDetail?.enableWaitlist ?? eventDetail?.enable_waitlist ?? false),
  sendReminders: Boolean(eventDetail?.sendReminders ?? eventDetail?.send_reminders ?? true),
});

const TicketsTab = ({ slug, eventDetail }) => {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState(() => buildTicketSetupState({
    eventDetail,
    managedTickets: [],
    registrationSetupData: null,
    promoCodesData: [],
  }));
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data: managedTickets = [], isLoading: isTicketsLoading } = useQuery({
    queryKey: ['managed_tickets', slug],
    queryFn: async () => {
      const response = await api.get(`/api/events/${slug}/tickets/`);
      return Array.isArray(response?.results) ? response.results : (Array.isArray(response) ? response : []);
    },
    enabled: !!slug,
  });

  const { data: registrationSetupData, isLoading: isRegistrationLoading } = useQuery({
    queryKey: ['registration_setup', slug],
    queryFn: async () => api.get(`/api/events/${slug}/registration/setup/`),
    enabled: !!slug,
  });

  const { data: promoCodesData = [], isLoading: isPromoCodesLoading } = useQuery({
    queryKey: ['promo_codes', slug],
    queryFn: async () => {
      const response = await api.get(`/api/events/${slug}/promo-codes/`);
      return Array.isArray(response?.results) ? response.results : (Array.isArray(response) ? response : []);
    },
    enabled: !!slug,
  });

  const initialState = useMemo(
    () => buildTicketSetupState({ eventDetail, managedTickets, registrationSetupData, promoCodesData }),
    [eventDetail, managedTickets, registrationSetupData, promoCodesData]
  );

  useEffect(() => {
    if (!isDirty) {
      setFormState(initialState);
      setSaveError('');
    }
  }, [initialState]);

  const isLoading = isTicketsLoading || isRegistrationLoading || isPromoCodesLoading;

  const handleChange = (field, value) => {
    setFormState((previous) => ({ ...previous, [field]: value }));
    setIsDirty(true);
    if (saveError) {
      setSaveError('');
    }
  };

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['managed_tickets', slug] }),
      queryClient.invalidateQueries({ queryKey: ['registration_setup', slug] }),
      queryClient.invalidateQueries({ queryKey: ['promo_codes', slug] }),
      queryClient.invalidateQueries({ queryKey: ['organizer_event_detail', slug] }),
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', slug] }),
      queryClient.invalidateQueries({ queryKey: ['events', 'detail-lite', slug] }),
      queryClient.invalidateQueries({ queryKey: ['organizer_events'] }),
    ]);
  };

  const handleReset = () => {
    setFormState(initialState);
    setIsDirty(false);
    setSaveError('');
  };

  const handleSave = async () => {
    if (!slug || isSaving) {
      return;
    }

    if (!Array.isArray(formState.tickets) || formState.tickets.length === 0) {
      const message = 'At least one ticket type is required.';
      setSaveError(message);
      toast.error(message);
      return;
    }

    for (const ticket of formState.tickets || []) {
      if (!String(ticket.type || '').trim()) {
        const message = 'Please choose a ticket type for every ticket card.';
        setSaveError(message);
        toast.error(message);
        return;
      }
      if (!Number.isFinite(Number(ticket.quantity)) || Number(ticket.quantity) <= 0) {
        const message = 'Please add a valid quantity for every ticket type.';
        setSaveError(message);
        toast.error(message);
        return;
      }
      if (ticket.type !== 'Free' && (!Number.isFinite(Number(ticket.price)) || Number(ticket.price) < 0)) {
        const message = 'Please add a valid price for every paid ticket.';
        setSaveError(message);
        toast.error(message);
        return;
      }
    }

    if (formState.refundPolicy === 'Custom' && !String(formState.customRefundPolicy || '').trim()) {
      const message = 'Please add your custom refund policy before saving.';
      setSaveError(message);
      toast.error(message);
      return;
    }

    const meaningfulPromos = (formState.promoCodes || []).filter(isMeaningfulPromo);
    for (const promo of meaningfulPromos) {
      if (!String(promo.code || '').trim()) {
        const message = 'Please add a promo code name.';
        setSaveError(message);
        toast.error(message);
        return;
      }
      if (promo.discount_value === '' || Number(promo.discount_value) <= 0) {
        const message = 'Please add a valid discount value for each promo code.';
        setSaveError(message);
        toast.error(message);
        return;
      }
      if (promo.usage_limit === '' || Number(promo.usage_limit) <= 0) {
        const message = 'Please add a valid usage limit for each promo code.';
        setSaveError(message);
        toast.error(message);
        return;
      }
      if (!promo.expiry) {
        const message = 'Please add an expiry date for each promo code.';
        setSaveError(message);
        toast.error(message);
        return;
      }
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const categoriesPayload = (formState.registrationCategories || createDefaultRegistrationCategories()).map((category, index) => {
        const isStudent = category.category === 'student';
        const isAlumni = category.category === 'alumni';

        return {
          id: category.id,
          category: category.category,
          label: isStudent ? 'Student' : isAlumni ? 'Alumni' : (category.label || 'Guest'),
          is_active: Boolean(category.is_active),
          sort_order: index,
          require_student_email: isStudent ? true : Boolean(category.require_student_email),
          require_admission_number: isStudent ? true : Boolean(category.require_admission_number),
          ask_graduation_year: Boolean(category.ask_graduation_year),
          ask_course: Boolean(category.ask_course),
          ask_school: Boolean(category.ask_school),
          ask_location: Boolean(category.ask_location),
          questions: (category.questions || [])
            .filter((question) => String(question.label || '').trim())
            .map((question, questionIndex) => ({
              id: question.id,
              label: question.label,
              field_type: question.field_type || 'text',
              is_required: Boolean(question.is_required),
              options: Array.isArray(question.options) ? question.options : [],
              sort_order: question.sort_order ?? questionIndex,
            })),
        };
      });

      const registrationResponse = await api.post(`/api/events/${slug}/registration/setup/`, {
        categories: categoriesPayload,
      });
      const savedCategories = Array.isArray(registrationResponse?.categories)
        ? registrationResponse.categories
        : [];
      const registrationMap = new Map(savedCategories.map((category) => [category.category, category]));

      const ticketRequests = [];
      const activeTicketIds = new Set((formState.tickets || []).map((ticket) => ticket.id).filter(Boolean));

      (formState.tickets || []).forEach((ticket, index) => {
        const categoryType = ticket.category || 'guest';
        const categoryEntry = registrationMap.get(categoryType);
        const payload = {
          name: ticket.type,
          ticket_class: TICKET_CLASS_BY_TYPE[ticket.type] || 'paid',
          price: ticket.type === 'Free' ? 0 : Number(ticket.price || 0),
          quantity: Number(ticket.quantity || 0),
          description: ticket.description || '',
          registration_category: categoryEntry?.id || ticket.registrationCategoryId || null,
          sort_order: index,
        };

        if (ticket.id) {
          ticketRequests.push(api.patch(`/api/events/${slug}/tickets/${ticket.id}/`, payload));
          return;
        }

        ticketRequests.push(api.post(`/api/events/${slug}/tickets/create/`, payload));
      });

      managedTickets
        .filter((ticket) => !activeTicketIds.has(ticket.id))
        .forEach((ticket) => {
          ticketRequests.push(api.delete(`/api/events/${slug}/tickets/${ticket.id}/`));
        });

      const promoRequests = [];
      const activePromoIds = new Set(meaningfulPromos.map((promo) => promo.id).filter(Boolean));

      meaningfulPromos.forEach((promo) => {
        const payload = {
          code: String(promo.code || '').trim().toUpperCase().replace(/\s+/g, ''),
          discount_type: promo.discount_type || 'percent',
          discount_value: Number(promo.discount_value || 0),
          usage_limit: Number(promo.usage_limit || 0),
          expiry: new Date(promo.expiry).toISOString(),
          is_active: promo.is_active ?? true,
          minimum_order_amount: Number(promo.minimum_order_amount || 0),
          applicable_ticket_types: [],
        };

        if (promo.id) {
          promoRequests.push(api.patch(`/api/events/${slug}/promo-codes/${promo.id}/`, payload));
          return;
        }

        promoRequests.push(api.post(`/api/events/${slug}/promo-codes/`, payload));
      });

      promoCodesData
        .filter((promo) => !activePromoIds.has(promo.id))
        .forEach((promo) => {
          promoRequests.push(api.delete(`/api/events/${slug}/promo-codes/${promo.id}/`));
        });

      const liveSettingsRequest = api.patch(`/api/events/${slug}/live-settings/`, {
        refund_policy: mapRefundPolicy(formState.refundPolicy),
        custom_refund_policy: formState.refundPolicy === 'Custom' ? formState.customRefundPolicy : '',
        enable_waitlist: Boolean(formState.enableWaitlist),
        send_reminders: Boolean(formState.sendReminders),
      });

      const results = await Promise.allSettled([
        liveSettingsRequest,
        ...ticketRequests,
        ...promoRequests,
      ]);

      const failedRequest = results.find((result) => result.status === 'rejected');
      if (failedRequest?.status === 'rejected') {
        throw failedRequest.reason;
      }

      await refreshQueries();
      setIsDirty(false);
      toast.success('Ticket setup updated.');
    } catch (error) {
      const message = getTicketSetupErrorMessage(error);
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-[#0F172A] lg:text-lg">
              <Ticket className="h-5 w-5 text-[#02338D]" />
              Tickets, Registration and Checkout Setup
            </CardTitle>
            <p className="mt-1 text-sm text-gray-500">
              This quick edit now mirrors the original create-event ticket flow, including registration questions,
              refund policy, waitlist, reminders, and promo codes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleReset} disabled={!isDirty || isSaving || isLoading}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button className="bg-[#02338D] text-white hover:bg-[#022A78]" onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  Save Ticket Setup
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-[#E2E8F0] px-6 py-16 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading ticket setup...
            </div>
          ) : (
            <>
              {saveError && (
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                  {saveError}
                </div>
              )}
              <TicketsStep
                data={formState}
                onChange={handleChange}
                errors={{}}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketsTab;
