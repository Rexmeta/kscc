import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RefreshCw, Newspaper } from 'lucide-react';
import { t } from '@/lib/i18n';
import { News } from '@shared/schema';
import NewsCard from '@/components/NewsCard';

export default function NewsPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/news', { page, category, limit: 12 }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(category && { category }),
      });
      const response = await fetch(`/api/news?${params}`);
      return response.json();
    },
  });

  const articles = data?.articles || [];
  const totalPages = data?.totalPages || 1;

  const handleFilter = () => {
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setCategory('');
    setSearch('');
    setPage(1);
    refetch();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-muted py-16">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">{t('news.title')}</h1>
            <p className="text-lg text-muted-foreground">Latest News / 最新消息</p>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-8 border-b">
        <div className="container">
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="뉴스 제목 또는 내용 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              
              <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? "" : value)}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="notice">{t('news.categories.notice')}</SelectItem>
                  <SelectItem value="press">{t('news.categories.press')}</SelectItem>
                  <SelectItem value="activity">{t('news.categories.activity')}</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button onClick={handleFilter} data-testid="button-filter">
                  <Filter className="h-4 w-4" />
                  필터
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

      {/* News Grid */}
      <section className="py-16">
        <div className="container">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : articles.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article: News) => (
                  <NewsCard key={article.id} article={article} />
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
              <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">뉴스가 없습니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
