import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Calendar,
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import PageWrapper from '../components/layout/PageWrapper';
import EventCard from '../components/cards/EventCard';
import CustomTabs from '../components/ui/CustomTabs';
import CustomAvatar from '../components/ui/CustomAvatar';
import { fetchOrganizerEvents, fetchOrganizerProfile } from '../lib/eventsApi';
import { sortPastEvents, sortPublicEvents } from '../lib/eventOrdering';

const ensureExternalUrl = (value) => {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const ensureSocialUrl = (value, baseUrl) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${baseUrl}${value.replace(/^@/, '')}`;
};

const OrganizerProfileSkeleton = () => (
  <PageWrapper>
    <div className="min-h-screen bg-[linear-gradient(180deg,#F4F8FF_0%,#F8FAFC_42%,#FFFFFF_100%)]">
      <div className="h-64 animate-pulse bg-[#DBEAFE]" />
      <div className="mx-auto -mt-14 max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="h-28 w-28 rounded-3xl bg-[#E2E8F0]" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-32 rounded-full bg-[#E2E8F0]" />
              <div className="h-10 w-2/3 rounded-2xl bg-[#E2E8F0]" />
              <div className="h-4 w-full rounded-full bg-[#E2E8F0]" />
              <div className="h-4 w-5/6 rounded-full bg-[#E2E8F0]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageWrapper>
);

const OrganizerProfilePage = () => {
  const { id } = useParams();

  const {
    data: organizer,
    isLoading: isLoadingOrganizer,
    error: organizerError,
    refetch: refetchOrganizer,
  } = useQuery({
    queryKey: ['organizer-profile', id],
    queryFn: () => fetchOrganizerProfile(id),
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const {
    data: organizerEvents = [],
    isLoading: isLoadingEvents,
    isFetching: isFetchingEvents,
  } = useQuery({
    queryKey: ['organizer-events', id],
    queryFn: () => fetchOrganizerEvents(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });

  const upcomingEvents = useMemo(
    () => sortPublicEvents(
      organizerEvents.filter(
        (event) => !(event.isPast || event.timeState === 'past' || event.status === 'completed')
      )
    ),
    [organizerEvents]
  );

  const pastEvents = useMemo(
    () => sortPastEvents(
      organizerEvents.filter(
        (event) => event.isPast || event.timeState === 'past' || event.status === 'completed'
      )
    ),
    [organizerEvents]
  );

  if (isLoadingOrganizer) {
    return <OrganizerProfileSkeleton />;
  }

  if (organizerError && organizerError.status !== 404) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="mb-4 text-3xl font-bold text-[#0F172A]">Unable To Load Organizer</h1>
          <p className="mb-8 text-base text-[#64748B]">
            We couldn&apos;t load this organizer profile just now. Please try again.
          </p>
          <button
            type="button"
            onClick={() => refetchOrganizer()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#02338D] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#022A78]"
          >
            Retry
          </button>
        </div>
      </PageWrapper>
    );
  }

  if (!id || organizerError?.status === 404 || !organizer) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="mb-4 text-3xl font-bold text-[#0F172A]">Organizer Not Found</h1>
          <p className="mb-8 text-base text-[#64748B]">
            The organizer profile you&apos;re looking for isn&apos;t available right now.
          </p>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 rounded-xl bg-[#02338D] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#022A78]"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse Events
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const brandColor = organizer.brandColor || '#02338D';
  const websiteUrl = ensureExternalUrl(organizer.website);
  const socialLinks = [
    organizer.social?.twitter
      ? {
          label: 'Twitter',
          href: ensureSocialUrl(organizer.social.twitter, 'https://twitter.com/'),
          icon: Twitter,
        }
      : null,
    organizer.social?.linkedin
      ? {
          label: 'LinkedIn',
          href: ensureSocialUrl(organizer.social.linkedin, 'https://www.linkedin.com/in/'),
          icon: Linkedin,
        }
      : null,
    organizer.social?.instagram
      ? {
          label: 'Instagram',
          href: ensureSocialUrl(organizer.social.instagram, 'https://www.instagram.com/'),
          icon: Instagram,
        }
      : null,
  ].filter(Boolean);

  const hostedEventsCount = organizer.totalEvents > 0 ? organizer.totalEvents : organizerEvents.length;
  const attendeesReached = organizer.totalAttendees > 0 ? organizer.totalAttendees : 0;
  const aboutCopy = organizer.bio || `${organizer.name} is actively hosting experiences and bringing attendees together through curated events on the platform.`;

  const renderEventsGrid = (events, emptyTitle, emptyBody) => {
    if (isLoadingEvents && organizerEvents.length === 0) {
      return <div className="py-10 text-sm text-[#64748B]">Loading hosted events...</div>;
    }

    if (events.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-[#94A3B8]" />
          <h3 className="text-lg font-semibold text-[#0F172A]">{emptyTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">{emptyBody}</p>
        </div>
      );
    }

    return (
      <div className="grid gap-5 sm:grid-cols-2">
        {events.map((event, index) => (
          <EventCard key={event.id || event.slug} event={event} index={index} />
        ))}
      </div>
    );
  };

  const eventTabs = [
    {
      label: `Upcoming Events (${upcomingEvents.length})`,
      content: renderEventsGrid(
        upcomingEvents,
        'No upcoming events yet',
        'Check back soon for the next event from this organizer.'
      ),
    },
    {
      label: `Past Events (${pastEvents.length})`,
      content: renderEventsGrid(
        pastEvents,
        'No past events yet',
        'Completed events from this organizer will appear here.'
      ),
    },
  ];

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[linear-gradient(180deg,#F4F8FF_0%,#F8FAFC_42%,#FFFFFF_100%)]">
        <div
          className="relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd 55%, ${brandColor}9c 100%)` }}
        >
          <div className="absolute inset-0 opacity-15">
            <svg className="h-full w-full" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="organizer-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="200" height="200" fill="url(#organizer-grid)" />
            </svg>
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to events
            </Link>

            <div className="mt-8 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] xl:items-end">
              <CustomAvatar
                src={organizer.avatar}
                name={organizer.name}
                size="xl"
                fallbackColor={brandColor}
                className="h-28 w-28 rounded-[28px] border-4 border-white/25 text-3xl shadow-2xl sm:h-32 sm:w-32"
              />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                    Organizer Profile
                  </span>
                  {organizer.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0F172A]">
                      <BadgeCheck className="h-3.5 w-3.5" style={{ color: brandColor }} />
                      Verified organizer
                    </span>
                  )}
                </div>

                <h1 className="mt-4 max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
                  {organizer.name}
                </h1>

                {organizer.contactName && (
                  <p className="mt-3 text-sm font-medium uppercase tracking-[0.18em] text-white/75">
                    Managed by {organizer.contactName}
                  </p>
                )}

                <p className="mt-4 max-w-3xl text-base leading-7 text-white/90 sm:text-lg">
                  {aboutCopy}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {websiteUrl && (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] transition-transform hover:-translate-y-0.5"
                    >
                      <Globe className="h-4 w-4" style={{ color: brandColor }} />
                      Visit website
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  )}

                  {socialLinks.map(({ label, href, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.55)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                      About This Organizer
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">Who they are</h2>
                  </div>
                  {isFetchingEvents && (
                    <span className="text-sm font-medium text-[#64748B]">Refreshing events...</span>
                  )}
                </div>

                <p className="mt-5 text-base leading-7 text-[#475569]">
                  {aboutCopy}
                </p>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.55)]"
              >
                <div className="mb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                    Hosted Events
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">Explore their lineup</h2>
                </div>

                <CustomTabs
                  tabs={eventTabs}
                  defaultTab={0}
                  variant="pills"
                  contentClassName="pt-6"
                />
              </motion.section>
            </div>

            <div className="space-y-6">
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.55)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  Quick Facts
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl bg-[#F8FAFC] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
                      <Building2 className="h-4 w-4" style={{ color: brandColor }} />
                      Public events hosted
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[#0F172A]">
                      {hostedEventsCount.toLocaleString('en-US')}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8FAFC] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
                      <Users className="h-4 w-4" style={{ color: brandColor }} />
                      Attendees reached
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[#0F172A]">
                      {attendeesReached.toLocaleString('en-US')}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8FAFC] p-4 sm:col-span-2 xl:col-span-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#475569]">
                      <Calendar className="h-4 w-4" style={{ color: brandColor }} />
                      Events on deck
                    </div>
                    <p className="mt-3 text-3xl font-bold text-[#0F172A]">
                      {upcomingEvents.length.toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.55)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  Connect
                </p>

                <div className="mt-5 space-y-3">
                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] px-4 py-3 text-sm font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Globe className="h-4 w-4" style={{ color: brandColor }} />
                        Website
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[#64748B]" />
                    </a>
                  ) : null}

                  {socialLinks.map(({ label, href, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] px-4 py-3 text-sm font-semibold text-[#0F172A] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: brandColor }} />
                        {label}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[#64748B]" />
                    </a>
                  ))}

                  {!websiteUrl && socialLinks.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-6 text-sm leading-6 text-[#64748B]">
                      No public website or social profiles have been shared yet.
                    </div>
                  )}
                </div>
              </motion.section>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default OrganizerProfilePage;


