import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    QrCode, Keyboard, CheckCircle2, XCircle, Clock, Users, RotateCcw,
    Search, ArrowLeft, Camera, Zap, AlertCircle, Mail, Send, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import PageWrapper from '../components/layout/PageWrapper';

// ─── QR Scanner using device camera ──────────────────────────
const QRCameraScanner = ({ onScan, onError }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const scanIntervalRef = useRef(null);

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
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    }, []);

    useEffect(() => {
        startCamera();
        // Use BarcodeDetector if available (Chrome 83+, Android)
        if ('BarcodeDetector' in window && videoRef.current) {
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            scanIntervalRef.current = setInterval(async () => {
                if (!videoRef.current || !videoRef.current.readyState === 4) return;
                try {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        onScan(barcodes[0].rawValue);
                        stopCamera();
                    }
                } catch { /* ignore frame errors */ }
            }, 500);
        }
        return () => stopCamera();
    }, []);

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

// ─── Result Badge ─────────────────────────────────────────────
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
                    {isSuccess ? <CheckCircle2 className="w-7 h-7 text-green-600" /> : <XCircle className="w-7 h-7 text-red-600" />}
                </div>
                <div>
                    <p className={`font-bold text-lg ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                        {isSuccess ? '✓ Checked In!' : '✗ Entry Denied'}
                    </p>
                    {isSuccess && result.data && (
                        <>
                            <p className="text-green-700 font-semibold mt-1">{result.data.checkin?.attendee_name}</p>
                            <p className="text-green-600 text-sm mt-0.5">{result.data.checkin?.attendee_email}</p>
                        </>
                    )}
                    <p className={`text-sm mt-1 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>{result.message}</p>
                </div>
            </div>
        </motion.div>
    );
};

