import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, ArrowRight, Building, Briefcase, Globe, TrendingUp, ClipboardList } from 'lucide-react';
import { t, formatLocalizedDate } from '@/lib/i18n';
import { Partner, PostWithTranslations } from '@shared/schema';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { getTranslationSafe, getMetaValue } from '@/lib/postHelpers';
import { queryKeys, fetchJson } from '@/lib/queryClient';
import { QueryState } from '@/components/QueryState';
import { trackEvent } from '@/lib/analytics';
import type { SurveySettings } from '@shared/schema';
import EventCard from '@/components/EventCard';
import NewsCard from '@/components/NewsCard';
import { fetchPublicPartners } from '@/lib/publicPartners';
import { shouldRenderUpcomingEvents } from '@/lib/homeUpcomingEvents';

export default function Home() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();

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
    queryKey: queryKeys.posts.list({ postType: 'event', upcoming: true, limit: 3, language }),
    queryFn: async ({ signal }) => {
      return fetchJson<{ posts: PostWithTranslations[] }>(`/api/posts?postType=event&status=published&upcoming=true&limit=3&locale=${language}&compact=true`, { signal });
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

  const { data: surveysData } = useQuery<Array<Pick<SurveySettings, 'id' | 'title' | 'description' | 'externalUrl' | 'isActive' | 'startsAt' | 'endsAt'>>>({
    queryKey: ['/api/surveys'],
    queryFn: async ({ signal }) => {
      try {
        return await fetchJson<Array<Pick<SurveySettings, 'id' | 'title' | 'description' | 'externalUrl' | 'isActive' | 'startsAt' | 'endsAt'>>>('/api/surveys', { signal });
      } catch (error: any) {
        if (error?.status === 401 || error?.status === 403) return [];
        throw error;
      }
    },
    enabled: isAuthenticated,
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-overlay"></div>
        
        <div className="container relative z-10 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center text-white">
            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl fade-in-up">
              {t('hero.title')}
            </h1>
            <p className="mb-4 text-xl opacity-95 md:text-2xl lang-en">
              {t('hero.subtitle')}
            </p>
            <p className="mb-12 text-lg opacity-90 md:text-xl">
              {t('hero.description')}
            </p>
            
            {/* CTA Buttons */}
            <div className="mb-16 flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="btn-secondary text-lg" data-testid="button-join">
                  <Users className="h-5 w-5" />
                  {t('hero.cta.member')}
                </Button>
              </Link>
              <Link href="/events">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg bg-[#ffffff00]" data-testid="button-events">
                  <Calendar className="h-5 w-5" />
                  {t('hero.cta.event')}
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" className="btn-accent text-lg" data-testid="button-contact">
                  <Globe className="h-5 w-5" />
                  {t('hero.cta.contact')}
                </Button>
              </Link>
            </div>

            {latestNews && (
              <div className="mt-12 rounded-2xl border border-white/15 bg-white/5 p-6 text-left shadow-2xl backdrop-blur-lg">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  {latestNewsImage && (
                    <div className="w-full overflow-hidden rounded-xl shadow-lg md:w-5/12">
                      <img
                        src={latestNewsImage}
                        alt={latestNewsTranslation?.title || latestNews.slug}
                        className="h-48 w-full object-cover md:h-56"
                        width={800}
                        height={448}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        {t('news.latest')}
                      </Badge>
                      {latestNewsDate && <span className="text-white/70">{formatDate(latestNewsDate)}</span>}
                    </div>
                    <h3 className="text-2xl font-semibold leading-snug text-white">
                      {latestNewsTranslation?.title || latestNews.slug}
                    </h3>
                    {latestNewsSummary && (
                      <p className="text-white/80 line-clamp-3 md:line-clamp-2">{latestNewsSummary}</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/news/${latestNews.id}`}>
                        <Button size="lg" className="btn-accent" data-testid="hero-latest-news">
                          {t('news.readMore')}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href="/news">
                        <Button
                          size="lg"
                          variant="outline"
                          className="border-white text-white hover:bg-white/10"
                          data-testid="hero-view-all-news"
                        >
                          {t('news.viewAll')}
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

      {/* Upcoming Events */}
      {showUpcomingEvents && (
        <section className="bg-background dark:bg-background py-16">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="mb-2 text-3xl font-bold text-foreground">{t('events.upcoming')}</h2>
                <p className="text-muted-foreground">{t('home.events.subtitle')}</p>
              </div>
              <Link href="/events">
                <Button variant="outline" data-testid="link-all-events">
                  {t('home.events.viewAll')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <QueryState
              isLoading={eventsLoading}
              isError={eventsError}
              onRetry={() => refetchEvents()}
              empty={events.length === 0}
              emptyMessage={t('home.events.empty')}
            >
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((post: PostWithTranslations) => <EventCard key={post.id} post={post} />)}
              </div>
            </QueryState>
          </div>
        </section>
      )}

      {/* Latest News */}
      <section className="bg-muted dark:bg-muted py-16">
        <div className="container">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-foreground">{t('news.latest')}</h2>
              <p className="text-muted-foreground">{t('home.news.subtitle')}</p>
            </div>
            <Link href="/news">
              <Button variant="outline" data-testid="link-all-news">
                {t('news.viewAll')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <QueryState
            isLoading={newsLoading}
            isError={newsError}
            onRetry={() => refetchNews()}
            empty={news.length === 0}
            emptyMessage={t('home.news.empty')}
          >
            <div className="grid gap-6 lg:grid-cols-3">
              {news.map((post: PostWithTranslations) => <NewsCard key={post.id} post={post} />)}
            </div>
          </QueryState>
        </div>
      </section>

      {/* Active Member Surveys */}
      {isAuthenticated && surveys.length > 0 && (
        <section className="bg-background dark:bg-background py-16" data-testid="home-surveys-section">
          <div className="container">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-3xl font-bold text-foreground">{t('home.surveys.title')}</h2>
              <p className="text-muted-foreground">{t('home.surveys.subtitle')}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {surveys.map((survey) => (
                <Card key={survey.id} className="card-hover h-full">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">{survey.title}</h3>
                    <p className="mt-3 flex-1 text-muted-foreground">{survey.description}</p>
                    {(survey.startsAt || survey.endsAt) && (
                      <p className="mt-4 text-sm text-muted-foreground">
                        {t('home.surveys.period')}: {formatDateTime(survey.startsAt)} ~ {formatDateTime(survey.endsAt)}
                      </p>
                    )}
                    {survey.externalUrl && (
                      <Button asChild className="btn-accent mt-6 w-full">
                        <a
                          href={survey.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`button-home-survey-${survey.id}`}
                          onClick={() => trackEvent('survey_link_clicked', { location: 'home_survey_section' })}
                        >
                          {t('home.surveys.participate')}
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Partners Grid */}
      <section className="bg-background dark:bg-background py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-3xl font-bold text-foreground">{t('home.partners.title')}</h2>
            <p className="text-muted-foreground">{t('home.partners.subtitle')}</p>
          </div>
          
          <QueryState
            isLoading={partnersLoading}
            isError={partnersError}
            onRetry={() => refetchPartners()}
            empty={partners.length === 0}
            emptyMessage={t('home.partners.empty')}
          >
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {partners.slice(0, 12).map((partner: Partner) => (
                <Card key={partner.id} className="card-hover p-6 flex items-center justify-center h-32">
                  <div className="text-center">
                    {partner.logo ? (
                      <img 
                        src={partner.logo}
                        alt={partner.name}
                        className="h-12 w-auto mx-auto object-contain"
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
                        <Briefcase className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground font-medium text-center line-clamp-2">{partner.name}</span>
                      </div>
                    )}
                    {partner.logo && (
                      <div className="hidden flex-col items-center">
                        <Briefcase className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground font-medium text-center line-clamp-2">{partner.name}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
          </div>
          </QueryState>
          
          <div className="mt-10 text-center">
            <Link href="/members">
              <Button data-testid="link-member-directory">
                {t('home.partners.viewAll')}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="bg-muted dark:bg-muted py-20">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center space-x-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">{t('about.title')}</span>
              </div>
              
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                {t('home.about.heading')}
              </h2>
              
              <p className="mb-6 text-lg text-muted-foreground">
                {t('about.mission.description')}
              </p>
              
              <div className="mb-8 space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <span className="text-xs text-primary-foreground">✓</span>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">{t('home.about.benefit1.title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('home.about.benefit1.description')}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <span className="text-xs text-primary-foreground">✓</span>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">{t('home.about.benefit2.title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('home.about.benefit2.description')}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <span className="text-xs text-primary-foreground">✓</span>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold text-foreground">{t('home.about.benefit3.title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('home.about.benefit3.description')}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/about">
                  <Button data-testid="button-about">
                    {t('home.about.downloadBrochure')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" data-testid="button-org-chart">
                    {t('home.about.viewOrgChart')}
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
              
              <div className="absolute -bottom-6 -left-6 rounded-lg border border-border bg-card p-6 shadow-xl">
                <div className="mb-1 text-3xl font-bold text-primary">{memberCount}+</div>
                <div className="text-sm text-muted-foreground">{t('home.about.statsMembers')}</div>
              </div>
              
              <div className="absolute -right-6 -top-6 rounded-lg border border-border bg-card p-6 shadow-xl">
                <div className="mb-1 text-3xl font-bold text-accent">50+</div>
                <div className="text-sm text-muted-foreground">{t('home.about.statsEvents')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Member Benefits */}
      <section className="bg-background dark:bg-background py-16">
        <div className="container">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h2 className="mb-4 text-3xl font-bold text-foreground">{t('home.benefits.title')}</h2>
              <p className="mb-8 text-muted-foreground">
                {t('home.benefits.subtitle')}
              </p>
              
              <div className="mb-8 grid gap-6 md:grid-cols-3">
                <Card className="border-border p-6">
                  <Building className="mb-3 h-8 w-8 text-primary mx-auto" />
                  <h4 className="mb-2 font-bold">{t('home.benefits.card1.title')}</h4>
                  <p className="text-sm text-muted-foreground">{t('home.benefits.card1.description')}</p>
                </Card>
                <Card className="border-border p-6">
                  <Users className="mb-3 h-8 w-8 text-accent mx-auto" />
                  <h4 className="mb-2 font-bold">{t('home.benefits.card2.title')}</h4>
                  <p className="text-sm text-muted-foreground">{t('home.benefits.card2.description')}</p>
                </Card>
                <Card className="border-border p-6">
                  <Calendar className="mb-3 h-8 w-8 text-secondary mx-auto" />
                  <h4 className="mb-2 font-bold">{t('home.benefits.card3.title')}</h4>
                  <p className="text-sm text-muted-foreground">{t('home.benefits.card3.description')}</p>
                </Card>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/login">
                  <Button size="lg" data-testid="button-login">
                    <Users className="h-5 w-5" />
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" className="btn-secondary" data-testid="button-register">
                    <Users className="h-5 w-5" />
                    {t('nav.register')}
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
