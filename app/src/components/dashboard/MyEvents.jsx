import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Plus,
  QrCode,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { capEventLocation, capEventTitle } from '@/lib/eventText';
import { cn } from '@/lib/utils';

const formatMoney = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;

const getStatusColor = (status) => {
  switch (status) {
    case 'live':
      return 'bg-green-500 text-white';
    case 'upcoming':
      return 'bg-[#C58B1A]/20 text-[#02338D]';
    case 'completed':
      return 'bg-gray-500 text-white';
    case 'draft':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-500 text-white';
  }
};

const OrganizerMyEvents = ({
  events,
  onEventClick,
  onViewEvent,
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onCheckInEvent,
  headerMessage = '',
  showSearch = true,
  showStatusFilter = true,
  showCategoryFilter = true,
  isLoading = false,
  variant = 'default',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const isCheckinVariant = variant === 'checkin';
  const compactToolbar = true;

  const categories = useMemo(() => {
    const items = events.map((event) => event.category).filter(Boolean);
    return Array.from(new Set(items));
  }, [events]);

  const filteredEvents = events.filter((event) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      event.name.toLowerCase().includes(query) ||
      (event.location || '').toLowerCase().includes(query) ||
      (event.category || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleDeleteClick = (event, e) => {
    e.stopPropagation();
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (eventToDelete && onDeleteEvent) {
      onDeleteEvent(eventToDelete);
    }
    setDeleteDialogOpen(false);
    setEventToDelete(null);
  };

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx} className="overflow-hidden animate-pulse">
          <div className="h-28 lg:h-32 bg-gray-200" />
          <CardContent className="p-2.5 lg:p-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-2 bg-gray-200 rounded w-full" />
            <div className="flex items-center justify-between pt-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className={cn(isCheckinVariant ? 'space-y-2' : 'space-y-3')}>
      {(headerMessage || showSearch || showStatusFilter || showCategoryFilter) && (
        <Card className={cn(compactToolbar && 'border-[#E2E8F0] shadow-none')}>
          <CardContent className={cn(compactToolbar ? 'px-2 py-1' : 'p-3 lg:p-4')}>
            <div className={cn(
              'flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap',
              compactToolbar && 'gap-1',
              compactToolbar && 'pb-0'
            )}>
              {headerMessage && (
                <div className="inline-flex items-center gap-1 text-[11px] text-gray-600 whitespace-nowrap">
                  <QrCode className="w-3 h-3 text-[#C58B1A]" />
                  <span>{headerMessage}</span>
                </div>
              )}
              {showSearch && (
                <div className={cn(
                  'relative flex-shrink-0',
                  compactToolbar ? 'min-w-[150px] flex-1 max-w-[300px]' : 'min-w-[200px]'
                )}>
                  <Search className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400',
                    compactToolbar ? 'left-2 w-3 h-3' : 'w-4 h-4'
                  )} />
                  <Input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      compactToolbar ? 'h-7 text-[11px] pl-7 w-full rounded-md' : 'pl-10 w-[200px]'
                    )}
                  />
                </div>
              )}
              {showStatusFilter && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={cn(
                    'min-w-[140px] flex-shrink-0',
                    compactToolbar && 'h-7 text-[11px] min-w-[98px] rounded-md px-2'
                  )}>
                    <Filter className={cn(compactToolbar ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-2')} />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {showCategoryFilter && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className={cn(
                    'min-w-[150px] flex-shrink-0',
                    compactToolbar && 'h-7 text-[11px] min-w-[104px] rounded-md px-2'
                  )}>
                    <Calendar className={cn(compactToolbar ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-2')} />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? renderSkeletons() : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
        {filteredEvents.map((event) => (
          <Card
            key={event.id}
            className="overflow-hidden group cursor-pointer border border-[#E2E8F0] shadow-sm transition-shadow hover:shadow-md"
            onClick={() => (onEventClick || onViewEvent)?.(event)}
          >
            <div className="relative h-28 lg:h-32 overflow-hidden">
              {event.image ? (
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#02338D] to-[#7C3AED] flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-white/70" />
                </div>
              )}
              <div className="absolute top-1.5 left-1.5">
                <div className="flex flex-col gap-1.5">
                  <Badge className={cn('capitalize text-[10px] bg-white text-[#02338D] border border-[#E2E8F0] h-5 px-1.5')}>{event.status}</Badge>
                  {isCheckinVariant && event.isAssignedCheckinEvent && (
                    <Badge className="text-[10px] bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE] h-5 px-1.5">
                      Assigned For Check-In
                    </Badge>
                  )}
                </div>
              </div>
              <div className="absolute top-1.5 right-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      (onViewEvent || onEventClick)?.(event);
                    }}>
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </DropdownMenuItem>
                    {onCheckInEvent && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCheckInEvent(event);
                        }}
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        Check-in
                      </DropdownMenuItem>
                    )}
                    {!isCheckinVariant && onEditEvent && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditEvent(event);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {!isCheckinVariant && onDeleteEvent && (
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600"
                        onClick={(e) => handleDeleteClick(event, e)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <CardContent className="p-2.5 lg:p-3">
              <h3 className="font-bold text-sm lg:text-base text-[#0F172A] mb-1.5 group-hover:text-[#C58B1A] transition-colors line-clamp-1">
                <span title={event.name}>{capEventTitle(event.name, 'Untitled Event')}</span>
              </h3>

              <div className="space-y-1 mb-2.5">
                <div className="flex items-center gap-1.5 text-[11px] lg:text-xs text-gray-500">
                  <Calendar className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                  <span>{event.date} {event.time ? `at ${event.time}` : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] lg:text-xs text-gray-500">
                  <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                  <span className="line-clamp-1" title={event.location || 'Online'}>{capEventLocation(event.location, 'Online')}</span>
                </div>
              </div>

              {isCheckinVariant ? (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    {event.category || 'General'}
                  </Badge>
                  {onCheckInEvent && (
                    <Button
                      size="sm"
                      className="h-7 px-2 bg-[#02338D] hover:bg-[#022A78] text-white text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckInEvent(event);
                      }}
                    >
                      <QrCode className="w-3 h-3 mr-1" />
                      Open Check-In
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[11px] lg:text-xs mb-1">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                        Tickets Sold
                      </span>
                      <span className="font-medium text-[#0F172A]">
                        {event.ticketsSold}/{event.totalTickets || 0}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#02338D] to-[#C58B1A] rounded-full transition-all duration-500"
                        style={{
                          width: event.totalTickets ? `${(event.ticketsSold / event.totalTickets) * 100}%` : '0%',
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-[#C58B1A]" />
                      <span className="font-bold text-[#0F172A] text-xs lg:text-sm">
                        {formatMoney(event.revenue)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                      {event.category || 'General'}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {!isLoading && filteredEvents.length === 0 && (
        <div className="text-center py-12 lg:py-16">
          <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Calendar className="w-8 h-8 lg:w-10 lg:h-10 text-gray-400" />
          </div>
          <h3 className="text-base lg:text-lg font-medium text-gray-700 mb-2">
            {isCheckinVariant ? 'No check-in events found' : 'No events found'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {isCheckinVariant
              ? 'No events are currently available for check-in.'
              : 'Try adjusting your filters or create a new event'}
          </p>
          {!isCheckinVariant && onCreateEvent && (
            <Button onClick={onCreateEvent} className="bg-[#C58B1A] text-white hover:bg-[#A56F14]">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{eventToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-[#B91C1C] hover:bg-[#991B1B]">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrganizerMyEvents;

