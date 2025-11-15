import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import { PostWithTranslations } from '@shared/schema';
import { useLocation } from 'wouter';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslationSafe, getEventMeta } from '@/lib/postHelpers';

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
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
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
    <Card className="card-hover border border-border" data-testid={`event-card-${post.id}`}>
      {featuredImage ? (
        <img
          src={featuredImage}
          alt={translation.title || post.slug}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-lg flex items-center justify-center">
          <Calendar className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
      
      <CardContent className="p-6">
        {/* Event Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-2">
            {getCategoryBadge(eventMeta.category)}
            {getTypeBadge(eventMeta.eventType)}
          </div>
          {eventMeta.capacity && (
            <span className="text-xs text-muted-foreground">
              정원: {eventMeta.capacity}명
            </span>
          )}
        </div>
        
        {/* Event Title */}
        <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2" data-testid={`event-title-${post.id}`}>
          {translation.title || post.slug}
        </h3>
        
        {/* Event Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {translation.content || translation.excerpt || ''}
        </p>
        
        {/* Event Details */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span data-testid={`event-date-${post.id}`}>
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span data-testid={`event-location-${post.id}`}>{eventMeta.location || '장소 미정'}</span>
          </div>
          {eventMeta.fee !== undefined && eventMeta.fee !== null && eventMeta.fee > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-primary font-medium">참가비:</span>
              <span>{eventMeta.fee.toLocaleString()}원</span>
            </div>
          )}
        </div>
        
        {/* Speakers */}
        {eventMeta.speakers && Array.isArray(eventMeta.speakers) && eventMeta.speakers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-foreground mb-2">연사</h4>
            <div className="flex flex-wrap gap-2">
              {eventMeta.speakers.map((speaker, index) => (
                <Badge key={index} variant="outline" className="text-xs">
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
          className="w-full btn-primary"
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
