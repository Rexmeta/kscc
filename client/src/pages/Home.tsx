import { useState, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, ArrowRight, Building, Briefcase, Globe, TrendingUp, ClipboardList } from 'lucide-react';
import { formatLocalizedDate } from '@/lib/i18n';
import { Partner, PostWithTranslations } from '@shared/schema';
import { parseHomeTranslation, type HomeLocale } from '@shared/homeContent';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { getEventMeta, getTranslationSafe, getMetaValue } from '@/lib/postHelpers';
import { queryKeys, fetchJson } from '@/lib/queryClient';
import { QueryState } from '@/components/QueryState';
import { trackEvent } from '@/lib/analytics';
import EventCard from '@/components/EventCard';
import NewsCard from '@/components/NewsCard';
import { fetchPublicPartners } from '@/lib/publicPartners';
import { shouldRenderUpcomingEvents } from '@/lib/homeUpcomingEvents';
import LoginRequiredDialog from '@/components/LoginRequiredDialog';
import {
  getHomeParticipationTimestamp,
  sortHomeParticipationItems,
  type HomeSurvey,
} from '@/lib/homeParticipation';

export default function Home() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);

  const { data: homePage } = useQuery<PostWithTranslations>({
    queryKey: queryKeys.posts.home(language),
    queryFn: ({ signal }) => fetchJson<PostWithTranslations>(
      `/api/posts/slug/home?locale=${language}`,
      { signal },
    ),
    staleTime: 60 * 1000,
  });

  // The API returns the requested locale and its fallback translations. Keep
  // this selection local to the home page so a missing or malformed CMS
  // record can never prevent the rest of the homepage from rendering.
  const homeTranslation = homePage?.translations?.find((translation) => translation.locale === language)
    || homePage?.translations?.find((translation) => translation.locale === 'ko')
    || homePage?.translations?.[0];
  const homeContent = parseHomeTranslation(
    homeTranslation,
    language as HomeLocale,
  );

  const formatDate = (date?: string | Date | null) => {
    if (!date) return '';
    const value = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(value.getTime())) return '';
    return formatLocalizedDate(value, language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

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

  // Fetch upcoming events
  const { data: eventsData, isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } = useQuery({
    queryKey: queryKeys.posts.list({ postType: 'event', upcoming: true, includeUndated: true, limit: 3, language }),
    queryFn: async ({ signal }) => {
      return fetchJson<{ posts: PostWithTranslations[] }>(`/api/posts?postType=event&status=published&upcoming=true&includeUndated=true&limit=3&locale=${language}&compact=true`, { signal });
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch latest news
  const { data: newsData, isLoading: newsLoading, isError: newsError, refetch: refetchNews } = useQuery({
    queryKey: queryKeys.posts.list({ postType: 'news', limit: 3, language }),
    queryFn: async ({ signal }) => {
      return fetchJson<{ posts: PostWithTranslations[] }>(`/api/posts?postType=news&status=published&limit=3&locale=${language}&compact=true`, { signal });
    },
    staleTime: 2 * 60 * 1000,
  });

  // Public partners are served active-only by the API.
  const { data: partnersData, isLoading: partnersLoading, isError: partnersError, refetch: refetchPartners } = useQuery<Partner[]>({
    queryKey: queryKeys.partners.list(),
    queryFn: ({ signal }) => fetchPublicPartners(signal),
    staleTime: 5 * 60 * 1000,
  });

  const { data: membersData } = useQuery({
    queryKey: queryKeys.members.list({ isPublic: true, limit: 1 }),
    queryFn: async ({ signal }) => {
      return fetchJson<{ total: number }>('/api/members?limit=1', { signal });
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: surveysData,
    isLoading: surveysLoading,
    isError: surveysError,
    refetch: refetchSurveys,
  } = useQuery<HomeSurvey[]>({
    queryKey: ['/api/surveys', isAuthenticated ? 'authenticated' : 'public'],
    queryFn: async ({ signal }) => {
      try {
        return await fetchJson<HomeSurvey[]>('/api/surveys', { signal });
      } catch (error: any) {
        if (error?.status === 401 || error?.status === 403) return [];
        throw error;
      }
    },
    // Survey settings change infrequently and are not a live participation
    // counter. Avoid a background request every 30 seconds for every member
    // who leaves the homepage open.
    staleTime: 5 * 60 * 1000,
  });

  const events = eventsData?.posts || [];
  const showUpcomingEvents = shouldRenderUpcomingEvents({
    eventCount: events.length,
    isLoading: eventsLoading,
    isError: eventsError,
  });
  const news = newsData?.posts || [];
  const partners = partnersData || [];
  const surveys = surveysData || [];
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
  const showParticipationSection = showUpcomingEvents
    || surveysLoading
    || surveysError
    || surveys.length > 0;
  const participationLoading = participationItems.length === 0
    && (eventsLoading || surveysLoading);
  const participationError = participationItems.length === 0
    && !participationLoading
    && (eventsError || surveysError);
  const memberCount = membersData?.total || 0;
  const latestNews = news[0];
  const latestNewsTranslation = latestNews ? getTranslationSafe(latestNews, language) : null;
  const latestNewsImages = latestNews ? getMetaValue(latestNews.meta || [], 'news.images') : null;
  const latestNewsImage = latestNews
    ? latestNews.coverImage ||
      (Array.isArray(latestNewsImages) && latestNewsImages.length > 0 ? latestNewsImages[0] : null)
    : null;
  const latestNewsSummary = latestNewsTranslation?.excerpt || latestNewsTranslation?.subtitle || '';
  const latestNewsDate = latestNews?.publishedAt || latestNews?.createdAt;

  const handleSurveyLoginRequired = (event: MouseEvent) => {
    event.preventDefault();
    setLoginRequiredOpen(true);
  };

  const goToLogin = () => {
    setLoginRequiredOpen(false);
    setLocation('/login');
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-overlay"></div>
        
        <div className="container relative z-10 py-16 sm:py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center text-white">
            <h1 className="mb-6 text-3xl font-bold leading-tight sm:text-4xl md:text-6xl fade-in-up">
              {homeContent.hero.title}
            </h1>
            <p className="mb-4 text-base opacity-95 sm:text-xl md:text-2xl lang-en">
              {homeContent.hero.subtitle}
            </p>
            <p className="mb-10 text-base opacity-90 sm:mb-12 sm:text-lg md:text-xl">
              {homeContent.hero.description}
            </p>
            
            {/* CTA Buttons */}
            <div className="mb-12 hidden flex-col justify-center gap-3 sm:mb-16 sm:flex sm:flex-row sm:flex-wrap sm:gap-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="btn-secondary w-full text-base sm:text-lg" data-testid="button-join">
                  <Users className="h-5 w-5" />
                  {homeContent.hero.cta.member}
                </Button>
              </Link>
              <Link href="/events" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full border-white bg-[#ffffff00] text-base text-white hover:bg-white/10 sm:text-lg" data-testid="button-events">
                  <Calendar className="h-5 w-5" />
                  {homeContent.hero.cta.event}
                </Button>
              </Link>
              <Link href="/contact" className="w-full sm:w-auto">
                <Button size="lg" className="btn-accent w-full text-base sm:text-lg" data-testid="button-contact">
                  <Globe className="h-5 w-5" />
                  {homeContent.hero.cta.contact}
                </Button>
              </Link>
            </div>

            {latestNews && (
              <div className="mt-8 hidden rounded-2xl border border-white/15 bg-white/5 p-4 text-left shadow-2xl backdrop-blur-lg sm:mt-12 sm:block sm:p-6">
                <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:gap-6">
                  {latestNewsImage && (
                    <div className="w-full overflow-hidden rounded-xl shadow-lg md:w-5/12">
                      <img
                        src={latestNewsImage}
                        alt={latestNewsTranslation?.title || latestNews.slug}
                        className="h-40 w-full object-cover sm:h-48 md:h-56"
                        width={800}
                        height={448}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                      <Badge variant="secondary" className="bg-white/20 text-white">
                         {homeContent.news.title}
                      </Badge>
                      {latestNewsDate && <span className="text-white/70">{formatDate(latestNewsDate)}</span>}
                    </div>
                    <h3 className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                      {latestNewsTranslation?.title || latestNews.slug}
                    </h3>
                    {latestNewsSummary && (
                      <p className="text-white/80 line-clamp-3 md:line-clamp-2">{latestNewsSummary}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/news/${latestNews.id}`}>
                        <Button size="lg" className="btn-accent w-full sm:w-auto" data-testid="hero-latest-news">
                           {homeContent.news.readMore}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href="/news">
                        <Button
                          size="lg"
                          variant="outline"
                          className="w-full border-white text-white hover:bg-white/10 sm:w-auto"
                          data-testid="hero-view-all-news"
                        >
                           {homeContent.news.viewAll}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Upcoming Events and Active Member Surveys */}
      {showParticipationSection && (
        <section
          className="section-surface-survey py-12 sm:py-16"
          data-testid="home-surveys-section"
          data-section="home-events-surveys"
        >
          <div className="container">
            <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">
                  {homeContent.events.title} · {homeContent.surveys.title}
                </h2>
                <p className="text-muted-foreground">
                  {homeContent.events.subtitle} · {homeContent.surveys.subtitle}
                </p>
              </div>
              <Link href="/events">
                <Button variant="outline" className="w-full sm:w-auto" data-testid="link-all-events">
                  {homeContent.events.viewAll}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {participationItems.length > 0 ? (
              <div className="home-participation-grid grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
                {participationItems.map((item) => (
                  <div key={item.id} className="min-h-0 h-full">
                    {item.kind === 'event' ? (
                      <EventCard post={item.post} />
                    ) : (
                      <Card className="card-hover flex h-full min-h-0 flex-col">
                        <CardContent className="flex h-full min-h-0 flex-1 flex-col p-6">
                          <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <ClipboardList className="h-6 w-6" />
                          </div>
                          <h3 className="text-xl font-semibold text-foreground">{item.survey.title}</h3>
                          <p className="mt-3 flex-1 text-muted-foreground">{item.survey.description}</p>
                          {(item.survey.startsAt || item.survey.endsAt) && (
                            <p className="mt-4 text-sm text-muted-foreground">
                              {homeContent.surveys.period}: {formatDateTime(item.survey.startsAt)} ~ {formatDateTime(item.survey.endsAt)}
                            </p>
                          )}
                          {isAuthenticated && item.survey.externalUrl ? (
                            <Button asChild className="btn-accent mt-6 w-full">
                              <a
                                href={item.survey.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`button-home-survey-${item.survey.id}`}
                                onClick={() => trackEvent('survey_link_clicked', { location: 'home_survey_section' })}
                              >
                                {homeContent.surveys.participate}
                                <ArrowRight className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <Button
                              className="btn-accent mt-6 w-full"
                              data-testid={`button-home-survey-${item.survey.id}`}
                              onClick={handleSurveyLoginRequired}
                            >
                              {homeContent.surveys.participate}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <QueryState
                isLoading={participationLoading}
                isError={participationError}
                onRetry={() => {
                  if (eventsError) void refetchEvents();
                  if (surveysError) void refetchSurveys();
                }}
                empty
                emptyMessage={homeContent.events.empty}
              >
                <div />
              </QueryState>
            )}
          </div>
        </section>
      )}

      {/* Latest News */}
      <section className="bg-muted dark:bg-muted py-12 sm:py-16">
        <div className="container">
          <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">{homeContent.news.title}</h2>
                <p className="text-muted-foreground">{homeContent.news.subtitle}</p>
            </div>
            <Link href="/news">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="link-all-news">
                {homeContent.news.viewAll}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <QueryState
            isLoading={newsLoading}
            isError={newsError}
            onRetry={() => refetchNews()}
            empty={news.length === 0}
             emptyMessage={homeContent.news.empty}
          >
            <div className="grid gap-6 lg:grid-cols-3">
              {news.map((post: PostWithTranslations) => <NewsCard key={post.id} post={post} />)}
            </div>
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

      {/* Partners Grid */}
      <section id="home-partners-section" className="section-surface-partners border-y border-secondary/10 py-10 sm:py-12">
        <div className="container">
          <div className="mx-auto mb-7 max-w-5xl sm:mb-8">
            <div className="grid items-center sm:grid-cols-[1fr_auto_1fr]">
              <h2 className="text-center text-2xl font-bold text-foreground sm:col-start-2 sm:row-start-1 sm:text-3xl">
                {homeContent.partners.title}
              </h2>
              <Link
                href="/partners"
                className="mt-2 shrink-0 justify-self-center sm:col-start-3 sm:row-start-1 sm:mt-0 sm:ml-3 sm:justify-self-start"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-card/70 px-2.5 text-xs"
                  data-testid="link-partner-directory"
                >
                  {homeContent.partners.viewAll}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <p className="mt-1.5 text-center text-sm text-muted-foreground sm:col-span-3 sm:row-start-2 sm:text-base">
                {homeContent.partners.subtitle}
              </p>
            </div>
          </div>
          
          <QueryState
            isLoading={partnersLoading}
            isError={partnersError}
            onRetry={() => refetchPartners()}
            empty={partners.length === 0}
             emptyMessage={homeContent.partners.empty}
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
              {partners.slice(0, 12).map((partner: Partner) => (
                <Card
                  key={partner.id}
                  className="card-hover flex h-20 items-center justify-center border-border/70 bg-card/90 p-3 shadow-none sm:h-24 sm:p-4"
                >
                  <div className="flex w-full items-center justify-center text-center">
                    {partner.logo ? (
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="mx-auto h-10 w-auto max-w-[140px] object-contain sm:h-11"
                        width={160}
                        height={48}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback instanceof HTMLElement) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    {!partner.logo && (
                      <div className="flex flex-col items-center">
                        <Briefcase className="mb-1.5 h-6 w-6 text-muted-foreground" />
                        <span className="line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground">
                          {partner.name}
                        </span>
                      </div>
                    )}
                    {partner.logo && (
                      <div className="hidden flex-col items-center">
                        <Briefcase className="mb-1.5 h-6 w-6 text-muted-foreground" />
                        <span className="line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground">
                          {partner.name}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </QueryState>
        </div>
      </section>

      {/* About Preview */}
      <section className="bg-muted dark:bg-muted py-16 sm:py-20">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center space-x-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                 <span className="text-sm font-medium">{homeContent.about.eyebrow}</span>
              </div>
              
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                {homeContent.about.heading}
              </h2>
              
              <p className="mb-6 text-lg text-muted-foreground">
                {homeContent.about.missionDescription}
              </p>
              
              <div className="mb-8 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <span className="text-xs text-primary-foreground">✓</span>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">{homeContent.about.benefits[0].title}</h4>
                    <p className="text-sm text-muted-foreground">{homeContent.about.benefits[0].description}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <span className="text-xs text-primary-foreground">✓</span>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">{homeContent.about.benefits[1].title}</h4>
                    <p className="text-sm text-muted-foreground">{homeContent.about.benefits[1].description}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <span className="text-xs text-primary-foreground">✓</span>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">{homeContent.about.benefits[2].title}</h4>
                    <p className="text-sm text-muted-foreground">{homeContent.about.benefits[2].description}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/about">
                  <Button data-testid="button-about">
                    {homeContent.about.downloadBrochure}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" data-testid="button-org-chart">
                    {homeContent.about.viewOrgChart}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="overflow-hidden rounded-2xl shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                  alt="Professional business team meeting" 
                  className="h-full w-full object-cover"
                  width={800}
                  height={600}
                  loading="lazy"
                />
              </div>
              
               <div className="absolute bottom-4 left-4 rounded-lg border border-border bg-card p-4 shadow-xl sm:-bottom-6 sm:-left-6 sm:p-6">
                 <div className="mb-1 text-2xl font-bold text-primary sm:text-3xl">{memberCount}+</div>
                <div className="text-sm text-muted-foreground">{homeContent.about.statsMembers}</div>
              </div>
              
               <div className="absolute right-4 top-4 rounded-lg border border-border bg-card p-4 shadow-xl sm:-right-6 sm:-top-6 sm:p-6">
                 <div className="mb-1 text-2xl font-bold text-accent sm:text-3xl">50+</div>
                <div className="text-sm text-muted-foreground">{homeContent.about.statsEvents}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Member Benefits */}
      <section className="bg-background dark:bg-background py-12 sm:py-16">
        <div className="container">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-4 sm:p-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h2 className="mb-4 text-3xl font-bold text-foreground">{homeContent.benefits.title}</h2>
              <p className="mb-8 text-muted-foreground">
                {homeContent.benefits.subtitle}
              </p>
              
              <div className="mb-8 grid gap-4 sm:gap-6 md:grid-cols-3">
                <Card className="border-border p-4 sm:p-6">
                  <Building className="mb-3 h-8 w-8 text-primary mx-auto" />
                  <h4 className="mb-2 font-bold">{homeContent.benefits.cards[0].title}</h4>
                  <p className="text-sm text-muted-foreground">{homeContent.benefits.cards[0].description}</p>
                </Card>
                <Card className="border-border p-4 sm:p-6">
                  <Users className="mb-3 h-8 w-8 text-accent mx-auto" />
                  <h4 className="mb-2 font-bold">{homeContent.benefits.cards[1].title}</h4>
                  <p className="text-sm text-muted-foreground">{homeContent.benefits.cards[1].description}</p>
                </Card>
                <Card className="border-border p-4 sm:p-6">
                  <Calendar className="mb-3 h-8 w-8 text-secondary mx-auto" />
                  <h4 className="mb-2 font-bold">{homeContent.benefits.cards[2].title}</h4>
                  <p className="text-sm text-muted-foreground">{homeContent.benefits.cards[2].description}</p>
                </Card>
              </div>
              
              <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link href="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto" data-testid="button-login">
                    <Users className="h-5 w-5" />
                    {homeContent.benefits.login}
                  </Button>
                </Link>
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="btn-secondary w-full sm:w-auto" data-testid="button-register">
                    <Users className="h-5 w-5" />
                    {homeContent.benefits.register}
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
