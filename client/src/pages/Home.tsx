import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, ArrowRight, Building, Briefcase, Globe, TrendingUp, ClipboardList } from 'lucide-react';
import { t } from '@/lib/i18n';
import { Member, PostWithTranslations } from '@shared/schema';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { getTranslationSafe, getMetaValue } from '@/lib/postHelpers';
import { queryKeys } from '@/lib/queryClient';
import type { SurveySettings } from '@shared/schema';
import EventCard from '@/components/EventCard';
import NewsCard from '@/components/NewsCard';

export default function Home() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();

  const formatDate = (date?: string | Date | null) => {
    if (!date) return '';
    const value = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const fallbackHeroImage =
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080';

  // Fetch upcoming events
  const { data: eventsData } = useQuery({
    queryKey: queryKeys.posts.list({ postType: 'event', upcoming: true, limit: 3, language }),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/posts?postType=event&status=published&upcoming=true&limit=3&locale=${language}&compact=true`, { signal });
      return response.json();
    },
  });

  // Fetch latest news
  const { data: newsData } = useQuery({
    queryKey: queryKeys.posts.list({ postType: 'news', limit: 3, language }),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/posts?postType=news&status=published&limit=3&locale=${language}&compact=true`, { signal });
      return response.json();
    },
  });

  // Fetch the partner cards and the total count in one bounded response.
  const { data: membersData } = useQuery({
    queryKey: queryKeys.members.list({ isPublic: true, limit: 12 }),
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/members?limit=12', { signal });
      return response.json();
    },
  });

  const { data: survey } = useQuery<Pick<SurveySettings, 'title' | 'description' | 'externalUrl' | 'isActive'> | null>({
    queryKey: ['/api/survey'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/survey', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        signal,
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error('Failed to fetch survey settings');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const events = eventsData?.posts || [];
  const news = newsData?.posts || [];
  const membersPartners = membersData?.members || [];
  const memberCount = membersData?.total || 0;
  const latestNews = news[0];
  const latestNewsTranslation = latestNews ? getTranslationSafe(latestNews, language) : null;
  const latestNewsImages = latestNews ? getMetaValue(latestNews.meta || [], 'news.images') : null;
  const latestNewsImage = latestNews
    ? latestNews.coverImage ||
      (Array.isArray(latestNewsImages) && latestNewsImages.length > 0 ? latestNewsImages[0] : null)
    : null;
  const latestNewsSummary = latestNewsTranslation?.excerpt || latestNewsTranslation?.subtitle || '';
  const heroBackgroundImage = latestNewsImage || fallbackHeroImage;
  const latestNewsDate = latestNews?.publishedAt || latestNews?.createdAt;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 hero-overlay"></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("${heroBackgroundImage}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        ></div>
        
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

            {survey?.isActive && survey.externalUrl && (
              <Card className="mx-auto mt-8 max-w-3xl border-white/20 bg-white/10 text-left text-white shadow-2xl backdrop-blur-lg">
                <CardContent className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 rounded-full bg-white/15 p-3">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{survey.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-white/80">{survey.description}</p>
                    </div>
                  </div>
                  <Button asChild size="lg" className="btn-accent shrink-0">
                    <a href={survey.externalUrl} target="_blank" rel="noopener noreferrer" data-testid="button-home-survey">
                      설문하기
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

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
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.length > 0 ? (
              events.map((post: PostWithTranslations) => (
                <EventCard key={post.id} post={post} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('home.events.empty')}</p>
              </div>
            )}
          </div>
        </div>
      </section>

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
          
          <div className="grid gap-6 lg:grid-cols-3">
            {news.length > 0 ? (
              news.map((post: PostWithTranslations) => (
                <NewsCard key={post.id} post={post} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('home.news.empty')}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Partners Grid */}
      <section className="bg-background dark:bg-background py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-2 text-3xl font-bold text-foreground">{t('home.partners.title')}</h2>
            <p className="text-muted-foreground">{t('home.partners.subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {membersPartners && membersPartners.length > 0 ? (
              membersPartners.slice(0, 12).map((member: Member) => (
                <Card key={member.id} className="card-hover p-6 flex items-center justify-center h-32">
                  <div className="text-center">
                    {member.logo ? (
                      <img 
                        src={member.logo} 
                        alt={member.companyName} 
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
                    {!member.logo && (
                      <div className="flex flex-col items-center">
                        <Briefcase className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground font-medium text-center line-clamp-2">{member.companyName}</span>
                      </div>
                    )}
                    {member.logo && (
                      <div className="hidden flex-col items-center">
                        <Briefcase className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground font-medium text-center line-clamp-2">{member.companyName}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t('home.partners.empty')}</p>
              </div>
            )}
          </div>
          
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
