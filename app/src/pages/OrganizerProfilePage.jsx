import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Link as LinkIcon,
  Twitter,
  Linkedin,
  Instagram,
  Calendar,
  Users,
  Globe
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import EventCard from '../components/cards/EventCard';
import CustomTabs from '../components/ui/CustomTabs';
import CustomAvatar from '../components/ui/CustomAvatar';
import { api } from '../lib/apiClient';
import { fetchOrganizerEvents } from '../lib/eventsApi';

const OrganizerProfilePage = () => {
  const { id } = useParams();
  const [organizer, setOrganizer] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    (async () => {
      try {
        const organizerData = await api.get(`/api/auth/organizers/${id}/`);
        const allEvents = await fetchOrganizerEvents(id);
        const today = new Date().toISOString().split('T')[0];

        if (isMounted) {
          const joinedYear = organizerData.date_joined
            ? new Date(organizerData.date_joined).getFullYear()
            : new Date().getFullYear();

          setOrganizer({
            id: organizerData.id,
            name: `${organizerData.first_name} ${organizerData.last_name}`,
            bio: organizerData.organizer_profile?.organization_bio || '',
            brandColor: organizerData.organizer_profile?.brand_color || '#02338D',
            location: '',
            website: organizerData.organizer_profile?.website || '',
            social: {
              twitter: organizerData.organizer_profile?.twitter || '',
              linkedin: organizerData.organizer_profile?.linkedin || '',
              instagram: organizerData.organizer_profile?.instagram || '',
            },
            totalEvents: organizerData.organizer_profile?.total_events || 0,
            totalAttendees: organizerData.organizer_profile?.total_attendees || 0,
            memberSince: joinedYear,
            avatar: organizerData.organizer_profile?.logo || organizerData.avatar || '',
          });

          setUpcomingEvents(allEvents.filter((e) => e.date >= today));
          setPastEvents(allEvents.filter((e) => e.date < today));
        }
      } catch (e) {
        console.error('Failed to load organizer', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="animate-pulse">
          <div className="h-64 bg-[#E2E8F0]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="h-32 bg-[#E2E8F0] rounded-2xl -mt-20 mb-8" />
            <div className="h-8 bg-[#E2E8F0] rounded w-1/3 mb-4" />
            <div className="h-4 bg-[#E2E8F0] rounded w-1/2" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!organizer) {
    return (
      <PageWrapper>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-4">Organizer Not Found</h1>
          <p className="text-[#64748B] mb-6">The organizer you're looking for doesn't exist.</p>
          <Link to="/events">
            <button className="px-6 py-3 bg-[#02338D] text-white rounded-lg hover:bg-[#022A78]">
              Browse Events
            </button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const tabContent = [
    {
      label: `Upcoming Events (${upcomingEvents.length})`,
      content: (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
              <p className="text-[#64748B]">No upcoming events</p>
            </div>
          )}
        </motion.div>
      ),
    },
    {
      label: `Past Events (${pastEvents.length})`,
      content: (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {pastEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
              <p className="text-[#64748B]">No past events</p>
            </div>
          )}
        </motion.div>
      ),
    },
  ];

  return (
    <PageWrapper>
      {/* Hero Banner */}
      <div
        className="h-48 md:h-64"
        style={{
          background: `linear-gradient(135deg, ${organizer.brandColor}, ${organizer.brandColor}dd)`
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="relative -mt-20 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              <CustomAvatar
                src={organizer.avatar}
                name={organizer.name}
                size="xl"
                fallbackColor={organizer.brandColor}
                className="w-24 h-24 md:w-32 md:h-32 text-3xl"
              />

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-2">
                  {organizer.name}
                </h1>

                <p className="text-[#64748B] mb-4 max-w-2xl">
                  {organizer.bio}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-[#64748B]">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {organizer.location}
                  </div>
                  {organizer.website && (
                    <a
                      href={organizer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#02338D] hover:underline"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Website
                    </a>
                  )}
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-3 mt-4">
                  {organizer.social?.twitter && (
                    <a
                      href={`https://twitter.com/${organizer.social.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:bg-[#1DA1F2] hover:text-white transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {organizer.social?.linkedin && (
                    <a
                      href={`https://linkedin.com/in/${organizer.social.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:bg-[#0A66C2] hover:text-white transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {organizer.social?.instagram && (
                    <a
                      href={`https://instagram.com/${organizer.social.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-[#F1F5F9] text-[#64748B] hover:bg-[#E4405F] hover:text-white transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex md:flex-col gap-6 md:gap-4 md:text-right">
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{organizer.totalEvents}</p>
                  <p className="text-sm text-[#64748B]">Events</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{organizer.totalAttendees.toLocaleString()}</p>
                  <p className="text-sm text-[#64748B]">Attendees</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{organizer.memberSince}</p>
                  <p className="text-sm text-[#64748B]">Member Since</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Events Tabs */}
        <div className="mb-12">
          <CustomTabs
            tabs={tabContent}
            defaultTab={0}
            onChange={setActiveTab}
          />
        </div>
      </div>
    </PageWrapper>
  );
};

export default OrganizerProfilePage;


