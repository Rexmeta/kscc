import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { PostWithTranslations } from '@shared/schema';
import { getMetaValue } from '@/lib/postHelpers';

interface Registration {
  id: string;
  status: string;
  createdAt: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  user?: {
    name: string;
    email: string;
  };
}

export function EventRegistrationsDialog({
  open,
  onOpenChange,
  event
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: PostWithTranslations;
}) {
  const { data: registrations, isLoading } = useQuery<Registration[]>({
    queryKey: ['/api/posts', event?.id, 'registrations'],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${event.id}/registrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: !!event?.id && open,
  });

  const capacityMeta = getMetaValue(event.meta || [], 'event.capacity');
  const capacity = capacityMeta ? Number(capacityMeta) : undefined;
  const eventTitle = event.translations?.[0]?.title || '행사';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>행사 신청자 목록 - {eventTitle}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">로딩 중...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">총 신청자: {registrations?.length || 0}명</span>
              {capacity && (
                <span className="text-muted-foreground">
                  정원: {capacity}명 (잔여: {capacity - (registrations?.length || 0)}명)
                </span>
              )}
            </div>

            <div className="border rounded-lg divide-y">
              {registrations && registrations.length > 0 ? (
                registrations.map((registration, index) => (
                  <div
                    key={registration.id}
                    className="p-4 flex justify-between items-center"
                    data-testid={`registration-item-${index}`}
                  >
                    <div>
                      <div className="font-medium" data-testid={`registration-name-${index}`}>
                        {registration.user?.name || registration.attendeeName || '이름 없음'}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`registration-email-${index}`}>
                        {registration.user?.email || registration.attendeeEmail || '이메일 없음'}
                      </div>
                      {registration.attendeePhone && (
                        <div className="text-sm text-muted-foreground">
                          {registration.attendeePhone}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        registration.status === 'confirmed' ? 'default' :
                        registration.status === 'pending' ? 'secondary' : 'outline'
                      }>
                        {registration.status === 'confirmed' ? '확정' :
                         registration.status === 'pending' ? '대기' : '취소'}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(registration.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  아직 신청자가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
