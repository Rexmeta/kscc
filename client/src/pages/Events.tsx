import { useState, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, RefreshCw, Plus } from 'lucide-react';
import { t } from '@/lib/i18n';
import { PostWithTranslations } from '@shared/schema';
import EventCard from '@/components/EventCard';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { queryKeys } from '@/lib/queryClient';
import { fetchJson } from '@/lib/queryClient';
import { QueryState } from '@/components/QueryState';
import { PagePagination } from '@/components/PagePagination';
import LoginRequiredDialog from '@/components/LoginRequiredDialog';
import SurveyCard from '@/components/SurveyCard';
import {
  getHomeParticipationTimestamp,
  sortHomeParticipationItems,
  type HomeSurvey,
} from '@/lib/homeParticipation';
import { getEventMeta } from '@/lib/postHelpers';

export default function EventsPage() {
  const { hasPermission, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [categoryInput, setCategoryInput] = useState('');
  const [upcomingInput, setUpcomingInput] = useState('');
  const [category, setCategory] = useState('');
  const [upcoming, setUpcoming] = useState('');
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);
  const limit = 9;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.posts.list({ postType: 'event', page, category, upcoming, limit, language }),
    queryFn: async ({ signal }) => {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({
        postType: 'event',
        status: 'published',
        offset: offset.toString(),
        limit: limit.toString(),
        locale: language,
        compact: 'true',
        ...(category && { tags: category }),
        ...(upcoming === 'true' && { upcoming: 'true' }),
      });
       return fetchJson<{ posts: PostWithTranslations[]; total: number }>(`/api/posts?${params}`, { signal });
    },
    staleTime: 2 * 60 * 1000,
  });

  const {
    data: surveysData,
    isLoading: surveysLoading,
    isError: surveysError,
    refetch: refetchSurveys,
  } = useQuery<HomeSurvey[]>({
    queryKey: ['/api/surveys', 'events-page', isAuthenticated ? 'authenticated' : 'public'],
    queryFn: ({ signal }) => fetchJson<HomeSurvey[]>('/api/surveys', { signal }),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });

  const events = data?.posts || [];
  const surveys = surveysData || [];
  const totalPages = Math.ceil((data?.total || 0) / limit) || 1;
  const participationItems = sortHomeParticipationItems([
    ...events.map((post: PostWithTranslations, stableIndex) => ({
      kind: 'event' as const,
      id: `event-${post.id}`,
      post,
      sortTimestamp: getHomeParticipationTimestamp(getEventMeta(post).eventDate),
      stableIndex,
    })),
    ...surveys.map((survey, index) => ({
      kind: 'survey' as const,
      id: `survey-${survey.id}`,
      survey,
      sortTimestamp: getHomeParticipationTimestamp(survey.startsAt),
      stableIndex: events.length + index,
    })),
  ]);
  const participationLoading = participationItems.length === 0
    && (isLoading || surveysLoading);
  const participationError = participationItems.length === 0
    && !participationLoading
    && (isError || surveysError);

  const handleSurveyLoginRequired = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setLoginRequiredOpen(true);
  };

  const goToLogin = () => {
    setLoginRequiredOpen(false);
    setLocation('/login');
  };

  const handleFilter = () => {
    setPage(1);
    setCategory(categoryInput);
    setUpcoming(upcomingInput);
  };

  const handleReset = () => {
    setCategoryInput('');
    setUpcomingInput('');
    setCategory('');
    setUpcoming('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Header */}
       <section className="page-banner bg-muted dark:bg-muted">
        <div className="container">
          <div className="text-center">
             <h1 className="mb-2 text-2xl font-bold text-foreground dark:text-foreground sm:mb-4 sm:text-4xl">{t('events.title')}</h1>
             <p className="text-sm text-muted-foreground dark:text-muted-foreground sm:text-lg">{t('events.subtitle')}</p>
          </div>
        </div>
      </section>

      {/* Filter */}
       <section className="page-filter border-b border-border dark:border-border">
        <div className="container">
           <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
             <h2 className="text-xl font-semibold text-foreground dark:text-foreground sm:text-2xl">행사 목록</h2>
            {hasPermission('event.create') && (
              <Button asChild data-testid="button-create-event">
                <Link href="/admin?tab=events">
                  <Plus className="h-4 w-4 mr-2" />
                  행사 등록
                </Link>
              </Button>
            )}
          </div>
            <Card className="page-filter-card">
             <div className="grid gap-2 sm:gap-4 md:grid-cols-4">
               <Select value={upcomingInput || "all"} onValueChange={(value) => setUpcomingInput(value === "all" ? "" : value)}>
                 <SelectTrigger className="page-filter-control" data-testid="select-time">
                  <SelectValue placeholder="시간 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">예정된 행사</SelectItem>
                  <SelectItem value="all">모든 행사</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryInput || "all"} onValueChange={(value) => setCategoryInput(value === "all" ? "" : value)}>
               <SelectTrigger className="page-filter-control" data-testid="select-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="networking">{t('events.categories.networking')}</SelectItem>
                  <SelectItem value="seminar">{t('events.categories.seminar')}</SelectItem>
                  <SelectItem value="workshop">{t('events.categories.workshop')}</SelectItem>
                  <SelectItem value="cultural">{t('events.categories.cultural')}</SelectItem>
                </SelectContent>
              </Select>
              
               <div className="flex gap-2 md:col-span-2">
                 <Button className="page-filter-control flex-1 px-3" onClick={handleFilter} data-testid="button-filter">
                  <Filter className="h-4 w-4" />
                  필터 적용
                </Button>
                  <Button className="page-filter-control flex-1 px-3" variant="outline" onClick={handleReset} data-testid="button-reset">
                  <RefreshCw className="h-4 w-4" />
                  초기화
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Events and surveys */}
      <section
        className="section-surface-survey border-b border-border/60 py-8 sm:py-12"
        data-testid="events-surveys-section"
        data-section="events-surveys"
      >
        <div className="container min-w-0">
          <div className="mb-8 flex flex-col items-start gap-2">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              {t('events.title')} · {t('home.surveys.title')}
            </h2>
            <p className="text-muted-foreground">
              {t('events.subtitle')} · {t('home.surveys.subtitle')}
            </p>
          </div>
          <QueryState
            isLoading={participationLoading}
            isError={participationError}
            onRetry={() => {
              if (isError) void refetch();
              if (surveysError) void refetchSurveys();
            }}
            empty={participationItems.length === 0}
            emptyMessage={t('home.events.empty')}
          >
            <>
              <div className="home-participation-grid grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
                {participationItems.map((item) => (
                  <div key={item.id} className="min-h-0 h-full">
                    {item.kind === 'event' ? (
                      <EventCard post={item.post} />
                    ) : (
                      <SurveyCard
                        survey={item.survey}
                        isAuthenticated={isAuthenticated}
                        content={{
                          title: t('home.surveys.title'),
                          subtitle: t('home.surveys.subtitle'),
                          period: t('home.surveys.period'),
                          participate: t('home.surveys.participate'),
                        }}
                        onLoginRequired={handleSurveyLoginRequired}
                        trackingLocation="events_survey_section"
                        testIdPrefix="button-events-survey"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination applies to events; survey cards remain in the shared section. */}
              <PagePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          </QueryState>
        </div>
      </section>
      <LoginRequiredDialog
        open={loginRequiredOpen}
        onOpenChange={setLoginRequiredOpen}
        onLogin={goToLogin}
        title="로그인이 필요한 서비스입니다"
        description="설문 참여는 로그인 후에 사용할 수 있습니다."
      />
    </div>
  );
}
