import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Upload, Bold, Italic, List, Link, ImagePlus, Clock, Trash2, Palette, ChevronUp, ChevronDown } from 'lucide-react';
import CustomInput from '../ui/CustomInput';
import CustomButton from '../ui/CustomButton';
import { api } from '../../lib/apiClient';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const validateImageFile = (file) => {
  if (!file) return { ok: false, error: 'No file selected.' };
  if (!file.type?.startsWith('image/')) {
    return { ok: false, error: 'Only image files are allowed.' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false, error: 'Image must be smaller than 10MB.' };
  }
  return { ok: true, error: '' };
};

const validateImageDimensions = (file, { minWidth, minHeight } = {}) =>
  new Promise((resolve) => {
    if (!minWidth && !minHeight) {
      resolve({ ok: true, error: '' });
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const widthOk = minWidth ? img.width >= minWidth : true;
      const heightOk = minHeight ? img.height >= minHeight : true;
      if (widthOk && heightOk) {
        resolve({ ok: true, error: '' });
      } else {
        resolve({ ok: false, error: `Image should be at least ${minWidth}x${minHeight}px.` });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ ok: false, error: 'Unable to read image dimensions.' });
    };
    img.src = objectUrl;
  });

// ── Shared Image Upload Helper ──────────────────────────────────────────────
const ImageUploader = ({ label, preview, onFile, size = 'md', hint }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (file) => {
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => onFile(file, reader.result);
    reader.readAsDataURL(file);
  };

  const sizeClasses = {
    sm: 'w-20 h-20 rounded-full',
    md: 'w-full h-40 rounded-xl',
    lg: 'w-full aspect-video rounded-xl',
  };

  return (
    <div>
      {label && <p className="text-sm font-medium text-[#0F172A] mb-2">{label}</p>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        className={`${sizeClasses[size]} relative cursor-pointer overflow-hidden border-2 border-dashed transition-all flex items-center justify-center ${isDragging ? 'border-[#02338D] bg-[#EFF6FF]' : 'border-[#E2E8F0] hover:border-[#02338D]/60 bg-[#F8FAFC]'}`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-xs font-medium">Click to change</p>
            </div>
          </>
        ) : (
          <div className="text-center p-3">
            <ImagePlus className="w-6 h-6 text-[#94A3B8] mx-auto mb-1" />
            {hint && <p className="text-xs text-[#94A3B8]">{hint}</p>}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    </div>
  );
};

// ── Step 1: Basic Info ──────────────────────────────────────────────────────
export const BasicInfoStep = ({ data, onChange, errors, categories = [] }) => (
  <div className="space-y-6">
    <CustomInput
      label="Event Title"
      value={data.title}
      onChange={(e) => onChange('title', e.target.value)}
      error={errors.title}
      placeholder="Give your event a catchy title"
      required
    />

    <div>
      <label className="block text-sm font-medium text-[#0F172A] mb-2">Category</label>
      <select
        value={data.category}
        onChange={(e) => onChange('category', e.target.value)}
        className={`w-full px-4 py-2.5 bg-white border rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#02338D] ${errors.category ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}`}
      >
        <option value="">Select a category</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>
      {errors.category && <p className="mt-1.5 text-sm text-[#DC2626]">{errors.category}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-[#0F172A] mb-2">Tags</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {data.tags.map((tag, index) => (
          <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-[#EFF6FF] text-[#02338D] rounded-full text-sm">
            {tag}
            <button onClick={() => onChange('tags', data.tags.filter((_, i) => i !== index))} className="hover:text-[#DC2626]">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Type a tag and press Enter"
        className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D]"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const value = e.target.value.trim();
            if (value && !data.tags.includes(value)) {
              onChange('tags', [...data.tags, value]);
              e.target.value = '';
            }
          }
        }}
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-2">Event Type</label>
        <div className="flex gap-2">
          {['Public', 'Private'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange('eventType', type.toLowerCase())}
              className={`flex-1 py-2 px-4 rounded-lg border font-medium text-sm ${data.eventType === type.toLowerCase() ? 'border-[#02338D] bg-[#EFF6FF] text-[#02338D]' : 'border-[#E2E8F0] text-[#64748B] hover:border-[#02338D]/50'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-2">Format</label>
        <select
          value={data.format}
          onChange={(e) => onChange('format', e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D]"
        >
          <option value="In-Person">In-Person</option>
          <option value="Online">Online</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>
    </div>

    {/* Brand Colors */}
    <div className="p-5 bg-gradient-to-r from-[#F8FAFC] to-[#EFF6FF] rounded-xl border border-[#E2E8F0]">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4 text-[#02338D]" />
        <h3 className="text-sm font-semibold text-[#0F172A]">Event Branding Colors</h3>
        <span className="ml-auto text-xs text-[#64748B]">Customize your event page</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#64748B] mb-2">Theme Color (primary)</label>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="color"
                value={data.themeColor || '#02338D'}
                onChange={(e) => onChange('themeColor', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border border-[#E2E8F0] p-0.5"
              />
            </div>
            <input
              type="text"
              value={data.themeColor || '#02338D'}
              onChange={(e) => onChange('themeColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#02338D]"
              placeholder="#02338D"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#64748B] mb-2">Accent Color (secondary)</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={data.accentColor || '#7C3AED'}
              onChange={(e) => onChange('accentColor', e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border border-[#E2E8F0] p-0.5"
            />
            <input
              type="text"
              value={data.accentColor || '#7C3AED'}
              onChange={(e) => onChange('accentColor', e.target.value)}
              className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#02338D]"
              placeholder="#7C3AED"
            />
          </div>
        </div>
      </div>
      {/* Color Preview */}
      <div
        className="mt-4 h-10 rounded-lg w-full"
        style={{ background: `linear-gradient(90deg, ${data.themeColor || '#02338D'}, ${data.accentColor || '#7C3AED'})` }}
      />
    </div>
  </div>
);

// ── Step 2: Date, Time & Location ──────────────────────────────────────────
export const DateLocationStep = ({ data, onChange, errors }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <CustomInput label="Start Date" type="date" value={data.startDate} onChange={(e) => onChange('startDate', e.target.value)} error={errors.startDate} required />
      <CustomInput label="Start Time" type="time" value={data.startTime} onChange={(e) => onChange('startTime', e.target.value)} error={errors.startTime} required />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <CustomInput label="End Date" type="date" value={data.endDate} onChange={(e) => onChange('endDate', e.target.value)} error={errors.endDate} required />
      <CustomInput label="End Time" type="time" value={data.endTime} onChange={(e) => onChange('endTime', e.target.value)} error={errors.endTime} required />
    </div>

    <div>
      <label className="block text-sm font-medium text-[#0F172A] mb-2">Timezone</label>
      <select
        value={data.timezone}
        onChange={(e) => onChange('timezone', e.target.value)}
        className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D]"
      >
        <option value="EAT">East Africa Time (EAT)</option>
        <option value="GMT">Greenwich Mean Time (GMT)</option>
        <option value="WAT">West Africa Time (WAT)</option>
        <option value="SAST">South Africa Standard Time (SAST)</option>
      </select>
    </div>

    {(data.format === 'In-Person' || data.format === 'Hybrid') && (
      <div className="space-y-4">
        <CustomInput label="Venue Name" value={data.venueName} onChange={(e) => onChange('venueName', e.target.value)} error={errors.venueName} placeholder="e.g., Sarit Centre" />
        <CustomInput label="Address" value={data.address} onChange={(e) => onChange('address', e.target.value)} error={errors.address} placeholder="Street address" />
        <div className="grid grid-cols-2 gap-4">
          <CustomInput label="City" value={data.city} onChange={(e) => onChange('city', e.target.value)} error={errors.city} placeholder="e.g., Nairobi (Madaraka)" />
          <CustomInput label="Country" value={data.country} onChange={(e) => onChange('country', e.target.value)} error={errors.country} placeholder="e.g., Kenya" />
        </div>
      </div>
    )}

    {(data.format === 'Online' || data.format === 'Hybrid') && (
      <CustomInput label="Streaming Link" value={data.streamingLink} onChange={(e) => onChange('streamingLink', e.target.value)} error={errors.streamingLink} placeholder="e.g., Zoom or YouTube link" />
    )}
  </div>
);

// ── Step 3: Description & Media ────────────────────────────────────────────
export const DescriptionStep = ({ data, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [coverError, setCoverError] = useState('');

  const handleFile = async (file) => {
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setCoverError(validation.error);
      return;
    }
    const dimensionCheck = await validateImageDimensions(file, { minWidth: 1200, minHeight: 630 });
    if (!dimensionCheck.ok) {
      setCoverError(dimensionCheck.error);
      return;
    }
    setCoverError('');
    const reader = new FileReader();
    reader.onloadend = () => onChange('coverImagePreview', reader.result);
    reader.readAsDataURL(file);
    onChange('coverImage', file);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-2">Description</label>
        <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="flex items-center gap-1 p-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <button type="button" className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#64748B]"><Bold className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#64748B]"><Italic className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#64748B]"><List className="w-4 h-4" /></button>
            <button type="button" className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#64748B]"><Link className="w-4 h-4" /></button>
          </div>
          <textarea
            value={data.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Describe your event in detail..."
            rows={8}
            className="w-full px-4 py-3 resize-none focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#0F172A] mb-2">Cover Image</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl overflow-hidden text-center cursor-pointer transition-all ${isDragging ? 'border-[#02338D] bg-[#EFF6FF]' : 'border-[#E2E8F0] hover:border-[#02338D]/50'} ${data.coverImagePreview ? 'aspect-video' : 'p-8'}`}
        >
          {data.coverImagePreview ? (
            <>
              <img src={data.coverImagePreview} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-medium">Click to change</span>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 mx-auto text-[#64748B] mb-3" />
              <p className="text-sm text-[#64748B] mb-2">Drag and drop an image here, or <span className="text-[#02338D] hover:underline">browse</span></p>
              <p className="text-xs text-[#94A3B8]">Recommended: 1200x630px, JPG or PNG</p>
            </>
          )}
          <input type="file" ref={fileInputRef} onChange={(e) => handleFile(e.target.files?.[0])} accept="image/*" className="hidden" />
        </div>
        {coverError && <p className="mt-2 text-xs text-[#DC2626]">{coverError}</p>}
      </div>
    </div>
  );
};

// ── Step 4: Speakers & MC ──────────────────────────────────────────────────
export const SpeakersStep = ({ data, onChange }) => {
  const addSpeaker = () => onChange('speakers', [...data.speakers, { name: '', title: '', organization: '', bio: '', photo: null, photoPreview: '' }]);
  const removeSpeaker = (i) => onChange('speakers', data.speakers.filter((_, idx) => idx !== i));
  const updateSpeaker = (i, field, value) => {
    const arr = [...data.speakers];
    arr[i] = { ...arr[i], [field]: value };
    onChange('speakers', arr);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#64748B]">(Optional) Add speakers for your event</p>

      <AnimatePresence>
        {data.speakers.map((speaker, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-[#0F172A]">Speaker {index + 1}</h4>
              <button type="button" onClick={() => removeSpeaker(index)} className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start gap-4">
              {/* Photo Upload */}
              <ImageUploader
                size="sm"
                hint="Photo"
                preview={speaker.photoPreview}
                onFile={(file, preview) => {
                  updateSpeaker(index, 'photo', file);
                  updateSpeaker(index, 'photoPreview', preview);
                }}
              />
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input type="text" placeholder="Full Name *" value={speaker.name} onChange={(e) => updateSpeaker(index, 'name', e.target.value)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
                <input type="text" placeholder="Title / Role" value={speaker.title} onChange={(e) => updateSpeaker(index, 'title', e.target.value)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
                <input type="text" placeholder="Organization" value={speaker.organization} onChange={(e) => updateSpeaker(index, 'organization', e.target.value)}
                  className="col-span-2 px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
              </div>
            </div>

            <textarea placeholder="Short bio..." value={speaker.bio} onChange={(e) => updateSpeaker(index, 'bio', e.target.value)} rows={3}
              className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] resize-none text-sm" />
          </motion.div>
        ))}
      </AnimatePresence>

      <CustomButton type="button" variant="outline" onClick={addSpeaker} leftIcon={Plus} fullWidth>
        Add Speaker
      </CustomButton>

      {/* MC Section */}
      <div className="pt-6 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" id="hasMC" checked={data.hasMC} onChange={(e) => onChange('hasMC', e.target.checked)} className="w-4 h-4 rounded border-[#E2E8F0] text-[#02338D] focus:ring-[#02338D]" />
          <label htmlFor="hasMC" className="text-sm font-semibold text-[#0F172A]">Add an MC / Host</label>
        </div>

        {data.hasMC && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-4"
          >
            <div className="flex items-start gap-4">
              <ImageUploader
                size="sm"
                hint="MC Photo"
                preview={data.mcPhotoPreview}
                onFile={(file, preview) => { onChange('mcPhoto', file); onChange('mcPhotoPreview', preview); }}
              />
              <div className="flex-1 space-y-3">
                <input type="text" placeholder="MC / Host Name *" value={data.mcName} onChange={(e) => onChange('mcName', e.target.value)}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
                <textarea placeholder="MC Bio / Introduction" value={data.mcBio} onChange={(e) => onChange('mcBio', e.target.value)} rows={3}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] resize-none text-sm" />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ── Step 5: Schedule ────────────────────────────────────────────────────────
export const ScheduleStep = ({ data, onChange }) => {
  const addItem = () => onChange('schedule', [...data.schedule, { time: '', title: '', description: '', speaker: '' }]);
  const removeItem = (i) => onChange('schedule', data.schedule.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const arr = [...data.schedule];
    arr[i] = { ...arr[i], [field]: value };
    onChange('schedule', arr);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#64748B]">(Optional) Build the agenda / schedule for your event</p>

      <AnimatePresence>
        {data.schedule.map((item, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#02338D] text-white flex items-center justify-center text-xs font-bold">{index + 1}</div>
                <h4 className="font-semibold text-[#0F172A]">Schedule Item</h4>
              </div>
              <button type="button" onClick={() => removeItem(index)} className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input type="time" value={item.time} onChange={(e) => updateItem(index, 'time', e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
              </div>
              <input type="text" placeholder="Session Title *" value={item.title} onChange={(e) => updateItem(index, 'title', e.target.value)}
                className="px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
            </div>
            <input type="text" placeholder="Speaker / Presenter (optional)" value={item.speaker} onChange={(e) => updateItem(index, 'speaker', e.target.value)}
              className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
            <textarea placeholder="Session description..." value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} rows={2}
              className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] resize-none text-sm" />
          </motion.div>
        ))}
      </AnimatePresence>

      <CustomButton type="button" variant="outline" onClick={addItem} leftIcon={Plus} fullWidth>
        Add Schedule Item
      </CustomButton>
    </div>
  );
};

// ── Step 6: Sponsors ───────────────────────────────────────────────────────
export const SponsorsStep = ({ data, onChange }) => {
  const addSponsor = () => onChange('sponsors', [...data.sponsors, { name: '', website: '', tier: 'Bronze', logo: null, logoPreview: '' }]);
  const removeSponsor = (i) => onChange('sponsors', data.sponsors.filter((_, idx) => idx !== i));
  const updateSponsor = (i, field, value) => {
    const arr = [...data.sponsors];
    arr[i] = { ...arr[i], [field]: value };
    onChange('sponsors', arr);
  };

  const tierColors = { Platinum: '#E5E7EB', Gold: '#FCD34D', Silver: '#9CA3AF', Bronze: '#CD7F32', Partner: '#02338D' };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#64748B]">(Optional) Add sponsors for your event</p>

      <AnimatePresence>
        {data.sponsors.map((sponsor, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tierColors[sponsor.tier] || '#ccc' }} />
                <h4 className="font-semibold text-[#0F172A]">Sponsor {index + 1}</h4>
              </div>
              <button type="button" onClick={() => removeSponsor(index)} className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start gap-4">
              {/* Logo Upload */}
              <ImageUploader size="sm" hint="Logo" preview={sponsor.logoPreview}
                onFile={(file, preview) => { updateSponsor(index, 'logo', file); updateSponsor(index, 'logoPreview', preview); }}
              />
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input type="text" placeholder="Sponsor Name *" value={sponsor.name} onChange={(e) => updateSponsor(index, 'name', e.target.value)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
                <select value={sponsor.tier} onChange={(e) => updateSponsor(index, 'tier', e.target.value)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm"
                >
                  {Object.keys(tierColors).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="url" placeholder="Website URL" value={sponsor.website} onChange={(e) => updateSponsor(index, 'website', e.target.value)}
                  className="col-span-2 px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <CustomButton type="button" variant="outline" onClick={addSponsor} leftIcon={Plus} fullWidth>
        Add Sponsor
      </CustomButton>
    </div>
  );
};

// ── Step 7: Tickets ────────────────────────────────────────────────────────
export const TicketsStep = ({ data, onChange, errors }) => {
  const [uploadStatus, setUploadStatus] = useState({ school: '', course: '', error: '' });
  const categories = Array.isArray(data.registrationCategories) ? data.registrationCategories : [];
  const enabledCategories = categories.filter((c) => c.is_active);
  const defaultCategoryType = enabledCategories[0]?.category || categories[0]?.category || 'guest';

  const updateCategories = (next) => onChange('registrationCategories', next);
  const updateCategory = (index, field, value) => {
    const next = [...categories];
    const current = next[index] || {};
    const updated = { ...current, [field]: value };

    if (current.category === 'student') {
      updated.label = 'Student';
      updated.require_student_email = true;
      updated.require_admission_number = true;
    } else if (current.category === 'alumni') {
      updated.label = 'Alumni';
    }

    next[index] = updated;
    updateCategories(next);
  };
  const moveCategory = (index, direction) => {
    const next = [...categories];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= next.length) return;
    const temp = next[index];
    next[index] = next[newIndex];
    next[newIndex] = temp;
    updateCategories(next);
  };
  const addQuestion = (catIndex) => {
    const next = [...categories];
    const questions = Array.isArray(next[catIndex].questions) ? next[catIndex].questions : [];
    questions.push({ label: '', field_type: 'text', is_required: false, options: [] });
    next[catIndex] = { ...next[catIndex], questions };
    updateCategories(next);
  };
  const updateQuestion = (catIndex, qIndex, field, value) => {
    const next = [...categories];
    const questions = Array.isArray(next[catIndex].questions) ? [...next[catIndex].questions] : [];
    questions[qIndex] = { ...questions[qIndex], [field]: value };
    next[catIndex] = { ...next[catIndex], questions };
    updateCategories(next);
  };
  const removeQuestion = (catIndex, qIndex) => {
    const next = [...categories];
    const questions = Array.isArray(next[catIndex].questions) ? next[catIndex].questions.filter((_, idx) => idx !== qIndex) : [];
    next[catIndex] = { ...next[catIndex], questions };
    updateCategories(next);
  };

  const addTicket = () => onChange('tickets', [...data.tickets, { type: 'Standard', price: 0, quantity: 100, description: '', category: defaultCategoryType }]);
  const removeTicket = (i) => { if (data.tickets.length === 1) return; onChange('tickets', data.tickets.filter((_, idx) => idx !== i)); };
  const updateTicket = (i, field, value) => {
    const arr = [...data.tickets];
    arr[i] = { ...arr[i], [field]: value };
    onChange('tickets', arr);
  };

  const typeIcons = { Standard: '🎟', VIP: '⭐', 'Early Bird': '🐦', Free: '🎁', Donation: '❤️' };

  const handleUpload = async (kind, file) => {
    if (!file) return;
    setUploadStatus({ school: '', course: '', error: '' });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const endpoint = kind === 'school' ? '/api/academics/schools/upload/' : '/api/academics/courses/upload/';
      await api.postForm(endpoint, fd);
      setUploadStatus((prev) => ({ ...prev, [kind]: 'Upload successful.' }));
    } catch (err) {
      setUploadStatus((prev) => ({ ...prev, error: err?.message || 'Upload failed.' }));
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#64748B]">Add at least one ticket type for your event</p>
      {errors.tickets && <p className="text-sm text-[#DC2626]">{errors.tickets}</p>}

      {/* Registration Categories */}
      <div className="p-5 bg-white rounded-2xl border border-[#E2E8F0] space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Registration Categories</h3>
          <p className="text-xs text-[#64748B]">Enable who this event is for and define their questions.</p>
        </div>

        <div className="space-y-4">
          {categories.map((cat, index) => (
            <div key={cat.category} className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] capitalize">{cat.category}</p>
                  {cat.category === 'guest' && (
                    <input
                      type="text"
                      value={cat.label || ''}
                      onChange={(e) => updateCategory(index, 'label', e.target.value)}
                      placeholder="Guest label (e.g. Friend of Strathmore)"
                      className="mt-2 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm w-full"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => moveCategory(index, -1)} disabled={index === 0} className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] disabled:opacity-40">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1} className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] disabled:opacity-40">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <label className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                    <input
                      type="checkbox"
                      checked={Boolean(cat.is_active)}
                      onChange={(e) => updateCategory(index, 'is_active', e.target.checked)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
                    />
                    Enabled
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.category === 'student' && (
                  <>
                    <label className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                      <input
                        type="checkbox"
                        checked={Boolean(cat.require_student_email)}
                        onChange={(e) => updateCategory(index, 'require_student_email', e.target.checked)}
                        className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
                        disabled
                      />
                      Require student email (@strathmore.edu)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                      <input
                        type="checkbox"
                        checked={Boolean(cat.require_admission_number)}
                        onChange={(e) => updateCategory(index, 'require_admission_number', e.target.checked)}
                        className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
                        disabled
                      />
                      Require admission number
                    </label>
                  </>
                )}
                <label className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                  <input
                    type="checkbox"
                    checked={Boolean(cat.ask_graduation_year)}
                    onChange={(e) => updateCategory(index, 'ask_graduation_year', e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
                  />
                  Collect graduation year
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                  <input
                    type="checkbox"
                    checked={Boolean(cat.ask_school)}
                    onChange={(e) => updateCategory(index, 'ask_school', e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
                  />
                  Collect school
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                  <input
                    type="checkbox"
                    checked={Boolean(cat.ask_course)}
                    onChange={(e) => updateCategory(index, 'ask_course', e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
                  />
                  Collect course
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                  <input
                    type="checkbox"
                    checked={Boolean(cat.ask_location)}
                    onChange={(e) => updateCategory(index, 'ask_location', e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
                  />
                  Collect location
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#0F172A]">Custom Questions</p>
                  <button type="button" onClick={() => addQuestion(index)} className="text-xs text-[#02338D] hover:underline">
                    + Add Question
                  </button>
                </div>

                {(cat.questions || []).map((q, qIndex) => (
                  <div key={`${cat.category}-q-${qIndex}`} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Question text"
                      value={q.label}
                      onChange={(e) => updateQuestion(index, qIndex, 'label', e.target.value)}
                      className="sm:col-span-2 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm"
                    />
                    <select
                      value={q.field_type}
                      onChange={(e) => updateQuestion(index, qIndex, 'field_type', e.target.value)}
                      className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm"
                    >
                      {['text', 'number', 'dropdown', 'email', 'phone', 'date'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-[#64748B]">
                        <input
                          type="checkbox"
                          checked={Boolean(q.is_required)}
                          onChange={(e) => updateQuestion(index, qIndex, 'is_required', e.target.checked)}
                          className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
                        />
                        Required
                      </label>
                      <button type="button" onClick={() => removeQuestion(index, qIndex)} className="p-1.5 text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {q.field_type === 'dropdown' && (
                      <input
                        type="text"
                        placeholder="Options (comma separated)"
                        value={(q.options || []).join(', ')}
                        onChange={(e) => updateQuestion(index, qIndex, 'options', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}
                        className="sm:col-span-4 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Courses & Schools */}
      <div className="p-5 bg-white rounded-2xl border border-[#E2E8F0] space-y-3">
        <p className="text-sm font-semibold text-[#0F172A]">Courses & Schools Upload</p>
        <p className="text-xs text-[#64748B]">Upload Excel/CSV files to populate school and course dropdowns.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Schools file</label>
            <input type="file" accept=".csv,.xlsx" onChange={(e) => handleUpload('school', e.target.files?.[0])} />
            {uploadStatus.school && <p className="text-xs text-[#16A34A] mt-1">{uploadStatus.school}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Courses file</label>
            <input type="file" accept=".csv,.xlsx" onChange={(e) => handleUpload('course', e.target.files?.[0])} />
            {uploadStatus.course && <p className="text-xs text-[#16A34A] mt-1">{uploadStatus.course}</p>}
          </div>
        </div>
        {uploadStatus.error && <p className="text-xs text-[#DC2626]">{uploadStatus.error}</p>}
      </div>

      <AnimatePresence>
        {data.tickets.map((ticket, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{typeIcons[ticket.type] || '🎟'}</span>
                <h4 className="font-semibold text-[#0F172A]">{ticket.type || 'Ticket'} – Ticket {index + 1}</h4>
              </div>
              {data.tickets.length > 1 && (
                <button type="button" onClick={() => removeTicket(index)} className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Category</label>
                <select value={ticket.category || defaultCategoryType} onChange={(e) => updateTicket(index, 'category', e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category === 'guest' ? (c.label || 'Guest') : c.category.charAt(0).toUpperCase() + c.category.slice(1)}
                      {!c.is_active ? ' (Disabled)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Ticket Type</label>
                <select value={ticket.type} onChange={(e) => updateTicket(index, 'type', e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm"
                >
                  {['Standard', 'VIP', 'Early Bird', 'Free', 'Donation'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Price (KES)</label>
                <input type="number" placeholder="0" value={ticket.price} onChange={(e) => updateTicket(index, 'price', parseInt(e.target.value) || 0)}
                  disabled={ticket.type === 'Free'}
                  className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] disabled:bg-[#F1F5F9] text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Quantity Available</label>
              <input type="number" placeholder="100" value={ticket.quantity} onChange={(e) => updateTicket(index, 'quantity', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] text-sm" />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#64748B] mb-1">Ticket Description (optional)</label>
              <textarea placeholder="What's included, access level, perks..." value={ticket.description} onChange={(e) => updateTicket(index, 'description', e.target.value)} rows={2}
                className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] resize-none text-sm" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <CustomButton type="button" variant="outline" onClick={addTicket} leftIcon={Plus} fullWidth>
        Add Another Ticket Type
      </CustomButton>

      {/* Refund Policy */}
      <div className="pt-6 border-t border-[#E2E8F0]">
        <label className="block text-sm font-semibold text-[#0F172A] mb-3">Refund Policy</label>
        <div className="grid grid-cols-2 gap-2">
          {['No Refund', '48 Hours', '7 Days', 'Custom'].map((policy) => (
            <button
              key={policy}
              type="button"
              onClick={() => onChange('refundPolicy', policy)}
              className={`py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${data.refundPolicy === policy ? 'border-[#02338D] bg-[#EFF6FF] text-[#02338D]' : 'border-[#E2E8F0] text-[#64748B] hover:border-[#02338D]/50'}`}
            >
              {policy}
            </button>
          ))}
        </div>
        {data.refundPolicy === 'Custom' && (
          <textarea placeholder="Describe your custom refund policy..." rows={3}
            className="w-full mt-3 px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D] resize-none text-sm"
            value={data.customRefundPolicy || ''}
            onChange={(e) => onChange('customRefundPolicy', e.target.value)}
          />
        )}
      </div>

      {/* Event Options */}
      <div className="pt-6 border-t border-[#E2E8F0] space-y-3">
        <label className="block text-sm font-semibold text-[#0F172A]">Event Options</label>
        <div className="flex items-center justify-between gap-4 p-4 bg-white border border-[#E2E8F0] rounded-xl">
          <div>
            <p className="text-sm font-medium text-[#0F172A]">Enable Waitlist</p>
            <p className="text-xs text-[#64748B]">Allow guests to join when tickets sell out.</p>
          </div>
          <input
            type="checkbox"
            checked={Boolean(data.enableWaitlist)}
            onChange={(e) => onChange('enableWaitlist', e.target.checked)}
            className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
          />
        </div>
        <div className="flex items-center justify-between gap-4 p-4 bg-white border border-[#E2E8F0] rounded-xl">
          <div>
            <p className="text-sm font-medium text-[#0F172A]">Send Reminders</p>
            <p className="text-xs text-[#64748B]">Email attendees before the event starts.</p>
          </div>
          <input
            type="checkbox"
            checked={Boolean(data.sendReminders)}
            onChange={(e) => onChange('sendReminders', e.target.checked)}
            className="w-4 h-4 rounded border-[#CBD5E1] text-[#02338D] focus:ring-[#02338D]"
          />
        </div>
      </div>
    </div>
  );
};

