import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, Calendar, MapPin, Users, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getMetaValue } from '@/lib/postHelpers';
import { deletePost } from '@/lib/adminPostApi';
import type { PostWithTranslations } from '@shared/schema';
import { CreateEventDialog } from '../forms/CreateEventDialog';
import { EditEventForm } from '../forms/EditEventForm';
import { EventRegistrationsDialog } from '../forms/EventRegistrationsDialog';
import { useAdminPosts } from '@/hooks/useAdminData';
import { PostPublicationToggle } from '../PostPublicationToggle';
import { QueryState } from '@/components/QueryState';
import { AdminFilterBar } from '../AdminFilterBar';
import { AdminListPagination } from '../AdminListPagination';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatLocalizedDate } from '@/lib/i18n';
import { EVENT_TIME_ZONE } from '@shared/eventDateTime';

interface EventsTabProps {
  activeTab: string;
  createEventDialogOpen: boolean;
  setCreateEventDialogOpen: (open: boolean) => void;
}

export function EventsTab({ activeTab, createEventDialogOpen, setCreateEventDialogOpen }: EventsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, hasPermission } = useAuth();
  const { language } = useLanguage();
  const [selectedEvent, setSelectedEvent] = useState<PostWithTranslations | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filterInput, setFilterInput] = useState({ status: '', category: '', upcoming: '' });
  const [filters, setFilters] = useState({ search: '', status: '', category: '', upcoming: '' });

  const eventsQuery = useAdminPosts('event', activeTab, page, filters);
  const { data: eventsData } = eventsQuery;
  const canCreate = isAdmin || hasPermission('event.create');
  const canUpdate = isAdmin || hasPermission('event.update');
  const canPublish = isAdmin || hasPermission('event.publish');
  const canDelete = isAdmin;
  const canManageAttendees = isAdmin || hasPermission('event.attendee.manage');

  useEffect(() => {
    if (eventsData && eventsData.totalPages > 0 && page > eventsData.totalPages) setPage(eventsData.totalPages);
  }, [eventsData, page]);

  const applyFilters = () => {
    setPage(1);
    setFilters({ ...filterInput, search: searchInput.trim() });
  };
  const resetFilters = () => {
    setSearchInput('');
    setFilterInput({ status: '', category: '', upcoming: '' });
    setFilters({ search: '', status: '', category: '', upcoming: '' });
    setPage(1);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
       return formatLocalizedDate(dateStr, language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
         minute: '2-digit',
         timeZone: EVENT_TIME_ZONE,
      });
    } catch {
      return dateStr;
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/posts' });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
  };

  return (
    <TabsContent value="events" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">행사 관리</h2>
        {canCreate && (
          <>
            <Button onClick={() => setCreateEventDialogOpen(true)} data-testid="button-create-event">
              <Plus className="h-4 w-4 mr-1" />
              행사 생성
            </Button>
            <CreateEventDialog
              onSuccess={invalidate}
              open={createEventDialogOpen}
              onOpenChange={setCreateEventDialogOpen}
            />
          </>
        )}
      </div>
      <AdminFilterBar
        scope="events"
        search={searchInput}
        onSearchChange={setSearchInput}
        onApply={applyFilters}
        onReset={resetFilters}
        searchLabel="행사 검색"
        searchPlaceholder="제목 또는 설명 검색"
        total={eventsData?.total}
        filters={[
          { name: 'status', label: '게시 상태', value: filterInput.status || 'all', onChange: (value) => setFilterInput((f) => ({ ...f, status: value === 'all' ? '' : value })), testId: 'select-event-status-filter', options: [{ value: 'all', label: '전체 상태' }, { value: 'draft', label: '임시저장' }, { value: 'published', label: '게시됨' }, { value: 'archived', label: '보관' }] },
          { name: 'category', label: '분류', value: filterInput.category || 'all', onChange: (value) => setFilterInput((f) => ({ ...f, category: value === 'all' ? '' : value })), testId: 'select-event-category-filter', options: [{ value: 'all', label: '전체 분류' }, { value: 'networking', label: '네트워킹' }, { value: 'seminar', label: '세미나' }, { value: 'conference', label: '컨퍼런스' }, { value: 'workshop', label: '워크샵' }, { value: 'cultural', label: '문화 행사' }] },
          { name: 'upcoming', label: '예정 여부', value: filterInput.upcoming || 'all', onChange: (value) => setFilterInput((f) => ({ ...f, upcoming: value === 'all' ? '' : value })), testId: 'select-event-upcoming-filter', options: [{ value: 'all', label: '전체 행사' }, { value: 'true', label: '예정 행사' }] },
        ]}
      />

      <QueryState
        isLoading={eventsQuery.isLoading}
        isError={eventsQuery.isError}
        onRetry={() => eventsQuery.refetch()}
        empty={!eventsData?.posts?.length}
        emptyMessage="행사가 없습니다."
      >
      <div className="space-y-4">
        {eventsData?.posts?.map((event: PostWithTranslations) => {
          const eventDate = getMetaValue(event.meta || [], 'event.eventDate');
          const eventEndDate = getMetaValue(event.meta || [], 'event.endDate');
          const eventLocation = getMetaValue(event.meta || [], 'event.location');
          const eventCapacity = getMetaValue(event.meta || [], 'event.capacity');

          return (
            <div key={event.id} className="p-4 border rounded flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-medium">{event.translations?.[0]?.title || '제목 없음'}</h4>
                <p className="text-sm text-muted-foreground">{event.translations?.[0]?.excerpt || '설명 없음'}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                  {eventDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(String(eventDate))}
                      {eventEndDate && ` ~ ${formatDate(String(eventEndDate))}`}
                    </span>
                  )}
                  {eventLocation && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {String(eventLocation)}
                    </span>
                  )}
                  {eventCapacity && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      정원 {String(eventCapacity)}명
                    </span>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <PostPublicationToggle
                  post={event}
                  postType="event"
                  canPublish={canPublish}
                />
                {canManageAttendees && <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedEvent(event);
                    setRegistrationsDialogOpen(true);
                  }}
                  data-testid={`button-view-registrations-${event.id}`}
                >
                  <Users className="h-4 w-4" />
                </Button>}
                {canUpdate && <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedEvent(event);
                    setEditDialogOpen(true);
                  }}
                  data-testid={`button-edit-event-${event.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>}
                {canDelete && <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (confirm('정말 이 행사를 삭제하시겠습니까?')) {
                      try {
                        await deletePost(event.id);
                        toast({ title: "행사가 삭제되었습니다" });
                        invalidate();
                      } catch {
                        toast({ title: "삭제 실패", variant: "destructive" });
                      }
                    }
                  }}
                  data-testid={`button-delete-event-${event.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>}
              </div>
            </div>
          );
        })}
      </div>
      </QueryState>
      <AdminListPagination page={eventsData?.page || page} totalPages={eventsData?.totalPages || 0} onPageChange={setPage} testId="pagination-events" />

      {selectedEvent && editDialogOpen && (
        <Dialog open={editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(false)}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>행사 수정</DialogTitle>
            </DialogHeader>
            <EditEventForm
              event={selectedEvent}
              onSuccess={() => {
                setEditDialogOpen(false);
                invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {registrationsDialogOpen && selectedEvent && (
        <EventRegistrationsDialog
          open={registrationsDialogOpen}
          onOpenChange={setRegistrationsDialogOpen}
          event={selectedEvent}
        />
      )}
    </TabsContent>
  );
}
