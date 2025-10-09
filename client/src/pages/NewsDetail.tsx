import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, ArrowLeft, Share2 } from 'lucide-react';
import { News } from '@shared/schema';
import { t } from '@/lib/i18n';

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: article, isLoading } = useQuery<News>({
    queryKey: ['/api/news', id],
    queryFn: async () => {
      const response = await fetch(`/api/news/${id}`);
      if (!response.ok) {
        throw new Error('News not found');
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">뉴스를 찾을 수 없습니다</h2>
          <Link 
            href="/news"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            뉴스 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const getCategoryBadge = (category: string) => {
    const badgeMap = {
      notice: { variant: 'secondary' as const, label: t('news.categories.notice'), className: 'badge-accent' },
      press: { variant: 'default' as const, label: t('news.categories.press'), className: 'badge-primary' },
      activity: { variant: 'outline' as const, label: t('news.categories.activity'), className: 'badge-secondary' },
    };
    
    const config = badgeMap[category as keyof typeof badgeMap] || { variant: 'outline' as const, label: category, className: '' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: window.location.href,
        });
      } catch (error) {
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Back Navigation */}
      <section className="bg-muted py-8">
        <div className="container">
          <Link 
            href="/news"
            className="inline-flex items-center text-sm font-medium text-foreground hover:text-primary transition-colors mb-4"
            data-testid="link-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            뉴스 목록으로
          </Link>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-12">
        <div className="container max-w-4xl">
          <Card>
            {article.featuredImage && (
              <img
                src={article.featuredImage}
                alt={article.title}
                className="w-full h-96 object-cover rounded-t-lg"
                data-testid="news-featured-image"
              />
            )}
            
            <CardContent className="p-8">
              {/* Article Meta */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {getCategoryBadge(article.category)}
                  {article.isPublished ? (
                    <Badge variant="default" className="badge-primary">
                      발행됨
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      미발행
                    </Badge>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="text-muted-foreground hover:text-primary"
                  data-testid="button-share"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  공유하기
                </Button>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="news-title">
                {article.title}
              </h1>

              {/* Date and Views */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6 pb-6 border-b">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {article.publishedAt ? formatDate(article.publishedAt) : formatDate(article.createdAt)}
                </span>
                {article.viewCount > 0 && (
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    조회수 {article.viewCount}
                  </span>
                )}
              </div>

              {/* Excerpt */}
              <p className="text-xl text-muted-foreground mb-8" data-testid="news-excerpt">
                {article.excerpt}
              </p>

              {/* Content */}
              <div className="prose prose-lg max-w-none" data-testid="news-content">
                {article.content}
              </div>

              {/* Image Gallery */}
              {article.images && Array.isArray(article.images) && article.images.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                  <h3 className="text-lg font-semibold mb-4">이미지</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {article.images.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`${article.title} - 이미지 ${index + 1}`}
                        className="w-full h-64 object-cover rounded-lg"
                        data-testid={`news-image-${index}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {article.tags && Array.isArray(article.tags) && article.tags.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Link 
              href="/news"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              data-testid="link-back-bottom"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뉴스 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
