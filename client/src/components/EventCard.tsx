import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import { PostWithTranslations } from '@shared/schema';
import { useLocation } from 'wouter';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslationSafe, getEventMeta } from '@/lib/postHelpers';
import { EVENT_TIME_ZONE } from '@shared/eventDateTime';

interface EventCardProps {
  post: PostWithTranslations;
}

export default function EventCard({ post }: EventCardProps) {
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const translation = getTranslationSafe(post, language);
  const eventMeta = getEventMeta(post);

  const getCategoryBadge = (category: string | null) => {
    const badgeMap = {
      networking: { variant: 'secondary' as const, label: t('events.categories.networking') },
      seminar: { variant: 'default' as const, label: t('events.categories.seminar') },
      workshop: { variant: 'outline' as const, label: t('events.categories.workshop') },
      cultural: { variant: 'secondary' as const, label: t('events.categories.cultural') },
    };
    
    const config = category && badgeMap[category as keyof typeof badgeMap] 
      ? badgeMap[category as keyof typeof badgeMap] 
      : { variant: 'outline' as const, label: category || '기타' };
    return <Badge variant={config.variant} className="badge-accent">{config.label}</Badge>;
  };

  const getTypeBadge = (eventType: string | null) => {
    const typeMap = {
      offline: { variant: 'default' as const, label: t('events.type.offline') },
      online: { variant: 'secondary' as const, label: t('events.type.online') },
      hybrid: { variant: 'outline' as const, label: t('events.type.hybrid') },
    };
    
    const config = eventType && typeMap[eventType as keyof typeof typeMap]
      ? typeMap[eventType as keyof typeof typeMap]
      : { variant: 'outline' as const, label: eventType || '기타' };
    return <Badge variant={config.variant} className="badge-primary">{config.label}</Badge>;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      timeZone: EVENT_TIME_ZONE,
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: EVENT_TIME_ZONE,
    });
  };

  // Null-safe computed values
  const now = new Date();
  const isUpcoming = eventMeta.eventDate ? eventMeta.eventDate > now : false;
  const isPast = eventMeta.eventDate ? eventMeta.eventDate < now : false;
  const isRegistrationClosed = eventMeta.registrationDeadline 
    ? eventMeta.registrationDeadline < now 
    : false;
  
  // Image selection: eventMeta.images[0] → post.coverImage → fallback
  const featuredImage = (eventMeta.images && eventMeta.images.length > 0) 
    ? eventMeta.images[0] 
    : post.coverImage;

  return (
    <Card className="card-hover min-w-0 max-w-full overflow-hidden border border-border" data-testid={`event-card-${post.id}`}>
      {featuredImage ? (
        <img
          src={featuredImage}
          alt={translation.title || post.slug}
           className="h-40 w-full rounded-t-lg object-cover sm:h-48"
          width={640}
          height={192}
          loading="lazy"
        />
      ) : (
         <div className="flex h-40 w-full items-center justify-center rounded-t-lg bg-gradient-to-r from-primary/10 to-accent/10 sm:h-48">
          <Calendar className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
      
       <CardContent className="min-w-0 p-3 sm:p-6">
        {/* Event Badges */}
         <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
           <div className="flex min-w-0 flex-wrap gap-1.5">
            {getCategoryBadge(eventMeta.category)}
            {getTypeBadge(eventMeta.eventType)}
          </div>
          {eventMeta.capacity && (
            <span className="min-w-0 max-w-full break-words text-right text-xs text-muted-foreground">
              정원: {eventMeta.capacity}명
            </span>
          )}
        </div>
        
        {/* Event Title */}
        <h3 className="mb-2 min-w-0 text-lg font-bold text-foreground line-clamp-2 sm:text-xl" data-testid={`event-title-${post.id}`}>
          {translation.title || post.slug}
        </h3>
        
        {/* Event Description */}
        <p className="mb-4 min-w-0 text-sm text-muted-foreground line-clamp-2">
          {translation.content || translation.excerpt || ''}
        </p>
        
        {/* Event Details */}
        <div className="mb-4 min-w-0 space-y-2 text-sm">
           <div className="flex min-w-0 items-start gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
             <span className="min-w-0 break-words" data-testid={`event-date-${post.id}`}>
              {eventMeta.eventDate ? (
                <>
                  {formatDate(eventMeta.eventDate)} {formatTime(eventMeta.eventDate)}
                  {eventMeta.endDate && ` - ${formatTime(eventMeta.endDate)}`}
                </>
              ) : (
                '일정 미정'
              )}
            </span>
          </div>
           <div className="flex min-w-0 items-start gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
             <span className="min-w-0 break-words" data-testid={`event-location-${post.id}`}>{eventMeta.location || '장소 미정'}</span>
          </div>
          {eventMeta.fee !== undefined && eventMeta.fee !== null && eventMeta.fee > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-muted-foreground">
              <span className="text-primary font-medium">참가비:</span>
              <span className="break-words">{eventMeta.fee.toLocaleString()}원</span>
            </div>
          )}
        </div>
        
        {/* Speakers */}
        {eventMeta.speakers && Array.isArray(eventMeta.speakers) && eventMeta.speakers.length > 0 && (
          <div className="mb-4 min-w-0">
            <h4 className="text-sm font-medium text-foreground mb-2">연사</h4>
            <div className="flex min-w-0 flex-wrap gap-2">
              {eventMeta.speakers.map((speaker, index) => (
                <Badge key={index} variant="outline" className="max-w-full break-words text-xs">
                  {speaker.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Registration Status */}
        <div className="mb-4">
          {isPast ? (
            <Badge variant="secondary" className="text-xs">
              종료된 행사
            </Badge>
          ) : isRegistrationClosed ? (
            <Badge variant="destructive" className="text-xs">
              신청 마감
            </Badge>
          ) : (
            <Badge variant="default" className="text-xs badge-primary">
              {t('events.register')} 가능
            </Badge>
          )}
        </div>
        
        {/* Action Button */}
        <Button
          className="w-full min-w-0 btn-primary"
          onClick={() => navigate(`/events/${post.id}`)}
          data-testid={`button-view-event-${post.id}`}
        >
          자세히 보기
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
