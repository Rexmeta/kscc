import type { MouseEvent } from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatLocalizedDate } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackEvent } from '@/lib/analytics';
import type { HomeContent } from '@shared/homeContent';
import type { HomeSurvey } from '@/lib/homeParticipation';

interface SurveyCardProps {
  survey: HomeSurvey;
  isAuthenticated: boolean;
  content: HomeContent['surveys'];
  onLoginRequired: (event: MouseEvent<HTMLButtonElement>) => void;
  trackingLocation: string;
  testIdPrefix?: string;
}

export default function SurveyCard({
  survey,
  isAuthenticated,
  content,
  onLoginRequired,
  trackingLocation,
  testIdPrefix = 'button-survey',
}: SurveyCardProps) {
  const { language } = useLanguage();

  const formatDateTime = (date?: string | Date | null) => {
    if (!date) return '';
    const value = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(value.getTime())) return '';
    return formatLocalizedDate(value, language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="card-hover flex h-full min-h-0 flex-col">
      <CardContent className="flex h-full min-h-0 flex-1 flex-col p-6">
        <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardList className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">{survey.title}</h3>
        <p className="mt-3 flex-1 text-muted-foreground">{survey.description}</p>
        {(survey.startsAt || survey.endsAt) && (
          <p className="mt-4 text-sm text-muted-foreground">
            {content.period}: {formatDateTime(survey.startsAt)} ~ {formatDateTime(survey.endsAt)}
          </p>
        )}
        {isAuthenticated && survey.externalUrl ? (
          <Button asChild className="btn-accent mt-6 w-full">
            <a
              href={survey.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`${testIdPrefix}-${survey.id}`}
              onClick={() => trackEvent('survey_link_clicked', { location: trackingLocation })}
            >
              {content.participate}
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button
            className="btn-accent mt-6 w-full"
            data-testid={`${testIdPrefix}-${survey.id}`}
            onClick={onLoginRequired}
          >
            {content.participate}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}