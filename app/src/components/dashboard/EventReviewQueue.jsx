import React from 'react';
import { Calendar, Clock3, Eye, MapPin, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { capEventLocation, capEventTitle } from '@/lib/eventText';
import { richTextToPlainText } from '@/lib/richText';

const formatDateTime = (value) => {
  if (!value) return 'Not submitted yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not submitted yet';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatEventDate = (value) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const EventReviewQueue = ({ events, isLoading = false, onReviewEvent }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-10 bg-gray-200 rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF]">
            <Eye className="h-8 w-8 text-[#02338D]" />
          </div>
          <h3 className="text-lg font-semibold text-[#0F172A]">No pending reviews</h3>
          <p className="mt-2 text-sm text-[#64748B]">
            New event submissions will appear here for approval before they go live.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Event Review Queue</h2>
          <p className="text-sm text-[#64748B]">
            Review each submission exactly as it will appear on the event page before publishing it.
          </p>
        </div>
        <Badge className="bg-[#02338D] text-white hover:bg-[#02338D]">
          {events.length} pending
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {events.map((event) => (
          <Card key={event.slug || event.id} className="border border-[#E2E8F0] shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <Badge variant="outline" className="capitalize border-[#C58B1A]/30 text-[#8A620E] bg-[#FFF7E6]">
                    {event.status || 'pending'}
                  </Badge>
                  <CardTitle className="text-xl text-[#0F172A]" title={event.name}>{capEventTitle(event.name, 'Untitled Event')}</CardTitle>
                </div>
                <Button
                  type="button"
                  onClick={() => onReviewEvent?.(event)}
                  className="bg-[#02338D] hover:bg-[#022A78]"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm text-[#475569] sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-[#64748B]" />
                  <span>{event.organizer?.name || 'Organizer'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-[#64748B]" />
                  <span>{formatDateTime(event.approvalRequestedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#64748B]" />
                  <span>{formatEventDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#64748B]" />
                  <span title={event.location || 'Location TBA'}>{capEventLocation(event.location, 'Location TBA')}</span>
                </div>
              </div>

              {event.description ? (
                <p className="text-sm text-[#64748B] line-clamp-3">{richTextToPlainText(event.description)}</p>
              ) : (
                <p className="text-sm text-[#94A3B8]">No description provided yet.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventReviewQueue;
