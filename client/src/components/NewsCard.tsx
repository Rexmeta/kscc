import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, Share2, ArrowRight } from 'lucide-react';
import { News } from '@shared/schema';
import { t } from '@/lib/i18n';
import { Link } from 'wouter';

interface NewsCardProps {
  article: News;
}

export default function NewsCard({ article }: NewsCardProps) {
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
          title: article.title,
          text: article.excerpt,
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
    <Card className="card-hover border border-border" data-testid={`news-card-${article.id}`}>
      {article.featuredImage ? (
        <img
          src={article.featuredImage}
          alt={article.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-r from-muted to-muted/50 rounded-t-lg flex items-center justify-center">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{getCategoryBadge(article.category)}</p>
          </div>
        </div>
      )}
      
      <CardContent className="p-6">
        {/* Article Meta */}
        <div className="flex items-center justify-between mb-3">
          {getCategoryBadge(article.category)}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {article.publishedAt ? formatDate(article.publishedAt) : formatDate(article.createdAt)}
            </span>
            {article.viewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {article.viewCount}
              </span>
            )}
          </div>
        </div>
        
        {/* Article Title */}
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 hover:text-primary cursor-pointer transition-colors" data-testid={`news-title-${article.id}`}>
          {article.title}
        </h3>
        
        {/* Article Excerpt */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {article.excerpt}
        </p>
        
        {/* Tags */}
        {article.tags && Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Article Actions */}
        <div className="flex items-center justify-between">
          <Link 
            href={`/news/${article.id}`}
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            data-testid={`link-read-more-${article.id}`}
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
              data-testid={`button-share-${article.id}`}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Author Info */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              작성일: {formatDate(article.createdAt)}
            </span>
            {article.isPublished ? (
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
