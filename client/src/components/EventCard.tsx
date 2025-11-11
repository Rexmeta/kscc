import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, ArrowRight } from 'lucide-react';
import { Event } from '@shared/schema';
import { useLocation } from 'wouter';
import { t } from '@/lib/i18n';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const [, navigate] = useLocation();

  const getCategoryBadge = (category: string) => {
    const badgeMap = {
      networking: { variant: 'secondary' as const, label: t('events.categories.networking') },
      seminar: { variant: 'default' as const, label: t('events.categories.seminar') },
      workshop: { variant: 'outline' as const, label: t('events.categories.workshop') },
      cultural: { variant: 'secondary' as const, label: t('events.categories.cultural') },
    };
    
    const config = badgeMap[category as keyof typeof badgeMap] || { variant: 'outline' as const, label: category };
    return <Badge variant={config.variant} className="badge-accent">{config.label}</Badge>;
  };

  const getTypeBadge = (eventType: string) => {
    const typeMap = {
      offline: { variant: 'default' as const, label: t('events.type.offline') },
      online: { variant: 'secondary' as const, label: t('events.type.online') },
      hybrid: { variant: 'outline' as const, label: t('events.type.hybrid') },
    };
    
    const config = typeMap[eventType as keyof typeof typeMap] || { variant: 'outline' as const, label: eventType };
    return <Badge variant={config.variant} className="badge-primary">{config.label}</Badge>;
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTime = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = new Date(event.eventDate) > new Date();
  const isPast = new Date(event.eventDate) < new Date();

  return (
    <Card className="card-hover border border-border" data-testid={`event-card-${event.id}`}>
      {event.images && Array.isArray(event.images) && event.images.length > 0 ? (
        <img
          src={event.images[0]}
          alt={event.title}
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
            {getCategoryBadge(event.category)}
            {getTypeBadge(event.eventType)}
          </div>
          {event.capacity && (
            <span className="text-xs text-muted-foreground">
              정원: {event.capacity}명
            </span>
          )}
        </div>
        
        {/* Event Title */}
        <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2" data-testid={`event-title-${event.id}`}>
          {event.title}
        </h3>
        
        {/* Event Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {event.description}
        </p>
        
        {/* Event Details */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span data-testid={`event-date-${event.id}`}>
              {formatDate(event.eventDate)} {formatTime(event.eventDate)}
              {event.endDate && ` - ${formatTime(event.endDate)}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span data-testid={`event-location-${event.id}`}>{event.location}</span>
          </div>
          {event.fee !== undefined && event.fee !== null && event.fee > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-primary font-medium">참가비:</span>
              <span>{event.fee.toLocaleString()}원</span>
            </div>
          )}
        </div>
        
        {/* Speakers */}
        {event.speakers && (event.speakers as any[]).length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-foreground mb-2">연사</h4>
            <div className="flex flex-wrap gap-2">
              {(event.speakers as any[]).map((speaker, index) => (
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
          ) : event.registrationDeadline && new Date(event.registrationDeadline) < new Date() ? (
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
          onClick={() => navigate(`/events/${event.id}`)}
          data-testid={`button-view-event-${event.id}`}
        >
          자세히 보기
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
