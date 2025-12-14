import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Users, Clock, DollarSign, ArrowLeft, UserCheck, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { PostWithTranslations } from '@shared/schema';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslationSafe, getEventMeta } from '@/lib/postHelpers';
import { deletePost } from '@/lib/adminPostApi';
import ShareButtons from '@/components/ShareButtons';

export default function EventDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language } = useLanguage();

  const { data: post, isLoading } = useQuery<PostWithTranslations>({
    queryKey: ['/api/posts', id],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${id}`);
      if (!response.ok) throw new Error('Failed to fetch post');
      return response.json();
    },
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/posts/${id}/register`, {
        attendeeName: user?.name || '',
        attendeeEmail: user?.email || '',
        attendeePhone: '',
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "행사 신청 완료",
        description: "행사 신청이 성공적으로 완료되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts', id] });
    },
    onError: (error: any) => {
      toast({
        title: "신청 실패",
        description: error.message || "행사 신청 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(id!),
    onSuccess: () => {
      toast({
        title: "삭제 완료",
        description: "행사가 성공적으로 삭제되었습니다.",
      });
      // Invalidate all posts-related queries (list + detail + admin)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === '/api/posts';
        }
      });
      navigate('/events');
    },
    onError: (error: Error) => {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    navigate(`/admin?tab=events&edit=${id}`);
  };

  const handleDelete = () => {
    if (confirm('정말로 이 행사를 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  };

  const handleRegister = () => {
    if (!isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "행사 신청을 위해 로그인해주세요.",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">행사를 찾을 수 없습니다</h1>
          <Button onClick={() => navigate('/events')} data-testid="button-back-to-events">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const translation = getTranslationSafe(post, language);
  const eventMeta = getEventMeta(post);
  
  const now = new Date();
  const isPastEvent = eventMeta.eventDate ? eventMeta.eventDate < now : false;
  const isRegistrationClosed = eventMeta.registrationDeadline 
    ? eventMeta.registrationDeadline < now
    : false;
  const canRegister = !isPastEvent && !isRegistrationClosed;

  const getCategoryBadge = (category: string) => {
    const badgeMap = {
      networking: { variant: 'secondary' as const, label: t('events.categories.networking') },
      seminar: { variant: 'default' as const, label: t('events.categories.seminar') },
      workshop: { variant: 'outline' as const, label: t('events.categories.workshop') },
      cultural: { variant: 'secondary' as const, label: t('events.categories.cultural') },
    };
    
    const config = badgeMap[category as keyof typeof badgeMap] || { variant: 'outline' as const, label: category };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-muted py-8">
        <div className="container">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/events')} 
              className="mb-4"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  data-testid="button-edit-event"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-event"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container max-w-4xl">
          {/* Title and Category */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-4" data-testid="text-event-title">{translation.title || post.slug}</h1>
                <div className="flex gap-2 flex-wrap">
                  {eventMeta.category && getCategoryBadge(eventMeta.category)}
                  {eventMeta.eventType && (
                    <Badge variant="outline">
                      {eventMeta.eventType === 'online' ? '온라인' : eventMeta.eventType === 'offline' ? '오프라인' : '하이브리드'}
                    </Badge>
                  )}
                  {isPastEvent && <Badge variant="secondary">종료된 행사</Badge>}
                  {isRegistrationClosed && !isPastEvent && <Badge variant="destructive">신청 마감</Badge>}
                </div>
              </div>
              <div className="ml-4">
                <ShareButtons 
                  url={`/events/${id}`}
                  title={translation.title || post.slug}
                  description={translation.excerpt || translation.subtitle || ''}
                />
              </div>
            </div>
            <p className="text-xl text-muted-foreground" data-testid="text-event-description">{translation.excerpt || translation.subtitle || ''}</p>
          </div>

          {/* Images */}
          {eventMeta.images && eventMeta.images.length > 0 && (
            <div className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eventMeta.images.map((image: string, index: number) => (
                  <div
                    key={index}
                    className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden"
                    style={{ minHeight: '256px' }}
                  >
                    <img
                      src={image}
                      alt={`${translation.title || post.slug} 이미지 ${index + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                      data-testid={`img-event-${index}`}
                      onError={(e) => {
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.opacity = '0.5';
                      }}
                    />
                    {!image && (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        이미지를 불러올 수 없습니다
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {eventMeta.eventDate && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Calendar className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">일시</h3>
                      <p className="text-muted-foreground" data-testid="text-event-date">
                        {eventMeta.eventDate.toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-muted-foreground">
                        {eventMeta.eventDate.toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {eventMeta.location && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <MapPin className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">장소</h3>
                      <p className="text-muted-foreground" data-testid="text-event-location">{eventMeta.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {eventMeta.capacity && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Users className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">정원</h3>
                      <p className="text-muted-foreground" data-testid="text-event-capacity">{eventMeta.capacity}명</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {eventMeta.fee !== undefined && eventMeta.fee !== null && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <DollarSign className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">참가비</h3>
                      <p className="text-muted-foreground" data-testid="text-event-fee">
                        {eventMeta.fee === 0 ? '무료' : `${eventMeta.fee.toLocaleString()}원`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {eventMeta.registrationDeadline && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Clock className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-1">신청 마감</h3>
                      <p className="text-muted-foreground">
                        {eventMeta.registrationDeadline.toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Content */}
          {translation.content && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">상세 내용</h3>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-muted-foreground" data-testid="text-event-content">
                    {translation.content}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Speakers */}
          {eventMeta.speakers && eventMeta.speakers.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">연사</h3>
                <div className="space-y-2">
                  {eventMeta.speakers.map((speaker: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      <span>{typeof speaker === 'string' ? speaker : speaker.name || ''}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Registration Button */}
          {canRegister && (
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">이 행사에 참여하시겠습니까?</h3>
                    <p className="text-muted-foreground">
                      {isAuthenticated ? '아래 버튼을 클릭하여 신청하세요' : '로그인이 필요합니다'}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleRegister}
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? '신청 중...' : '행사 신청'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isPastEvent && (
            <Card className="border-secondary">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">이 행사는 종료되었습니다</p>
              </CardContent>
            </Card>
          )}

          {isRegistrationClosed && !isPastEvent && (
            <Card className="border-destructive">
              <CardContent className="p-6 text-center">
                <p className="text-destructive">신청 기간이 마감되었습니다</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
