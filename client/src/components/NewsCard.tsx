import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Share2, ArrowRight } from 'lucide-react';
import { PostWithTranslations } from '@shared/schema';
import { t } from '@/lib/i18n';
import { Link } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslationSafe, getMetaValue } from '@/lib/postHelpers';

interface NewsCardProps {
  post: PostWithTranslations;
}

export default function NewsCard({ post }: NewsCardProps) {
  const { language } = useLanguage();
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
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: translation?.title || post.slug,
          text: translation?.excerpt || '',
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to copying to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Card className="card-hover border border-border" data-testid={`news-card-${post.id}`}>
      {featuredImage ? (
        <img
          src={featuredImage}
          alt={translation?.title || post.slug}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-r from-muted to-muted/50 rounded-t-lg flex items-center justify-center">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-muted-foreground mt-2">
              {getCategoryBadge(category)}
            </div>
          </div>
        </div>
      )}
      
      <CardContent className="p-6">
        {/* Article Meta */}
        <div className="flex items-center justify-between mb-3">
          {getCategoryBadge(category)}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
            </span>
            {viewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {viewCount}
              </span>
            )}
          </div>
        </div>
        
        {/* Article Title */}
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 hover:text-primary cursor-pointer transition-colors" data-testid={`news-title-${post.id}`}>
          {translation?.title || post.slug}
        </h3>
        
        {/* Article Excerpt */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {translation?.excerpt || ''}
        </p>
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Article Actions */}
        <div className="flex items-center justify-between">
          <Link 
            href={`/news/${post.id}`}
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            data-testid={`link-read-more-${post.id}`}
          >
            {t('news.readMore')}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
          
          {/* Social Share Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="p-2 h-auto text-muted-foreground hover:text-primary"
              title="공유하기"
              data-testid={`button-share-${post.id}`}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Author Info */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              작성일: {formatDate(post.createdAt)}
            </span>
            {post.status === 'published' ? (
              <Badge variant="default" className="badge-primary text-xs">
                발행됨
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                미발행
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
