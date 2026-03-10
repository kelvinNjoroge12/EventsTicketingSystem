import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Keyboard,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  RotateCcw,
  Search,
  ArrowLeft,
  Camera,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import PageWrapper from '../components/layout/PageWrapper';

const QRCameraScanner = ({ onScan, onError, active }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      const msg = 'Camera access denied or not available on this device. Use manual entry.';
      setCameraError(msg);
      if (onError) onError(msg);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (!active) {
      stopCamera();
      return undefined;
    }
    startCamera();

    if ('BarcodeDetector' in window && videoRef.current) {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState !== 4) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            onScan(barcodes[0].rawValue);
            stopCamera();
          }
        } catch {
          // ignore frame errors
        }
      }, 500);
    }

    return () => stopCamera();
  }, [active, onScan, startCamera, stopCamera]);

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#F8FAFC] rounded-2xl border-2 border-dashed border-[#E2E8F0] p-6 text-center">
        <Camera className="w-10 h-10 text-[#94A3B8] mb-3" />
        <p className="text-sm text-[#64748B]">{cameraError}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} className="w-full max-h-72 object-cover" muted playsInline />
      {cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-white rounded-2xl relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#7C3AED] rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#7C3AED] rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#7C3AED] rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#7C3AED] rounded-br-lg" />
            <motion.div
              className="absolute top-0 left-0 right-0 h-0.5 bg-[#7C3AED] opacity-80"
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </div>
      )}
      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0F172A]">
          <div className="text-center text-white">
            <Camera className="w-10 h-10 mx-auto mb-2 opacity-50 animate-pulse" />
            <p className="text-sm opacity-70">Starting camera...</p>
          </div>
        </div>
      )}
    </div>
  );
};

