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
import { cn } from '@/lib/utils';

const formatMoney = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;

const getStatusColor = (status) => {
  switch (status) {
    case 'live':
      return 'bg-green-500 text-white';
    case 'upcoming':
      return 'bg-[#C58B1A]/20 text-[#1E4DB7]';
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
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  onCheckInEvent,
  showSearch = true,
  showStatusFilter = true,
  showCategoryFilter = true,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx} className="overflow-hidden animate-pulse">
          <div className="h-40 lg:h-48 bg-gray-200" />
          <CardContent className="p-4 lg:p-5 space-y-3">
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
    <div className="space-y-4 lg:space-y-6">
      {(showSearch || showStatusFilter || showCategoryFilter) && (
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
              {showSearch && (
                <div className="relative min-w-[200px] flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-[200px]"
                  />
                </div>
              )}
              {showStatusFilter && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="min-w-[140px] flex-shrink-0">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {showCategoryFilter && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="min-w-[150px] flex-shrink-0">
                    <Calendar className="w-4 h-4 mr-2" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {filteredEvents.map((event) => (
          <Card
            key={event.id}
            className="pressable-card overflow-hidden group cursor-pointer"
            onClick={() => onEventClick(event)}
          >
            <div className="relative h-40 lg:h-48 overflow-hidden">
              {event.image ? (
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED] flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-white/70" />
                </div>
              )}
              <div className="absolute top-2 lg:top-3 left-2 lg:left-3">
                <Badge className={cn('capitalize text-xs bg-white text-[#1E4DB7] border border-[#E2E8F0]')}>{event.status}</Badge>
              </div>
              <div className="absolute top-2 lg:top-3 right-2 lg:right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1.5 lg:p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
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
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEditEvent) onEditEvent(event);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600"
                      onClick={(e) => handleDeleteClick(event, e)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <CardContent className="p-4 lg:p-5">
              <h3 className="font-bold text-base lg:text-lg text-[#0F172A] mb-2 group-hover:text-[#C58B1A] transition-colors line-clamp-1">
                {event.name}
              </h3>

              <div className="space-y-1 lg:space-y-2 mb-3 lg:mb-4">
                <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-500">
                  <Calendar className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span>{event.date} {event.time ? `at ${event.time}` : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span className="line-clamp-1">{event.location || 'Online'}</span>
                </div>
              </div>

              <div className="mb-3 lg:mb-4">
                <div className="flex items-center justify-between text-xs lg:text-sm mb-1">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    Tickets Sold
                  </span>
                  <span className="font-medium text-[#0F172A]">
                    {event.ticketsSold}/{event.totalTickets || 0}
                  </span>
                </div>
                <div className="h-1.5 lg:h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1E4DB7] to-[#C58B1A] rounded-full transition-all duration-500"
                    style={{
                      width: event.totalTickets ? `${(event.ticketsSold / event.totalTickets) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 lg:pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#C58B1A]" />
                  <span className="font-bold text-[#0F172A] text-sm lg:text-base">
                    {formatMoney(event.revenue)}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {event.category || 'General'}
                </Badge>
              </div>
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
          <h3 className="text-base lg:text-lg font-medium text-gray-700 mb-2">No events found</h3>
          <p className="text-sm text-gray-500 mb-4">Try adjusting your filters or create a new event</p>
          <Button onClick={onCreateEvent} className="bg-[#C58B1A] text-white hover:bg-[#A56F14]">
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
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
