import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Calendar, Check, CheckCircle2, ChevronDown, Clock,
  DollarSign, Globe, Image, Info, Lock, MapPin, Mic, Plus,
  Trash2, Upload, Users, Award, Bell, Eye, Zap, Tag
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { fetchCategories } from '@/lib/eventsApi';
import eventQueryKeys from '@/lib/eventQueryKeys';
import { useQuery } from '@tanstack/react-query';

/* ─── Constants ───────────────────────────────────────────── */
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const TICKET_CLASSES = [
  { value: 'free',       label: 'Free',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'paid',       label: 'Standard',    color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'early_bird', label: 'Early Bird',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'vip',        label: 'VIP',         color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'donation',   label: 'Donation',    color: 'bg-rose-100 text-rose-700 border-rose-200' },
];

const STEP_COLORS = [
  { bg: 'bg-violet-600',  light: 'bg-violet-50',  ring: 'ring-violet-200',  text: 'text-violet-600',  border: 'border-violet-200' },
  { bg: 'bg-blue-600',    light: 'bg-blue-50',    ring: 'ring-blue-200',    text: 'text-blue-600',    border: 'border-blue-200' },
  { bg: 'bg-rose-500',    light: 'bg-rose-50',    ring: 'ring-rose-200',    text: 'text-rose-500',    border: 'border-rose-200' },
  { bg: 'bg-amber-500',   light: 'bg-amber-50',   ring: 'ring-amber-200',   text: 'text-amber-500',   border: 'border-amber-200' },
  { bg: 'bg-emerald-600', light: 'bg-emerald-50', ring: 'ring-emerald-200', text: 'text-emerald-600', border: 'border-emerald-200' },
];

const STEPS = [
  { id: 1, label: 'Details',  icon: Info,       desc: 'Core event information' },
  { id: 2, label: 'Tickets',  icon: Tag,        desc: 'Pricing & capacity' },
  { id: 3, label: 'Lineup',   icon: Mic,        desc: 'Speakers & sponsors' },
  { id: 4, label: 'Settings', icon: Zap,        desc: 'Privacy & notifications' },
  { id: 5, label: 'Review',   icon: Eye,        desc: 'Confirm & publish' },
];

function validateImage(file) {
  if (!file) return 'No file selected.';
  if (!file.type?.startsWith('image/')) return 'Only image files are allowed.';
  if (file.size > MAX_IMAGE_SIZE_BYTES) return 'Image must be smaller than 10 MB.';
  return null;
}

/* ─── Field Component ─────────────────────────────────────── */
function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/* ─── Input Components ─────────────────────────────────────── */
const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all';
const iconInputCls = `${inputCls} pl-10`;

function TextInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
      <input className={Icon ? iconInputCls : inputCls} {...props} />
    </div>
  );
}

function Textarea({ ...props }) {
  return <textarea className={`${inputCls} resize-none`} {...props} />;
}

