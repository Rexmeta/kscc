import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RefreshCw, Newspaper, Plus, Clock, ChevronRight } from 'lucide-react';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { PostWithTranslations } from '@shared/schema';
import { getTranslationSafe, getMetaValue } from '@/lib/postHelpers';

export default function NewsPage() {
  const { hasPermission } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/posts', 'news', { page, category, search, language, limit: 12 }],
    queryFn: async () => {
      const params = new URLSearchParams({
        postType: 'news',
        status: 'published',
        limit: '12',
        offset: ((page - 1) * 12).toString(),
        ...(category && { tags: category }), // Use tags for category filtering (comma-separated)
        ...(search && { search }), // Add search term
      });
      
      const response = await fetch(`/api/posts?${params}`);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "접근 권한 없음",
            description: "로그인이 필요하거나 권한이 없습니다.",
            variant: "destructive",
          });
        }
        throw new Error('Failed to fetch news');
      }
      
      return response.json();
    },
  });

  const posts = data?.posts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 12);

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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">뉴스 목록</h2>
            {hasPermission('news.create') && (
              <Button asChild data-testid="button-create-news">
                <Link href="/admin?tab=articles&action=create">
                  <Plus className="h-4 w-4 mr-2" />
                  뉴스 작성
                </Link>
              </Button>
            )}
          </div>
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

      {/* News Content */}
      <section className="py-8">
        <div className="container">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : posts.length > 0 ? (
            <>
              {/* Featured Section - First article large, next 3 as list */}
              {page === 1 && posts.length >= 1 && (
                <div className="grid gap-6 lg:grid-cols-2 mb-12">
                  {/* Featured Article - Left */}
                  {(() => {
                    const featured = posts[0];
                    const translation = getTranslationSafe(featured, language);
                    const images = getMetaValue(featured.meta || [], 'news.images');
                    const featuredImage = featured.coverImage || (Array.isArray(images) && images[0]) || null;
                    const formatDate = (date: string | Date) => {
                      const d = typeof date === 'string' ? new Date(date) : date;
                      return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
                    };
                    return (
                      <Link href={`/news/${featured.slug}`} className="block group" data-testid={`featured-news-${featured.id}`}>
                        <div className="space-y-3">
                          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                            {featuredImage ? (
                              <img 
                                src={featuredImage} 
                                alt={translation?.title || ''} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                <Newspaper className="h-16 w-16 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>게시 시간 : {formatDate(featured.publishedAt || featured.createdAt)}</span>
                          </div>
                          <h3 className="text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
                            {translation?.title || '제목 없음'}
                          </h3>
                          <p className="text-muted-foreground line-clamp-3">
                            {translation?.excerpt || ''}
                          </p>
                        </div>
                      </Link>
                    );
                  })()}

                  {/* Recent Articles List - Right */}
                  <div className="space-y-4">
                    {posts.slice(1, 4).map((post: PostWithTranslations) => {
                      const translation = getTranslationSafe(post, language);
                      const images = getMetaValue(post.meta || [], 'news.images');
                      const featuredImage = post.coverImage || (Array.isArray(images) && images[0]) || null;
                      const formatDate = (date: string | Date) => {
                        const d = typeof date === 'string' ? new Date(date) : date;
                        return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
                      };
                      return (
                        <Link 
                          key={post.id} 
                          href={`/news/${post.slug}`} 
                          className="flex gap-4 group border-b border-border pb-4 last:border-0"
                          data-testid={`news-list-item-${post.id}`}
                        >
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                                {translation?.title || '제목 없음'}
                              </h4>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 pl-6">
                              {translation?.excerpt || ''}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                              <Clock className="h-3 w-3" />
                              <span>게시 시간 : {formatDate(post.publishedAt || post.createdAt)}</span>
                            </div>
                          </div>
                          {featuredImage && (
                            <div className="w-28 h-20 flex-shrink-0 overflow-hidden rounded-lg">
                              <img 
                                src={featuredImage} 
                                alt={translation?.title || ''} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* News Grid - 4 columns */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {(page === 1 ? posts.slice(4) : posts).map((post: PostWithTranslations) => {
                  const translation = getTranslationSafe(post, language);
                  const images = getMetaValue(post.meta || [], 'news.images');
                  const featuredImage = post.coverImage || (Array.isArray(images) && images[0]) || null;
                  const formatDate = (date: string | Date) => {
                    const d = typeof date === 'string' ? new Date(date) : date;
                    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '');
                  };
                  return (
                    <Link 
                      key={post.id} 
                      href={`/news/${post.slug}`} 
                      className="block group"
                      data-testid={`news-card-${post.id}`}
                    >
                      <Card className="overflow-hidden border border-border hover:shadow-lg transition-shadow">
                        <div className="aspect-[16/10] overflow-hidden bg-muted">
                          {featuredImage ? (
                            <img 
                              src={featuredImage} 
                              alt={translation?.title || ''} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                              <Newspaper className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>게시 시간 : {formatDate(post.publishedAt || post.createdAt)}</span>
                          </div>
                          <h4 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
                            {translation?.title || '제목 없음'}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {translation?.excerpt || ''}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
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
