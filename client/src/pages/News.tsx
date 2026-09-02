import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RefreshCw, Newspaper, Plus, Clock, ChevronRight } from 'lucide-react';
import { t, formatLocalizedDate } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { PostWithTranslations } from '@shared/schema';
import { getTranslationSafe, getMetaValue } from '@/lib/postHelpers';
import { queryKeys } from '@/lib/queryClient';
import { fetchJson } from '@/lib/queryClient';
import { QueryState } from '@/components/QueryState';
import { PagePagination } from '@/components/PagePagination';

export default function NewsPage() {
  const { hasPermission } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [categoryInput, setCategoryInput] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.posts.list({ postType: 'news', page, category, search, language, limit: 14 }),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        postType: 'news',
        status: 'published',
        limit: '14',
        offset: ((page - 1) * 14).toString(),
        ...(category && { tags: category }), // Use tags for category filtering (comma-separated)
        ...(search && { search }), // Add search term
        locale: language,
        compact: 'true',
      });
      
       return fetchJson<{ posts: PostWithTranslations[]; total: number }>(`/api/posts?${params}`, { signal });
    },
    staleTime: 2 * 60 * 1000,
  });

  const posts = data?.posts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 14);

  const handleFilter = () => {
    setPage(1);
    setCategory(categoryInput);
    setSearch(searchInput.trim());
  };

  const handleReset = () => {
    setCategoryInput('');
    setSearchInput('');
    setCategory('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Header */}
       <section className="page-banner bg-muted dark:bg-muted">
        <div className="container">
          <div className="text-center">
             <h1 className="mb-2 text-2xl font-bold text-foreground dark:text-foreground sm:mb-4 sm:text-4xl">{t('news.title')}</h1>
             <p className="text-sm text-muted-foreground dark:text-muted-foreground sm:text-lg">Latest News / 最新消息</p>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
       <section className="page-filter border-b border-border dark:border-border">
        <div className="container">
          <div className="flex justify-end items-center mb-4">
            {hasPermission('news.create') && (
              <Button asChild data-testid="button-create-news">
                <Link href="/admin?tab=articles&action=create">
                  <Plus className="h-4 w-4 mr-2" />
                  뉴스 작성
                </Link>
              </Button>
            )}
          </div>
            <Card className="page-filter-card">
             <div className="grid gap-2 sm:gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                   <Input
                    placeholder="뉴스 제목 또는 내용 검색..."
                     value={searchInput}
                     onChange={(e) => setSearchInput(e.target.value)}
                     className="page-filter-control pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              
               <Select value={categoryInput || "all"} onValueChange={(value) => setCategoryInput(value === "all" ? "" : value)}>
                <SelectTrigger className="page-filter-control" data-testid="select-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="notice">{t('news.categories.notice')}</SelectItem>
                  <SelectItem value="press">{t('news.categories.press')}</SelectItem>
                  <SelectItem value="activity">{t('news.categories.activity')}</SelectItem>
                </SelectContent>
              </Select>
              
               <div className="flex w-full gap-2 md:col-span-1">
                 <Button className="page-filter-control flex-1 px-3" onClick={handleFilter} data-testid="button-filter">
                  <Filter className="h-4 w-4" />
                  필터
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

      {/* News Content */}
      <section className="py-8">
        <div className="container">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            empty={posts.length === 0}
            emptyMessage={t('home.news.empty')}
          >
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
                      return formatLocalizedDate(d, language, { year: 'numeric', month: '2-digit', day: '2-digit' });
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
                                width={800}
                                height={600}
                                loading="eager"
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
                    {posts.slice(1, 6).map((post: PostWithTranslations) => {
                      const translation = getTranslationSafe(post, language);
                      const images = getMetaValue(post.meta || [], 'news.images');
                      const featuredImage = post.coverImage || (Array.isArray(images) && images[0]) || null;
                      const formatDate = (date: string | Date) => {
                        const d = typeof date === 'string' ? new Date(date) : date;
                        return formatLocalizedDate(d, language, { year: 'numeric', month: '2-digit', day: '2-digit' });
                      };
                      return (
                        <Link 
                          key={post.id} 
                          href={`/news/${post.slug}`} 
                           className="group flex min-w-0 gap-3 border-b border-border pb-4 last:border-0 sm:gap-4"
                          data-testid={`news-list-item-${post.id}`}
                        >
                           <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-4 w-4 text-primary" />
                              <h4 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                                {translation?.title || '제목 없음'}
                              </h4>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 pl-6">
                              {translation?.excerpt || ''}
                            </p>
                             <div className="flex flex-wrap items-center gap-2 pl-6 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>게시 시간 : {formatDate(post.publishedAt || post.createdAt)}</span>
                            </div>
                          </div>
                          {featuredImage && (
                             <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-28">
                              <img 
                                src={featuredImage} 
                                alt={translation?.title || ''} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                width={224}
                                height={160}
                                loading="lazy"
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
                {(page === 1 ? posts.slice(6) : posts).map((post: PostWithTranslations) => {
                  const translation = getTranslationSafe(post, language);
                  const images = getMetaValue(post.meta || [], 'news.images');
                  const featuredImage = post.coverImage || (Array.isArray(images) && images[0]) || null;
                  const formatDate = (date: string | Date) => {
                    const d = typeof date === 'string' ? new Date(date) : date;
                    return formatLocalizedDate(d, language, { year: 'numeric', month: '2-digit', day: '2-digit' });
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
                              width={640}
                              height={400}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                              <Newspaper className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                         <div className="space-y-2 p-4">
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
              <PagePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          </QueryState>
        </div>
      </section>
    </div>
  );
}