/* ─── Section Header ───────────────────────────────────────── */
function SectionHeader({ step, title, subtitle }) {
  const c = STEP_COLORS[step - 1];
  return (
    <div className={`flex items-center gap-4 p-5 rounded-2xl ${c.light} border ${c.border}`}>
      <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white text-base font-bold">{step}</span>
      </div>
      <div>
        <h3 className={`font-bold text-base ${c.text}`}>{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

/* ─── Ticket Type Card ─────────────────────────────────────── */
function TicketCard({ ticket, onChange, onRemove, showRemove }) {
  const cls = TICKET_CLASSES.find(c => c.value === ticket.ticketClass) || TICKET_CLASSES[1];
  const isFree = ticket.ticketClass === 'free';

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Colored top bar */}
      <div className={`h-1.5 ${cls.color.split(' ')[0].replace('bg-', 'bg-')}`}
        style={{ background: {
          free: '#10b981', paid: '#3b82f6', early_bird: '#f59e0b', vip: '#8b5cf6', donation: '#f43f5e'
        }[ticket.ticketClass] }} />

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          {/* Ticket class selector */}
          <div className="flex flex-wrap gap-1.5">
            {TICKET_CLASSES.map(tc => (
              <button
                key={tc.value}
                type="button"
                onClick={() => {
                  onChange('ticketClass', tc.value);
                  if (tc.value === 'free') onChange('price', 0);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                  ticket.ticketClass === tc.value
                    ? `${tc.color} ring-2 ring-offset-1`
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tc.label}
              </button>
            ))}
          </div>
          {showRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Ticket Name" required>
            <TextInput
              placeholder="e.g. VIP Access"
              value={ticket.name}
              onChange={e => onChange('name', e.target.value)}
            />
          </Field>
          <Field label="Price (KES)">
            <TextInput
              icon={DollarSign}
              type="number"
              min="0"
              placeholder="0"
              value={isFree ? '' : ticket.price}
              disabled={isFree}
              onChange={e => onChange('price', parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Quantity" required>
            <TextInput
              icon={Users}
              type="number"
              min="1"
              placeholder="e.g. 100"
              value={ticket.quantity || ''}
              onChange={e => onChange('quantity', parseInt(e.target.value, 10) || 0)}
            />
          </Field>
        </div>

        <Field label="Description (optional)">
          <TextInput
            placeholder="What's included? Any entry requirements?"
            value={ticket.description || ''}
            onChange={e => onChange('description', e.target.value)}
          />
        </Field>

        {/* Summary pill */}
        <div className="flex items-center gap-2 pt-1">
          <Badge className={`text-xs ${cls.color}`}>
            {cls.label}
          </Badge>
          <span className="text-xs text-slate-400">
            {isFree ? 'Free entry' : `KES ${Number(ticket.price || 0).toLocaleString()}`}
            {ticket.quantity ? ` · ${ticket.quantity} tickets` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Toggle Row ───────────────────────────────────────────── */
function ToggleRow({ icon: Icon, iconBg, title, desc, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
const OrganizerCreateEvent = ({ onBack, onCreated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const stepRefs = useRef([]);

  const [eventData, setEventData] = useState({
    name: '', description: '', category: '',
    date: '', time: '', endDate: '', endTime: '',
    location: '', address: '', city: 'Nairobi', country: 'Kenya',
    format: 'in_person',
    isPublic: true, enableWaitlist: true, sendReminders: true,
    themeColor: '#1E4DB7', accentColor: '#7C3AED',
  });

  const [ticketTypes, setTicketTypes] = useState([
    { id: '1', name: 'General Admission', ticketClass: 'paid', price: 0, quantity: 100, description: '' },
  ]);

  const [speakers, setSpeakers] = useState([{ id: '1', name: '', title: '', org: '' }]);
  const [sponsors, setSponsors] = useState([{ id: '1', name: '', website: '', tier: 'partner' }]);

  const { data: categoriesData = [] } = useQuery({
    queryKey: eventQueryKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Scroll tracking to highlight active step
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = stepRefs.current.indexOf(e.target);
            if (idx !== -1) setActiveStep(idx + 1);
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    stepRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const upd = (field, value) => setEventData(p => ({ ...p, [field]: value }));

  // Ticket helpers
  const addTicket = () => setTicketTypes(p => [...p, { id: Date.now().toString(), name: '', ticketClass: 'paid', price: 0, quantity: 0, description: '' }]);
  const updTicket = (id, f, v) => setTicketTypes(p => p.map(t => t.id === id ? { ...t, [f]: v } : t));
  const rmTicket = id => setTicketTypes(p => p.filter(t => t.id !== id));

  // Speaker helpers
  const addSpeaker = () => setSpeakers(p => [...p, { id: Date.now().toString(), name: '', title: '', org: '' }]);
  const updSpeaker = (id, f, v) => setSpeakers(p => p.map(s => s.id === id ? { ...s, [f]: v } : s));
  const rmSpeaker = id => setSpeakers(p => p.filter(s => s.id !== id));

  // Sponsor helpers
  const addSponsor = () => setSponsors(p => [...p, { id: Date.now().toString(), name: '', website: '', tier: 'partner' }]);
  const updSponsor = (id, f, v) => setSponsors(p => p.map(s => s.id === id ? { ...s, [f]: v } : s));
  const rmSponsor = id => setSponsors(p => p.filter(s => s.id !== id));

  // Cover image
  useEffect(() => () => { if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview); }, [coverPreview]);
  const handleCover = file => {
    const err = validateImage(file);
    if (err) { toast.error(err); return; }
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const scrollToStep = idx => {
    stepRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Validation summary for review
  const issues = [];
  if (!eventData.name) issues.push('Event name is required');
  if (!eventData.date) issues.push('Event date is required');
  if (!eventData.time) issues.push('Start time is required');
  if (!eventData.location) issues.push('Venue name is required');
  if (!eventData.category) issues.push('Category is required');
  if (ticketTypes.some(t => !t.name || !t.quantity)) issues.push('All ticket types need a name and quantity');

  const handleSubmit = async () => {
    if (issues.length) { toast.error(issues[0]); return; }
    setIsSubmitting(true);
    try {
      const payload = {
        title: eventData.name,
        description: eventData.description,
        category: eventData.category,
        event_type: eventData.isPublic ? 'public' : 'private',
        format: eventData.format,
        start_date: eventData.date,
        start_time: eventData.time,
        end_date: eventData.endDate || eventData.date,
        end_time: eventData.endTime || eventData.time,
        timezone: 'Africa/Nairobi',
        venue_name: eventData.location,
        venue_address: eventData.address || '',
        city: eventData.city || 'Nairobi',
        country: eventData.country || 'Kenya',
        refund_policy: 'no_refund',
        theme_color: eventData.themeColor,
        accent_color: eventData.accentColor,
        send_reminders: eventData.sendReminders,
        enable_waitlist: eventData.enableWaitlist,
      };

      let created;
      if (coverFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
        fd.append('cover_image', coverFile);
        created = await api.postForm('/api/events/create/', fd);
      } else {
        created = await api.post('/api/events/create/', payload);
      }

      if (ticketTypes.length && created?.slug) {
        await Promise.allSettled(
          ticketTypes.map(t =>
            api.post(`/api/events/${created.slug}/tickets/create/`, {
              name: t.name,
              ticket_class: t.ticketClass,
              price: t.ticketClass === 'free' ? 0 : Number(t.price || 0),
              quantity: Number(t.quantity || 0),
              description: t.description || '',
            }).catch(() => null)
          )
        );
      }

      if (speakers.some(s => s.name.trim()) && created?.slug) {
        await Promise.allSettled(
          speakers.filter(s => s.name.trim()).map(s =>
            api.post(`/api/events/${created.slug}/speakers/`, {
              name: s.name, title: s.title, organization: s.org || '',
              bio: '', twitter: '', linkedin: '', is_mc: false, sort_order: 0,
            }).catch(() => null)
          )
        );
      }

      if (sponsors.some(s => s.name.trim()) && created?.slug) {
        await Promise.allSettled(
          sponsors.filter(s => s.name.trim()).map(s =>
            api.post(`/api/events/${created.slug}/sponsors/`, {
              name: s.name, website: s.website, tier: s.tier || 'partner', sort_order: 0,
            }).catch(() => null)
          )
        );
      }

      toast.success('Event submitted for review! You\'ll be notified once it goes live.', { duration: 6000 });
      if (onCreated) onCreated(created);
    } catch (err) {
      toast.error(err?.message || 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCapacity = ticketTypes.reduce((s, t) => s + (Number(t.quantity) || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-blue-50/30">
      {/* ── Sticky Top Bar ── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </button>

          <div className="text-center flex-1">
            <h1 className="text-base font-bold text-slate-900">Create New Event</h1>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || issues.length > 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {isSubmitting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing…</>
            ) : (
              <><Check className="w-4 h-4" /> Submit Event</>
            )}
          </button>
        </div>

        {/* Step pills */}
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {STEPS.map((s, i) => {
            const c = STEP_COLORS[i];
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollToStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? `${c.bg} text-white shadow-sm`
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {React.createElement(s.icon, { className: 'w-3 h-3' })}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">

        {/* ════ STEP 1 — Details ════ */}
        <section ref={el => stepRefs.current[0] = el} className="space-y-6 scroll-mt-36">
          <SectionHeader step={1} title="Event Details" subtitle="Tell us what your event is about" />

          {/* Cover image */}
          <div
            className="relative overflow-hidden rounded-2xl border-2 border-dashed border-violet-200 hover:border-violet-400 transition-colors cursor-pointer group"
            onClick={() => document.getElementById('cover-upload').click()}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={e => { e.preventDefault(); handleCover(e.dataTransfer.files?.[0]); }}
          >
            <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={e => handleCover(e.target.files?.[0])} />
            {coverPreview ? (
              <div className="relative">
                <img src={coverPreview} alt="Cover" className="w-full h-52 sm:h-64 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/90 rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Upload className="w-4 h-4" /> Change Image
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-52 sm:h-64 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet-50 to-blue-50">
                <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image className="w-7 h-7 text-violet-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-700">Upload Cover Image</p>
                  <p className="text-xs text-slate-400 mt-1">Drag & drop or click · JPG, PNG, WebP · Max 10MB</p>
                  <p className="text-xs text-slate-400">Recommended: 1200 × 600px</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Event Name" required>
                <TextInput placeholder="e.g. Nairobi Tech Summit 2026" value={eventData.name} onChange={e => upd('name', e.target.value)} />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Description" hint="Describe your event, agenda, and what attendees can expect.">
                <Textarea
                  placeholder="Share what makes your event special…"
                  rows={5}
                  value={eventData.description}
                  onChange={e => upd('description', e.target.value)}
                />
              </Field>
            </div>

            <Field label="Category" required>
              <div className="relative">
                <select
                  className={`${inputCls} pr-10 appearance-none`}
                  value={eventData.category}
                  onChange={e => upd('category', e.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </Field>

            <Field label="Format" required>
              <div className="relative">
                <select
                  className={`${inputCls} pr-10 appearance-none`}
                  value={eventData.format}
                  onChange={e => upd('format', e.target.value)}
                >
                  <option value="in_person">In-Person</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </Field>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Start Date" required>
              <TextInput icon={Calendar} type="date" value={eventData.date} onChange={e => upd('date', e.target.value)} />
            </Field>
            <Field label="Start Time" required>
              <TextInput icon={Clock} type="time" value={eventData.time} onChange={e => upd('time', e.target.value)} />
            </Field>
            <Field label="End Date">
              <TextInput icon={Calendar} type="date" value={eventData.endDate} onChange={e => upd('endDate', e.target.value)} />
            </Field>
            <Field label="End Time">
              <TextInput icon={Clock} type="time" value={eventData.endTime} onChange={e => upd('endTime', e.target.value)} />
            </Field>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Venue Name" required>
                <TextInput icon={MapPin} placeholder="e.g. Kenyatta International Convention Centre" value={eventData.location} onChange={e => upd('location', e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Address">
                <TextInput icon={MapPin} placeholder="Street address, area" value={eventData.address} onChange={e => upd('address', e.target.value)} />
              </Field>
            </div>
            <Field label="City">
              <TextInput placeholder="Nairobi" value={eventData.city} onChange={e => upd('city', e.target.value)} />
            </Field>
            <Field label="Country">
              <TextInput icon={Globe} placeholder="Kenya" value={eventData.country} onChange={e => upd('country', e.target.value)} />
            </Field>
          </div>

          {/* Branding */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Theme Colour" hint="Primary brand colour">
              <div className="flex items-center gap-3">
                <input type="color" value={eventData.themeColor} onChange={e => upd('themeColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1" />
                <input type="text" maxLength={7} value={eventData.themeColor} onChange={e => upd('themeColor', e.target.value)}
                  className={`${inputCls} flex-1 font-mono`} placeholder="#1E4DB7" />
              </div>
            </Field>
            <Field label="Accent Colour" hint="Secondary highlight colour">
              <div className="flex items-center gap-3">
                <input type="color" value={eventData.accentColor} onChange={e => upd('accentColor', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1" />
                <input type="text" maxLength={7} value={eventData.accentColor} onChange={e => upd('accentColor', e.target.value)}
                  className={`${inputCls} flex-1 font-mono`} placeholder="#7C3AED" />
              </div>
            </Field>
          </div>
        </section>

        {/* ════ STEP 2 — Tickets ════ */}
        <section ref={el => stepRefs.current[1] = el} className="space-y-5 scroll-mt-36">
          <SectionHeader step={2} title="Ticket Types" subtitle="Set pricing, capacity, and ticket categories" />

          <div className="space-y-4">
            {ticketTypes.map(ticket => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                showRemove={ticketTypes.length > 1}
                onChange={(f, v) => updTicket(ticket.id, f, v)}
                onRemove={() => rmTicket(ticket.id)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addTicket}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-200 text-blue-600 font-semibold text-sm hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Another Ticket Type
          </button>

          {/* Capacity bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">Total Capacity</span>
            </div>
            <span className="text-2xl font-bold">{totalCapacity.toLocaleString()}<span className="text-sm font-medium opacity-80 ml-1">guests</span></span>
          </div>
        </section>

        {/* ════ STEP 3 — Lineup ════ */}
        <section ref={el => stepRefs.current[2] = el} className="space-y-6 scroll-mt-36">
          <SectionHeader step={3} title="Speakers & Sponsors" subtitle="Optional — add your lineup and partners" />

          {/* Speakers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Mic className="w-4 h-4 text-rose-500" /> Speakers / Artists</p>
              <button type="button" onClick={addSpeaker}
                className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold hover:text-rose-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {speakers.map((sp, idx) => (
              <div key={sp.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Speaker #{idx + 1}</span>
                  {speakers.length > 1 && (
                    <button type="button" onClick={() => rmSpeaker(sp.id)}
                      className="p-1 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Full Name">
                    <TextInput placeholder="e.g. Jane Muthoni" value={sp.name} onChange={e => updSpeaker(sp.id, 'name', e.target.value)} />
                  </Field>
                  <Field label="Title / Role">
                    <TextInput placeholder="e.g. CEO, Keynote Speaker" value={sp.title} onChange={e => updSpeaker(sp.id, 'title', e.target.value)} />
                  </Field>
                  <Field label="Organisation">
                    <TextInput placeholder="e.g. Safaricom" value={sp.org} onChange={e => updSpeaker(sp.id, 'org', e.target.value)} />
                  </Field>
                </div>
              </div>
            ))}
          </div>

          {/* Sponsors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Sponsors</p>
              <button type="button" onClick={addSponsor}
                className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold hover:text-amber-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {sponsors.map((sp, idx) => (
              <div key={sp.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sponsor #{idx + 1}</span>
                  {sponsors.length > 1 && (
                    <button type="button" onClick={() => rmSponsor(sp.id)}
                      className="p-1 text-slate-300 hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Sponsor Name">
                    <TextInput placeholder="e.g. Google Kenya" value={sp.name} onChange={e => updSponsor(sp.id, 'name', e.target.value)} />
                  </Field>
                  <Field label="Website">
                    <TextInput placeholder="https://google.com" value={sp.website} onChange={e => updSponsor(sp.id, 'website', e.target.value)} />
                  </Field>
                  <Field label="Tier">
                    <div className="relative">
                      <select className={`${inputCls} pr-10 appearance-none`} value={sp.tier} onChange={e => updSponsor(sp.id, 'tier', e.target.value)}>
                        <option value="platinum">Platinum</option>
                        <option value="gold">Gold</option>
                        <option value="silver">Silver</option>
                        <option value="partner">Partner</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ════ STEP 4 — Settings ════ */}
        <section ref={el => stepRefs.current[3] = el} className="space-y-5 scroll-mt-36">
          <SectionHeader step={4} title="Event Settings" subtitle="Control privacy, waitlist, and notifications" />

          <ToggleRow
            icon={Globe} iconBg="bg-violet-500"
            title="Public Event"
            desc="Anyone can discover and register for this event"
            checked={eventData.isPublic}
            onCheckedChange={v => upd('isPublic', v)}
          />
          <ToggleRow
            icon={Users} iconBg="bg-blue-500"
            title="Enable Waitlist"
            desc="Let attendees join a waitlist when tickets sell out"
            checked={eventData.enableWaitlist}
            onCheckedChange={v => upd('enableWaitlist', v)}
          />
          <ToggleRow
            icon={Bell} iconBg="bg-amber-500"
            title="Send Reminder Emails"
            desc="Auto-send event reminders to registered attendees"
            checked={eventData.sendReminders}
            onCheckedChange={v => upd('sendReminders', v)}
          />
        </section>

        {/* ════ STEP 5 — Review ════ */}
        <section ref={el => stepRefs.current[4] = el} className="space-y-5 scroll-mt-36">
          <SectionHeader step={5} title="Review & Submit" subtitle="Double-check everything before going live" />

          {issues.length > 0 && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 space-y-1.5">
              <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                <Info className="w-4 h-4" /> Please fix these before submitting:
              </p>
              {issues.map((iss, i) => (
                <p key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /> {iss}
                </p>
              ))}
            </div>
          )}

          {/* Preview card */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            <div
              className="h-32 relative"
              style={{ background: `linear-gradient(135deg, ${eventData.themeColor}, ${eventData.accentColor})` }}
            >
              {coverPreview && <img src={coverPreview} alt="Cover" className="w-full h-full object-cover opacity-70" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <h2 className="text-white text-lg font-bold leading-tight line-clamp-1">{eventData.name || 'Untitled Event'}</h2>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  { icon: Calendar, label: 'Date', val: eventData.date || '—' },
                  { icon: Clock, label: 'Time', val: eventData.time || '—' },
                  { icon: MapPin, label: 'Venue', val: eventData.location || '—' },
                  { icon: Users, label: 'Capacity', val: `${totalCapacity.toLocaleString()} guests` },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="font-semibold text-slate-800 text-sm truncate mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tickets</p>
                <div className="space-y-2">
                  {ticketTypes.map(t => {
                    const cls = TICKET_CLASSES.find(c => c.value === t.ticketClass);
                    return (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${cls?.color}`}>{cls?.label}</Badge>
                          <span className="text-sm text-slate-700">{t.name || '(unnamed)'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-400">{t.quantity || 0} tickets</span>
                          <span className="font-bold text-slate-800">{t.ticketClass === 'free' ? 'Free' : `KES ${Number(t.price || 0).toLocaleString()}`}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[
                  { label: eventData.isPublic ? 'Public' : 'Private', icon: eventData.isPublic ? Globe : Lock, ok: eventData.isPublic },
                  { label: eventData.enableWaitlist ? 'Waitlist On' : 'No Waitlist', icon: Users, ok: eventData.enableWaitlist },
                  { label: eventData.sendReminders ? 'Reminders On' : 'No Reminders', icon: Bell, ok: eventData.sendReminders },
                ].map(({ label, icon: Icon, ok }) => (
                  <span key={label} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-3 h-3" /> {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || issues.length > 0}
            className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
          >
            {isSubmitting ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing Your Event…</>
            ) : (
              <><CheckCircle2 className="w-5 h-5" /> Submit Event for Review</>
            )}
          </button>

          <p className="text-center text-xs text-slate-400">
            Your event will be reviewed and go live once approved. You'll receive a notification.
          </p>
        </section>

        {/* Bottom padding */}
        <div className="h-16" />
      </div>
    </div>
  );
};

export default OrganizerCreateEvent;