const ResultBadge = ({ result }) => {
  if (!result) return null;
  const isSuccess = result.type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className={`rounded-2xl p-5 border-2 ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
          {isSuccess ? <CheckCircle className="w-7 h-7 text-green-600" /> : <XCircle className="w-7 h-7 text-red-600" />}
        </div>
        <div>
          <p className={`font-bold text-lg ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
            {isSuccess ? 'Checked in' : 'Entry denied'}
          </p>
          {isSuccess && result.data?.checkin && (
            <>
              <p className="text-green-700 font-semibold mt-1">{result.data.checkin.attendee_name}</p>
              <p className="text-green-600 text-sm mt-0.5">{result.data.checkin.attendee_email}</p>
            </>
          )}
          <p className={`text-sm mt-1 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>{result.message}</p>
        </div>
      </div>
    </motion.div>
  );
};

const CheckInPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('manual');
  const [manualInput, setManualInput] = useState('');
  const [manualHelper, setManualHelper] = useState('');
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [event, setEvent] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [activeTab, setActiveTab] = useState('scan');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (result) {
      const t = setTimeout(() => setResult(null), 5000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [result]);

  const loadAttendance = useCallback(async () => {
    setIsLoadingAttendance(true);
    try {
      const data = await api.get(`/api/events/${slug}/checkin/attendance/`);
      setAttendance(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setIsLoadingAttendance(false);
    }
  }, [slug]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const data = await api.get(`/api/events/${slug}/`);
        setEvent(data);
      } catch {
        setEvent(null);
      }
    };
    loadEvent();
  }, [slug]);

  const performScan = async (qrCodeData) => {
    if (isScanning || !qrCodeData) return;
    setIsScanning(true);
    setResult(null);
    try {
      const data = await api.post(`/api/events/${slug}/checkin/scan/`, { qr_code_data: qrCodeData });
      setResult({ type: 'success', message: data.message || 'Checked in successfully.', data });
      loadAttendance();
    } catch (err) {
      const msg = err?.response?.error?.message || err?.message || 'Invalid or already used ticket.';
      setResult({ type: 'error', message: msg });
    } finally {
      setIsScanning(false);
      setManualInput('');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const val = manualInput.trim();
    if (!val) return;
    performScan(val);
  };

  const toggleCheckIn = (guest) => {
    if (guest.scanCode) {
      performScan(guest.scanCode);
      return;
    }
    setMode('manual');
    setActiveTab('scan');
    setManualInput(guest.id?.toString() || guest.email || '');
    setManualHelper('No QR code found. Enter the order number or ticket ID.');
  };

  const attendees = attendance?.attendees || [];
  const stats = attendance?.stats || {};
  const guests = attendees.map((attendee) => {
    const name = attendee.attendee_name || attendee.name || 'Guest';
    const email = attendee.attendee_email || attendee.email || '';
    const ticketType = attendee.ticket_type || attendee.tickets?.[0]?.ticket_type || 'General';
    const checkedIn = attendee.checked_in_at || attendee.status === 'used' ||
      (Array.isArray(attendee.tickets) && attendee.tickets.some((ticket) => ticket.status === 'used'));
    const checkInTime = attendee.checked_in_at
      ? new Date(attendee.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : undefined;
    const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    return {
      id: attendee.order_number || attendee.id,
      name,
      email,
      ticketType,
      checkedIn,
      checkInTime,
      avatar: initials,
      scanCode: attendee.qr_code || attendee.qr_code_uuid || attendee.tickets?.[0]?.qr_code_uuid || '',
    };
  });

  const checkedInCount = stats.checked_in ?? guests.filter((guest) => guest.checkedIn).length;
  const totalGuests = stats.total_tickets ?? guests.length;

  const filteredGuests = guests.filter((guest) => {
    const q = searchQuery.toLowerCase();
    return (
      guest.name.toLowerCase().includes(q) ||
      guest.id?.toString().toLowerCase().includes(q) ||
      guest.email.toLowerCase().includes(q)
    );
  });

  const isOrganizer = user && (user.role === 'organizer' || user.role === 'admin');
  const isStaff = user && (user.is_staff || user.role === 'staff' || user.role === 'checkin');
  const assignedEvents = user?.assigned_events || user?.event_assignments || user?.checkin_events || [];
  const isAssigned = !assignedEvents.length || assignedEvents.some((value) => (
    String(value) === String(event?.id) || String(value) === String(event?.slug)
  ));
  const canAccess = Boolean(user && (isOrganizer || (isStaff && isAssigned)));

  if (!canAccess) {
    return (
      <PageWrapper className="bg-[#F8FAFC]">
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A]">Access Denied</h2>
          <p className="text-[#64748B] mt-2">You do not have permission to access this event check-in.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="bg-[#F8FAFC]">
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <QrCode className="w-7 h-7 text-[#7C3AED]" /> Event Check-in
                </h1>
                <p className="text-white/60 text-sm mt-1">{event?.title || 'Scan tickets or manually check in guests'}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Total', value: totalGuests ?? 0, color: 'bg-white/10' },
                  { label: 'Checked In', value: checkedInCount ?? 0, color: 'bg-green-500/20 text-green-300' },
                  { label: 'Remaining', value: Math.max(0, totalGuests - checkedInCount), color: 'bg-amber-500/20 text-amber-300' },
                ].map((stat) => (
                  <div key={stat.label} className={`px-4 py-2 rounded-xl ${stat.color} backdrop-blur-sm`}>
                    <p className="text-xs opacity-70">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-1 mt-6 border-b border-white/10">
              {[
                { id: 'scan', label: 'Scan / Check-in', icon: QrCode },
                { id: 'attendance', label: 'Guest List', icon: Users },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id ? 'border-[#7C3AED] text-white' : 'border-transparent text-white/50 hover:text-white/80'
                  }`}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'scan' && (
              <motion.div key="scan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="flex gap-2 bg-white border border-[#E2E8F0] rounded-2xl p-1.5 w-fit">
                  {[
                    { id: 'camera', label: 'Scan Camera', icon: Camera },
                    { id: 'manual', label: 'Manual Entry', icon: Keyboard },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setMode(item.id);
                        setResult(null);
                        setManualHelper('');
                      }}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        mode === item.id ? 'bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      <item.icon className="w-4 h-4" /> {item.label}
                    </button>
                  ))}
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5 shadow-sm">
                  {mode === 'camera' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-[#64748B] font-medium flex items-center gap-2">
                        <Camera className="w-4 h-4 text-[#1E4DB7]" />
                        Point your camera at the attendee QR code
                      </p>
                      <QRCameraScanner
                        onScan={performScan}
                        onError={(msg) => setResult({ type: 'error', message: msg })}
                        active={mode === 'camera'}
                      />
                      <p className="text-center text-xs text-[#94A3B8]">
                        QR scanning via camera works best on modern Chrome or Edge.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-[#64748B] font-medium flex items-center gap-2">
                        <Keyboard className="w-4 h-4 text-[#1E4DB7]" />
                        Enter the QR code or order number
                      </p>
                      <form onSubmit={handleManualSubmit} className="space-y-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="e.g. order number or QR code UUID"
                            className="w-full px-4 py-4 text-base border-2 border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#7C3AED] font-mono text-[#0F172A] placeholder:text-[#CBD5E1]"
                            autoComplete="off"
                          />
                          {manualInput && (
                            <button
                              type="button"
                              onClick={() => setManualInput('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                        <motion.button
                          type="submit"
                          disabled={!manualInput.trim() || isScanning}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-4 bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] text-white rounded-xl font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                          {isScanning ? (
                            <>Checking in...</>
                          ) : (
                            <>
                              <Zap className="w-5 h-5" /> Check In Guest
                            </>
                          )}
                        </motion.button>
                      </form>
                      {manualHelper && (
                        <p className="text-xs text-gray-500">{manualHelper}</p>
                      )}
                    </div>
                  )}

                  <AnimatePresence>
                    {result && <ResultBadge result={result} />}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {activeTab === 'attendance' && (
              <motion.div key="attendance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 lg:space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Guest List</CardTitle>
                      <div className="flex gap-2">
                        <div className="relative flex-1 sm:flex-none">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="Search guests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-full sm:w-40 lg:w-48 text-sm"
                          />
                        </div>
                        <Button variant="ghost" size="sm" onClick={loadAttendance}>
                          <RotateCcw className={`w-4 h-4 ${isLoadingAttendance ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-64 lg:max-h-96 overflow-auto">
                      {isLoadingAttendance ? (
                        <div className="text-center py-6 lg:py-8 text-sm text-gray-500">Loading guests...</div>
                      ) : (
                        filteredGuests.map((guest) => (
                          <div
                            key={guest.id}
                            className={`flex items-center gap-2 lg:gap-3 p-3 lg:p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                              guest.checkedIn ? 'bg-green-50/50' : ''
                            }`}
                          >
                            <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-xs lg:text-sm font-bold flex-shrink-0 ${
                              guest.checkedIn ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {guest.checkedIn ? <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" /> : guest.avatar}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#0F172A] text-sm truncate">{guest.name}</p>
                              <p className="text-xs text-gray-500">{guest.id} - {guest.ticketType}</p>
                            </div>

                            <div className="flex items-center gap-2 lg:gap-3">
                              {guest.checkedIn ? (
                                <div className="text-right">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white">Checked In</span>
                                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 justify-end">
                                    <Clock className="w-3 h-3" />
                                    {guest.checkInTime || '-'}
                                  </p>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleCheckIn(guest)}
                                  disabled={!guest.scanCode}
                                  className="border-[#C58B1A] text-[#C58B1A] hover:bg-[#C58B1A] hover:text-white text-xs h-7 lg:h-8"
                                >
                                  Check In
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {!isLoadingAttendance && filteredGuests.length === 0 && (
                        <div className="text-center py-6 lg:py-8">
                          <Users className="w-10 h-10 lg:w-12 lg:h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">No guests found</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
};

export default CheckInPage;
