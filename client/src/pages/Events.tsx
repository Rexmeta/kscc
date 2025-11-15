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

export default function EventsPage() {
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [upcoming, setUpcoming] = useState('true');
  const limit = 9;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/posts', { postType: 'event', page, category, upcoming, limit }],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({
        postType: 'event',
        status: 'published',
        offset: offset.toString(),
        limit: limit.toString(),
        ...(category && { tags: category }),
        ...(upcoming === 'true' && { upcoming: 'true' }),
      });
      const response = await fetch(`/api/posts?${params}`);
      return response.json();
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
    setUpcoming('true');
    setPage(1);
    refetch();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-muted py-16">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">{t('events.title')}</h1>
            <p className="text-lg text-muted-foreground">Upcoming Events / 即将举行的活动</p>
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 border-b">
        <div className="container">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">행사 목록</h2>
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
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : events.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((post: PostWithTranslations) => (
                  <EventCard key={post.id} post={post} />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    {t('common.previous')}
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        onClick={() => setPage(pageNum)}
                        data-testid={`button-page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    data-testid="button-next-page"
                  >
                    {t('common.next')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">현재 예정된 행사가 없습니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
