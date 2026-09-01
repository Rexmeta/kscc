import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter, RefreshCw, Plus } from 'lucide-react';
import { t } from '@/lib/i18n';
import { PostWithTranslations } from '@shared/schema';
import EventCard from '@/components/EventCard';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { queryKeys } from '@/lib/queryClient';
import { fetchJson } from '@/lib/queryClient';
import { QueryState } from '@/components/QueryState';
import { PagePagination } from '@/components/PagePagination';

export default function EventsPage() {
  const { hasPermission } = useAuth();
  const { language } = useLanguage();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [upcoming, setUpcoming] = useState('');
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
  });

  const events = data?.posts || [];
  const totalPages = Math.ceil((data?.total || 0) / limit) || 1;

  const handleFilter = () => {
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setCategory('');
    setUpcoming('');
    setPage(1);
    refetch();
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Header */}
      <section className="bg-muted dark:bg-muted py-16">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground dark:text-foreground">{t('events.title')}</h1>
            <p className="text-lg text-muted-foreground dark:text-muted-foreground">{t('events.subtitle')}</p>
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 border-b border-border dark:border-border">
        <div className="container">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-foreground dark:text-foreground">행사 목록</h2>
            {hasPermission('event.create') && (
              <Button asChild data-testid="button-create-event">
                <Link href="/admin?tab=events">
                  <Plus className="h-4 w-4 mr-2" />
                  행사 등록
                </Link>
              </Button>
            )}
          </div>
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Select value={upcoming || "all"} onValueChange={(value) => setUpcoming(value === "all" ? "" : value)}>
                <SelectTrigger data-testid="select-time">
                  <SelectValue placeholder="시간 필터" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">예정된 행사</SelectItem>
                  <SelectItem value="all">모든 행사</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? "" : value)}>
                <SelectTrigger data-testid="select-category">
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
                <Button onClick={handleFilter} data-testid="button-filter">
                  <Filter className="h-4 w-4" />
                  필터 적용
                </Button>
                <Button variant="outline" onClick={handleReset} data-testid="button-reset">
                  <RefreshCw className="h-4 w-4" />
                  초기화
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-16">
          <div className="container">
           <QueryState
             isLoading={isLoading}
             isError={isError}
             onRetry={() => refetch()}
             empty={events.length === 0}
             emptyMessage={t('home.events.empty')}
           >
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((post: PostWithTranslations) => (
                  <EventCard key={post.id} post={post} />
                ))}
              </div>
              
              {/* Pagination */}
               <PagePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
           </QueryState>
        </div>
      </section>
    </div>
  );
}
