import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Ticket, BarChart3, Smartphone, Search, Megaphone,
    Calendar, Users, Wallet, CheckCircle2, ArrowRight,
    MapPin, Globe, HeadphonesIcon, Settings, Heart
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CustomButton from '../components/ui/CustomButton';

const HostEventLandingPage = () => {
    // Animation variants
    const sectionVariant = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
    };

    const staggercontainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const itemVariant = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <PageWrapper>
            <div className="bg-[#F8FAFC]">
                {/* ── HERO SECTION ── */}
                <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-white">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#EEF4FF] via-white to-white" />
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <span className="inline-block px-4 py-1.5 rounded-full bg-[#E6EEFF] text-[#02338D] text-sm font-bold tracking-wider mb-6">
                                    Built for Alumni, Student & Corporate Events
                                </span>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#0F172A] leading-tight mb-6">
                                    Strathmore-affiliated event hosting <br /> <span className="text-[#02338D]">made easy</span>
                                </h1>
                                <p className="text-lg md:text-xl text-[#64748B] mb-8 max-w-lg leading-relaxed">
                                    The official ticketing and discovery platform for Strathmore University. Create events organized by Strathmore or in collaboration for alumni, students, and corporate guests.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Link to="/signup">
                                        <CustomButton variant="primary" size="xl" className="w-full sm:w-auto shadow-lg shadow-[#02338D]/30">
                                            Get started
                                        </CustomButton>
                                    </Link>
                                    <a href="https://strathmore.edu/contacts/" target="_blank" rel="noreferrer">
                                        <CustomButton variant="outline" size="xl" className="w-full sm:w-auto">
                                            Contact University Relations
                                        </CustomButton>
                                    </a>
                                </div>
                            </motion.div>

                            {/* Hero Image / UI Mockup */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="relative"
                            >
                                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                                    <div className="h-12 bg-gray-100 flex items-center px-4 border-b border-gray-200">
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-[#7A0019]"></div>
                                            <div className="w-3 h-3 rounded-full bg-[#D4AF37]"></div>
                                            <div className="w-3 h-3 rounded-full bg-[#02338D]"></div>
                                        </div>
                                    </div>
                                    <img
                                        src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                                        alt="People having fun at an event"
                                        className="w-full h-auto object-cover opacity-90"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C3A]/80 via-transparent to-transparent flex flex-col justify-end p-8">
                                        <h3 className="text-2xl font-bold text-white mb-2">Leadership & Innovation Forum</h3>
                                        <p className="text-white/80 flex items-center gap-2"><MapPin className="w-4 h-4" /> Strathmore University, Nairobi</p>
                                    </div>
                                </div>

                                {/* Floating Badges */}
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                    className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-4"
                                >
                                    <div className="w-12 h-12 rounded-full bg-[#E6EEFF] flex items-center justify-center">
                                        <Ticket className="w-6 h-6 text-[#02338D]" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Tickets Issued</p>
                                        <p className="text-xl font-bold text-gray-900">1,245</p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ── CORE FEATURES ── */}
                <section className="py-20 bg-[#F8FAFC]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            className="text-center max-w-3xl mx-auto mb-16"
                            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariant}
                        >
                            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">All the tools Strathmore organizers need</h2>
                            <p className="text-[#64748B] text-lg">
                                From ticketing to guest check-in, manage alumni, student, and corporate events with secure, collaboration-ready workflows.
                            </p>
                        </motion.div>

                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggercontainer}
                        >
                            {/* Feature 1 */}
                            <motion.div variants={itemVariant} className="bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0] hover:shadow-lg transition-all">
                                <div className="w-14 h-14 bg-[#E6EEFF] rounded-2xl flex items-center justify-center mb-6">
                                    <Ticket className="w-7 h-7 text-[#02338D]" />
                                </div>
                                <h3 className="text-xl font-bold text-[#0F172A] mb-3">Official Ticketing</h3>
                                <p className="text-[#64748B] mb-6">Issue tickets for Strathmore-organized or affiliated events with a seamless checkout experience.</p>
                                <Link to="/signup" className="text-[#02338D] font-medium flex items-center gap-1 hover:gap-2 transition-all">
                                    Explore ticketing tools <ArrowRight className="w-4 h-4" />
                                </Link>
                            </motion.div>

                            {/* Feature 2 */}
                            <motion.div variants={itemVariant} className="bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0] hover:shadow-lg transition-all">
                                <div className="w-14 h-14 bg-[#E6EEFF] rounded-2xl flex items-center justify-center mb-6">
                                    <BarChart3 className="w-7 h-7 text-[#02338D]" />
                                </div>
                                <h3 className="text-xl font-bold text-[#0F172A] mb-3">Attendance Insights</h3>
                                <p className="text-[#64748B] mb-6">Track registrations and attendance across schools, departments, and units.</p>
                                <Link to="/signup" className="text-[#02338D] font-medium flex items-center gap-1 hover:gap-2 transition-all">
                                    View insights <ArrowRight className="w-4 h-4" />
                                </Link>
                            </motion.div>

                            {/* Feature 3 */}
                            <motion.div variants={itemVariant} className="bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0] hover:shadow-lg transition-all">
                                <div className="w-14 h-14 bg-[#F2DCE2] rounded-2xl flex items-center justify-center mb-6">
                                    <Smartphone className="w-7 h-7 text-[#7A0019]" />
                                </div>
                                <h3 className="text-xl font-bold text-[#0F172A] mb-3">Check-In Tools</h3>
                                <p className="text-[#64748B] mb-6">Validate QR tickets, manage entry lines, and support on-site teams with ease.</p>
                                <Link to="/signup" className="text-[#7A0019] font-medium flex items-center gap-1 hover:gap-2 transition-all">
                                    See check-in tools <ArrowRight className="w-4 h-4" />
                                </Link>
                            </motion.div>

                            {/* Feature 4 */}
                            <motion.div variants={itemVariant} className="bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0] hover:shadow-lg transition-all">
                                <div className="w-14 h-14 bg-[#F6E9C8] rounded-2xl flex items-center justify-center mb-6">
                                    <Megaphone className="w-7 h-7 text-[#D4AF37]" />
                                </div>
                                <h3 className="text-xl font-bold text-[#0F172A] mb-3">University Promotion</h3>
                                <p className="text-[#64748B] mb-6">Share event pages through official channels and community networks.</p>
                                <Link to="/signup" className="text-[#D4AF37] font-medium flex items-center gap-1 hover:gap-2 transition-all">
                                    Promotion options <ArrowRight className="w-4 h-4" />
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* ── PAYMENTS SECTION ── */}
                <section className="py-20 bg-white border-y border-[#E2E8F0]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <motion.div
                                className="order-2 lg:order-1 relative"
                                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariant}
                            >
                                <div className="bg-[#F8FAFC] rounded-3xl p-8 border border-[#E2E8F0] shadow-inner relative overflow-hidden">
                                    <div className="space-y-4 relative z-10">
                                        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0] flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#E6EEFF] flex items-center justify-center">
                                                    <Wallet className="w-5 h-5 text-[#02338D]" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500 font-medium">Available Balance</p>
                                                    <p className="text-lg font-bold text-gray-900">$8,450.00</p>
                                                </div>
                                            </div>
                                            <button className="bg-[#02338D] text-white px-4 py-2 rounded-lg text-sm font-semibold">Withdraw</button>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#E2E8F0]">
                                            <p className="font-semibold text-gray-900 mb-2">Scheduled Payouts</p>
                                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2 border border-gray-100">
                                                <span className="text-sm font-medium text-gray-700">Weekly</span>
                                                <CheckCircle2 className="w-5 h-5 text-[#02338D]" />
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                                                <span className="text-sm font-medium text-gray-500">Twice a month</span>
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 mt-2">
                                                <span className="text-sm font-medium text-gray-500">After each event</span>
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#E6EEFF] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                </div>
                            </motion.div>

                            <motion.div
                                className="order-1 lg:order-2"
                                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariant}
                            >
                                <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-6">Collect fees and manage budgets</h2>
                                <p className="text-[#64748B] text-lg mb-8">
                                    Capture ticket revenue or waivers, track payouts, and keep budgeting clear for departments and student associations.
                                </p>

                                <ul className="space-y-6">
                                    <li className="flex gap-4">
                                        <div className="mt-1 w-6 h-6 rounded-full bg-[#E6EEFF] flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-[#02338D]" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#0F172A] text-lg">Secure Payment Processing</h4>
                                            <p className="text-[#64748B]">Collect fees or waive tickets with clear audit trails and secure processing.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="mt-1 w-6 h-6 rounded-full bg-[#F6E9C8] flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#0F172A] text-lg">Transparent fees</h4>
                                            <p className="text-[#64748B]">Simple pricing and visibility so you can focus on the event experience.</p>
                                        </div>
                                    </li>
                                    <li className="flex gap-4">
                                        <div className="mt-1 w-6 h-6 rounded-full bg-[#F2DCE2] flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-[#7A0019]" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#0F172A] text-lg">Flexible payouts</h4>
                                            <p className="text-[#64748B]">Coordinate payouts based on your departmental or unit requirements.</p>
                                        </div>
                                    </li>
                                </ul>

                                <Link to="/signup" className="inline-block mt-8">
                                    <CustomButton variant="outline" size="lg">Discover payment tools</CustomButton>
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ── CTA SECTION ── */}
                <section className="py-24 bg-[#02338D] text-white relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#7A0019]/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>

                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={sectionVariant}>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">Publish your Strathmore-affiliated events</h2>
                            <p className="text-xl text-[#E6EEFF] mb-10 max-w-2xl mx-auto">
                                Reach alumni, students, and corporate guests with official Strathmore University ticketing and check-in.
                            </p>

                            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
                                <Link to="/signup">
                                    <button className="w-full sm:w-auto px-8 py-4 bg-white text-[#02338D] rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors shadow-xl">
                                        Get started
                                    </button>
                                </Link>
                                <a href="https://strathmore.edu/contacts/" target="_blank" rel="noreferrer">
                                    <button className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-colors">
                                        Contact University Relations
                                    </button>
                                </a>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left border-t border-white/20 pt-10">
                                <div className="space-y-2 text-sm text-[#E6EEFF]">
                                    <p className="font-bold text-white mb-4">Event Creation</p>
                                    <p>Event Page Builder</p>
                                    <p>Event Registration</p>
                                    <p>Sell Tickets Online</p>
                                </div>
                                <div className="space-y-2 text-sm text-[#E6EEFF]">
                                    <p className="font-bold text-white mb-4">Event Promotion</p>
                                    <p>University Announcements</p>
                                    <p>Email & SMS Alerts</p>
                                    <p>Student Networks</p>
                                </div>
                                <div className="space-y-2 text-sm text-[#E6EEFF]">
                                    <p className="font-bold text-white mb-4">Event Types</p>
                                    <p>Academic Talks</p>
                                    <p>Sports & Recreation</p>
                                    <p>Alumni Gatherings</p>
                                </div>
                                <div className="space-y-2 text-sm text-[#E6EEFF]">
                                    <p className="font-bold text-white mb-4">Event Hosting</p>
                                    <p>Ticket Scanning</p>
                                    <p>Check-In App</p>
                                    <p>Analytics</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </div>
        </PageWrapper>
    );
};

export default HostEventLandingPage;

