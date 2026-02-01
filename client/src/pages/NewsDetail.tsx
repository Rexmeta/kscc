import { useParams, Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, ArrowLeft, Share2, Edit, Trash2 } from 'lucide-react';
import { PostWithTranslations } from '@shared/schema';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getTranslationSafe, getMetaValue } from '@/lib/postHelpers';
import { deletePost } from '@/lib/adminPostApi';
import ShareButtons from '@/components/ShareButtons';

export default function NewsDetail() {
  // ALL HOOKS MUST BE AT THE TOP (Rules of Hooks)
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { language } = useLanguage();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useQuery<PostWithTranslations>({
    queryKey: ['/api/posts/slug', id],
    queryFn: async () => {
      // Try slug first, then fall back to ID
      let response = await fetch(`/api/posts/slug/${id}`);
      if (!response.ok) {
        // Fall back to ID-based lookup
        response = await fetch(`/api/posts/${id}`);
      }
      if (!response.ok) {
        throw new Error('News not found');
      }
      return response.json();
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(id!),
    onSuccess: () => {
      toast({
        title: "삭제 완료",
        description: "뉴스가 성공적으로 삭제되었습니다.",
      });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === '/api/posts';
        }
      });
      navigate('/news');
    },
    onError: (error: Error) => {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // CONDITIONAL RETURNS AFTER ALL HOOKS
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

  if (!post) {
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

  // Extract translation and meta values
  const translation = getTranslationSafe(post, language);
  const category = getMetaValue(post.meta || [], 'news.category') || 'notice';
  const viewCount = getMetaValue(post.meta || [], 'news.viewCount') || 0;
  const imagesRaw = getMetaValue(post.meta || [], 'news.images');
  const images = Array.isArray(imagesRaw) ? imagesRaw : [];
  const featuredImage = post.coverImage || (images.length > 0 ? images[0] : null);
  const tags = Array.isArray(post.tags) ? post.tags : [];

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

  const handleEdit = () => {
    navigate(`/admin?tab=news&edit=${id}`);
  };

  const handleDelete = () => {
    if (confirm('정말로 이 뉴스를 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: translation.title || post.slug,
          text: translation.excerpt || '',
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
          <div className="flex items-center justify-between">
            <Link 
              href="/news"
              className="inline-flex items-center text-sm font-medium text-foreground hover:text-primary transition-colors mb-4"
              data-testid="link-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뉴스 목록으로
            </Link>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  data-testid="button-edit-news"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-news"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-12">
        <div className="container max-w-4xl">
          <Card>
            {featuredImage && (
              <img
                src={featuredImage}
                alt={translation.title || post.slug}
                className="w-full h-96 object-cover rounded-t-lg"
                data-testid="news-featured-image"
              />
            )}
            
            <CardContent className="p-8">
              {/* Article Meta */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {getCategoryBadge(category)}
                  {post.status === 'published' ? (
                    <Badge variant="default" className="badge-primary">
                      발행됨
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      미발행
                    </Badge>
                  )}
                </div>
                
                <ShareButtons 
                  url={`/news/${id}`}
                  title={translation.title || post.slug}
                  description={translation.excerpt || ''}
                />
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="news-title">
                {translation.title || post.slug}
              </h1>

              {/* Date and Views */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6 pb-6 border-b">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                </span>
                {viewCount > 0 && (
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    조회수 {viewCount}
                  </span>
                )}
              </div>

              {/* Excerpt */}
              <p className="text-xl text-muted-foreground mb-8" data-testid="news-excerpt">
                {translation.excerpt || ''}
              </p>

              {/* Content */}
              <div 
                className="prose prose-lg dark:prose-invert max-w-none" 
                data-testid="news-content"
                dangerouslySetInnerHTML={{ __html: translation.content || '' }}
              />

              {/* Image Gallery */}
              {images.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                  <h3 className="text-lg font-semibold mb-4">이미지</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {images.map((imageUrl, index) => (
                      <img
                        key={index}
                        src={imageUrl}
                        alt={`${translation.title || post.slug} - 이미지 ${index + 1}`}
                        className="w-full h-64 object-cover rounded-lg"
                        data-testid={`news-image-${index}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
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