// ─── Main CheckIn Page ────────────────────────────────────────
const CheckInPage = () => {
    const { slug } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [mode, setMode] = useState('manual'); // 'camera' | 'manual'
    const [manualInput, setManualInput] = useState('');
    const [result, setResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [event, setEvent] = useState(null);
    const [attendance, setAttendance] = useState(null);
    const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
    const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'attendance'
    const [resendingOrder, setResendingOrder] = useState(null);
    const [resendResult, setResendResult] = useState({});
    const [searchAttendee, setSearchAttendee] = useState('');

    // Reset result after delay
    useEffect(() => {
        if (result) {
            const t = setTimeout(() => setResult(null), 6000);
            return () => clearTimeout(t);
        }
    }, [result]);

    // Load event info + attendance
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

    const performScan = async (qrCodeData) => {
        if (isScanning) return;
        setIsScanning(true);
        setResult(null);
        try {
            const data = await api.post(`/api/events/${slug}/checkin/scan/`, { qr_code_data: qrCodeData });
            setResult({ type: 'success', message: data.message || 'Checked in successfully!', data });
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

    const handleResend = async (orderNumber) => {
        setResendingOrder(orderNumber);
        try {
            await api.post(`/api/events/${slug}/checkin/resend/`, { order_number: orderNumber });
            setResendResult(prev => ({ ...prev, [orderNumber]: { ok: true, msg: 'Email sent!' } }));
        } catch (err) {
            setResendResult(prev => ({ ...prev, [orderNumber]: { ok: false, msg: 'Send failed.' } }));
        } finally {
            setResendingOrder(null);
        }
    };

    if (!user || (user.role !== 'organizer' && user.role !== 'admin')) {
        return (
            <PageWrapper>
                <div className="text-center py-20">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-[#0F172A]">Access Denied</h2>
                    <p className="text-[#64748B] mt-2">Only event organizers can access check-in.</p>
                </div>
            </PageWrapper>
        );
    }

    const stats = attendance?.stats || {};
    const attendees = attendance?.attendees || [];
    const filteredAttendees = attendees.filter(a => {
        const q = searchAttendee.toLowerCase();
        return !q || a.attendee_name?.toLowerCase().includes(q) || a.attendee_email?.toLowerCase().includes(q) || a.order_number?.toLowerCase().includes(q);
    });

    return (
        <PageWrapper>
            <div className="min-h-screen bg-[#F8FAFC]">
                {/* ── Header ── */}
                <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
                    <div className="max-w-5xl mx-auto px-4 py-6">
                        <Link to="/organizer-dashboard" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-4 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </Link>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold flex items-center gap-2">
                                    <QrCode className="w-7 h-7 text-[#7C3AED]" /> Event Check-In
                                </h1>
                                <p className="text-white/60 text-sm mt-1">Scan tickets or search by QR code UUID</p>
                            </div>
                            {/* Stats Pills */}
                            <div className="flex gap-3 flex-wrap">
                                {[
                                    { label: 'Total', value: stats.total_tickets ?? '—', color: 'bg-white/10' },
                                    { label: 'Checked In', value: stats.checked_in ?? '—', color: 'bg-green-500/20 text-green-300' },
                                    { label: 'Remaining', value: stats.not_checked_in ?? '—', color: 'bg-amber-500/20 text-amber-300' },
                                ].map(s => (
                                    <div key={s.label} className={`px-4 py-2 rounded-xl ${s.color} backdrop-blur-sm`}>
                                        <p className="text-xs opacity-70">{s.label}</p>
                                        <p className="text-xl font-bold">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex gap-1 mt-6 border-b border-white/10">
                            {[{ id: 'scan', label: 'Scan / Check-In', icon: QrCode }, { id: 'attendance', label: 'Attendance List', icon: Users }].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-[#7C3AED] text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}
                                >
                                    <t.icon className="w-4 h-4" /> {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                    <AnimatePresence mode="wait">

                        {/* ═══════════ SCAN TAB ═══════════ */}
                        {activeTab === 'scan' && (
                            <motion.div key="scan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                                {/* Mode Toggle */}
                                <div className="flex gap-2 bg-white border border-[#E2E8F0] rounded-2xl p-1.5 w-fit">
                                    {[
                                        { id: 'camera', label: 'Scan Camera', icon: Camera },
                                        { id: 'manual', label: 'Manual Entry', icon: Keyboard },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => { setMode(m.id); setResult(null); }}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === m.id ? 'bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] text-white shadow-md' : 'text-[#64748B] hover:text-[#0F172A]'}`}
                                        >
                                            <m.icon className="w-4 h-4" /> {m.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Scanner Panel */}
                                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5 shadow-sm">
                                    {mode === 'camera' ? (
                                        <div className="space-y-4">
                                            <p className="text-sm text-[#64748B] font-medium flex items-center gap-2">
                                                <Camera className="w-4 h-4 text-[#1E4DB7]" />
                                                Point your camera at the attendee's QR code
                                            </p>
                                            <QRCameraScanner
                                                onScan={performScan}
                                                onError={(e) => setResult({ type: 'error', message: e })}
                                            />
                                            <p className="text-center text-xs text-[#94A3B8]">
                                                QR scanning via camera requires Chrome/Edge on Android or desktop
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-sm text-[#64748B] font-medium flex items-center gap-2">
                                                <Keyboard className="w-4 h-4 text-[#1E4DB7]" />
                                                Enter the QR code UUID from the attendee's ticket email
                                            </p>
                                            <form onSubmit={handleManualSubmit} className="space-y-3">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={manualInput}
                                                        onChange={(e) => setManualInput(e.target.value)}
                                                        placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                                                        className="w-full px-4 py-4 text-base border-2 border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#7C3AED] font-mono text-[#0F172A] placeholder:text-[#CBD5E1]"
                                                        autoComplete="off"
                                                    />
                                                    {manualInput && (
                                                        <button type="button" onClick={() => setManualInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B]">
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
                                                        <><RefreshCw className="w-5 h-5 animate-spin" /> Checking in...</>
                                                    ) : (
                                                        <><Zap className="w-5 h-5" /> Check In Attendee</>
                                                    )}
                                                </motion.button>
                                            </form>
                                        </div>
                                    )}

                                    {/* Result */}
                                    <AnimatePresence>
                                        {result && <ResultBadge result={result} />}
                                    </AnimatePresence>
                                </div>

                                {/* Tips */}
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                    <h4 className="font-semibold text-[#1E4DB7] text-sm mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> How to Check In</h4>
                                    <ul className="text-sm text-[#1E4DB7]/80 space-y-1.5 list-none">
                                        <li>📷 <strong>Camera:</strong> Click "Scan Camera", allow access, and show the QR from the email</li>
                                        <li>⌨️ <strong>Manual:</strong> Open the attendee's ticket email, copy the UUID shown below the QR image, paste it here</li>
                                        <li>🔁 The same QR code cannot be used twice — it will be rejected after first scan</li>
                                    </ul>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════ ATTENDANCE TAB ═══════════ */}
                        {activeTab === 'attendance' && (
                            <motion.div key="attendance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                                {/* Stats Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Total Orders', value: stats.total_orders ?? 0, color: '#1E4DB7', bg: 'bg-blue-50 border-blue-100' },
                                        { label: 'Checked In', value: stats.checked_in ?? 0, color: '#16A34A', bg: 'bg-green-50 border-green-100' },
                                        { label: 'Email Sent', value: stats.email_sent ?? 0, color: '#7C3AED', bg: 'bg-purple-50 border-purple-100' },
                                        { label: 'Email Failed', value: stats.email_failed ?? 0, color: '#DC2626', bg: 'bg-red-50 border-red-100' },
                                    ].map((s, i) => (
                                        <div key={i} className={`${s.bg} border rounded-2xl p-4`}>
                                            <p className="text-xs text-[#64748B] font-medium uppercase tracking-wider">{s.label}</p>
                                            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Search + Refresh */}
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, email or order..."
                                            value={searchAttendee}
                                            onChange={(e) => setSearchAttendee(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20"
                                        />
                                    </div>
                                    <button onClick={loadAttendance} className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors" title="Refresh">
                                        <RotateCcw className={`w-4 h-4 text-[#64748B] ${isLoadingAttendance ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>

                                {/* Attendee List */}
                                <div className="space-y-3">
                                    {isLoadingAttendance ? (
                                        [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white border border-[#E2E8F0] rounded-2xl animate-pulse" />)
                                    ) : filteredAttendees.length === 0 ? (
                                        <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-2xl">
                                            <Users className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                                            <p className="text-[#64748B]">No attendees found.</p>
                                        </div>
                                    ) : filteredAttendees.map((attendee, i) => {
                                        const checkedIn = attendee.tickets?.some(t => t.status === 'used');
                                        const rr = resendResult[attendee.order_number];
                                        return (
                                            <motion.div
                                                key={attendee.order_number}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className="bg-white border border-[#E2E8F0] rounded-2xl p-4 hover:shadow-sm transition-shadow"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                                    {/* Avatar + Info */}
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${checkedIn ? 'bg-green-500' : 'bg-[#1E4DB7]'}`}>
                                                            {attendee.attendee_name?.[0]?.toUpperCase() || 'A'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-[#0F172A] text-sm truncate">{attendee.attendee_name}</p>
                                                            <p className="text-xs text-[#64748B] truncate">{attendee.attendee_email}</p>
                                                            <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{attendee.order_number}</p>
                                                        </div>
                                                    </div>

                                                    {/* Ticket Info */}
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        {attendee.tickets?.map((t, ti) => (
                                                            <div key={ti} className="text-center">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'used' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                    {t.status === 'used' ? '✓ In' : '⏳ Pending'}
                                                                </span>
                                                                <p className="text-[9px] text-[#94A3B8] mt-0.5">{t.ticket_type}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Email Status + Resend */}
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {attendee.email_sent ? (
                                                            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-600 text-xs font-medium">
                                                                <Mail className="w-3 h-3" /> Sent
                                                            </span>
                                                        ) : attendee.email_error ? (
                                                            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium" title={attendee.email_error}>
                                                                <XCircle className="w-3 h-3" /> Failed
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F1F5F9] text-[#64748B] text-xs">
                                                                <Clock className="w-3 h-3" /> Not sent
                                                            </span>
                                                        )}

                                                        <button
                                                            onClick={() => handleResend(attendee.order_number)}
                                                            disabled={resendingOrder === attendee.order_number}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E4DB7] text-white text-xs font-medium hover:bg-[#1a44a8] disabled:opacity-50 transition-colors"
                                                            title="Resend ticket email"
                                                        >
                                                            {resendingOrder === attendee.order_number ? (
                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Send className="w-3.5 h-3.5" />
                                                            )}
                                                            {rr ? (rr.ok ? '✓ Sent' : '✗ Failed') : 'Resend'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </PageWrapper>
    );
};

export default CheckInPage;
