
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  Users,
  Clock,
  RotateCcw,
  Camera,
  Keyboard,
  ArrowLeft,
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
      setCameraError('Camera access denied or not available on this device. Use manual entry below.');
      if (onError) onError('Camera access denied or not available on this device.');
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
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#C58B1A] rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#C58B1A] rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#C58B1A] rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#C58B1A] rounded-br-lg" />
            <div className="absolute left-0 right-0 h-0.5 bg-[#C58B1A] shadow-[0_0_10px_#C58B1A] scan-line" />
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
const CheckInPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanStatus, setScanStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualEntry, setManualEntry] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualHelper, setManualHelper] = useState('');
  const [attendance, setAttendance] = useState(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [event, setEvent] = useState(null);

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
    if (!qrCodeData) return;
    setScanStatus(null);
    try {
      const data = await api.post(`/api/events/${slug}/checkin/scan/`, { qr_code_data: qrCodeData });
      setScanStatus('success');
      setLastScan({ name: data?.checkin?.attendee_name || 'Guest', ticketType: data?.checkin?.ticket_type || 'Ticket' });
      loadAttendance();
    } catch (err) {
      const msg = err?.response?.error?.message || err?.message || 'Invalid or already used ticket.';
      setScanStatus('error');
      setLastScan({ name: msg, ticketType: 'Error' });
    } finally {
      setManualEntry('');
      setTimeout(() => {
        setLastScan(null);
        setScanStatus(null);
      }, 3000);
    }
  };

  const handleManualCheckIn = () => {
    const entry = manualEntry.trim();
    if (!entry) return;
    performScan(entry);
    setManualHelper('');
  };

  const attendees = attendance?.attendees || [];
  const stats = attendance?.stats || {};
  const guests = attendees.map((attendee) => {
    const name = attendee.attendee_name || attendee.name || 'Guest';
    const email = attendee.attendee_email || attendee.email || '';
    const ticketType = attendee.ticket_type || attendee.tickets?.[0]?.ticket_type || 'General';
    const checkedIn = attendee.checked_in_at || attendee.status === 'used' || (Array.isArray(attendee.tickets) && attendee.tickets.some((ticket) => ticket.status === 'used'));
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
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

  const filteredGuests = guests.filter((guest) => {
    const q = searchQuery.toLowerCase();
    return (
      guest.name.toLowerCase().includes(q) ||
      guest.id?.toString().toLowerCase().includes(q) ||
      guest.email.toLowerCase().includes(q)
    );
  });

  const toggleCheckIn = (guest) => {
    if (guest.scanCode) {
      performScan(guest.scanCode);
      return;
    }
    setShowManualEntry(true);
    setManualEntry(guest.id?.toString() || guest.email || '');
    setManualHelper('No QR code found. Enter the order number or ticket ID to check in.');
  };

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 lg:space-y-6">
          <div className="flex items-center gap-3 lg:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-[#0F172A]">Check-in</h2>
              <p className="text-sm text-gray-500">{event?.title || 'Scan tickets or manually check in guests'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <QrCode className="w-4 h-4 lg:w-5 lg:h-5" />
                  QR Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 lg:space-y-4">
                <div className="relative aspect-square max-w-xs mx-auto bg-black rounded-xl overflow-hidden">
                  {scanning ? (
                    <QRCameraScanner
                      onScan={performScan}
                      onError={(msg) => setLastScan({ name: msg, ticketType: 'Error' })}
                      active={scanning}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                      <QrCode className="w-12 h-12 lg:w-16 lg:h-16 text-gray-400 mb-3 lg:mb-4" />
                      <p className="text-gray-500 text-sm">Camera is off</p>
                    </div>
                  )}

                  {lastScan && (
                    <div className={
                      `absolute inset-0 flex items-center justify-center bg-black/80 ${
                        scanStatus === 'success' ? 'text-green-500' : 'text-red-500'
                      }`
                    }>
                      <div className="text-center">
                        {scanStatus === 'success' ? (
                          <CheckCircle className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-2" />
                        ) : (
                          <XCircle className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-2" />
                        )}
                        <p className="text-white font-bold text-sm lg:text-base">{lastScan.name}</p>
                        <p className="text-white/70 text-xs lg:text-sm">{lastScan.ticketType}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 lg:gap-3">
                  <Button
                    onClick={() => setScanning((prev) => !prev)}
                    className={
                      `flex-1 text-xs lg:text-sm ${
                        scanning ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1E4DB7] hover:bg-[#163B90]'
                      }`
                    }
                  >
                    {scanning ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
                        Start Scanning
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowManualEntry((prev) => {
                        if (prev) setManualHelper('');
                        return !prev;
                      });
                    }}
                    className="text-xs lg:text-sm"
                  >
                    <Keyboard className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
                    Manual
                  </Button>
                </div>

                {showManualEntry && (
                  <div className="flex gap-2 animate-slide-in-up">
                    <Input
                      type="text"
                      placeholder="Enter QR code, order number, or ticket ID"
                      value={manualEntry}
                      onChange={(e) => setManualEntry(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualCheckIn()}
                      className="text-sm"
                    />
                    <Button onClick={handleManualCheckIn} className="bg-[#C58B1A] text-white">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {manualHelper && (
                  <p className="text-xs text-gray-500">{manualHelper}</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 lg:space-y-6">
              <Card>
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-3 lg:mb-4">
                    <div>
                      <p className="text-xs lg:text-sm text-gray-500">Check-in Progress</p>
                      <h3 className="text-xl lg:text-2xl font-bold text-[#0F172A]">
                        {checkedInCount} <span className="text-gray-400">/ {totalGuests}</span>
                      </h3>
                    </div>
                    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-2 lg:border-4 border-[#C58B1A] flex items-center justify-center">
                      <span className="text-base lg:text-lg font-bold text-[#0F172A]">{checkInPercentage}%</span>
                    </div>
                  </div>
                  <div className="h-2 lg:h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#1E4DB7] to-[#C58B1A] rounded-full transition-all duration-500"
                      style={{ width: `${checkInPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 lg:mt-3 text-xs lg:text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      {Math.max(0, totalGuests - checkedInCount)} remaining
                    </span>
                    <span className="text-[#C58B1A] font-medium">
                      {checkInPercentage}% complete
                    </span>
                  </div>
                </CardContent>
              </Card>

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
                        <RotateCcw className="w-4 h-4" />
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
                          className={
                            `flex items-center gap-2 lg:gap-3 p-3 lg:p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                              guest.checkedIn ? 'bg-green-50/50' : ''
                            }`
                          }
                        >
                          <div className={
                            `w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-xs lg:text-sm font-bold flex-shrink-0 ${
                              guest.checkedIn ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                            }`
                          }>
                            {guest.checkedIn ? <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" /> : guest.avatar}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#0F172A] text-sm truncate">{guest.name}</p>
                            <p className="text-xs text-gray-500">{guest.id} • {guest.ticketType}</p>
                          </div>

                          <div className="flex items-center gap-2 lg:gap-3">
                            {guest.checkedIn ? (
                              <div className="text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500 text-white">Checked In</span>
                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 justify-end">
                                  <Clock className="w-3 h-3" />
                                  {guest.checkInTime || '—'}
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
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default CheckInPage;



