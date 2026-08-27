import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ObjectUploader } from '@/components/ObjectUploader';
import { MediaUploader, type MediaItem } from '@/components/MediaUploader';
import RichTextEditor from '@/components/RichTextEditor';
import type { UploadResult } from '@uppy/core';
import { newsSchema, type NewsFormValues } from '../adminSchemas';
import { setImagePublicAcl, getUploadParameters } from '../uploadHelpers';
import type { PostWithTranslations } from '@shared/schema';
import { getMetaValue } from '@/lib/postHelpers';
import { useUpdateNewsPost } from '@/hooks/useAdminMutations';

export function EditNewsForm({ news, onSuccess }: { news: PostWithTranslations; onSuccess: () => void }) {
  const newsMeta = news.meta || [];
  const categoryFromMeta = String(getMetaValue(newsMeta, 'category') || (Array.isArray(news.tags) && news.tags[0]) || '');
  const imagesFromMeta = getMetaValue(newsMeta, 'news.images');
  const existingImages = Array.isArray(imagesFromMeta) ? imagesFromMeta : [];
  const videosFromMeta = getMetaValue(newsMeta, 'news.videos');
  const existingVideos = Array.isArray(videosFromMeta) ? videosFromMeta : [];

  const [featuredImageUrl, setFeaturedImageUrl] = useState(news.coverImage || '');

  const initialMediaItems: MediaItem[] = [
    ...existingImages.map((url: string) => ({ type: 'image' as const, url, isUploaded: true })),
    ...existingVideos.map((url: string) => ({ type: 'video' as const, url, isUploaded: url.includes('replit') })),
  ];
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialMediaItems);

  const { toast } = useToast();
  const { user, isAdmin, hasPermission } = useAuth();
  const canPublish = isAdmin || hasPermission('news.publish');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<NewsFormValues>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: news.translations?.[0]?.title || '',
      excerpt: news.translations?.[0]?.excerpt || '',
      content: news.translations?.[0]?.content || '',
      category: categoryFromMeta,
      featuredImage: news.coverImage || '',
      isPublished: news.status === 'published',
      publishedAt: news.publishedAt ? new Date(news.publishedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    }
  });

  const isPublished = watch('isPublished');
  const publishedAt = watch('publishedAt');
  const selectedCategory = watch('category');

  const handleFeaturedImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = window.__lastUploadObjectPath || '';
      if (objectPath) {
        await setImagePublicAcl(objectPath);
        setFeaturedImageUrl(objectPath);
        setValue('featuredImage', objectPath);
        toast({ title: '대표 이미지가 업로드되었습니다' });
      }
    }
  };

  const removeFeaturedImage = () => {
    setFeaturedImageUrl('');
    setValue('featuredImage', '');
  };

  const updateMutation = useUpdateNewsPost({ postId: news.id, onSuccess });

  const onSubmit = (data: NewsFormValues) => {
    updateMutation.mutate({
      ...data,
      _featuredImageUrl: featuredImageUrl,
      _mediaImages: mediaItems.filter(m => m.type === 'image').map(m => m.url),
      _mediaVideos: mediaItems.filter(m => m.type === 'video').map(m => m.url),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            제목 <span className="text-destructive">*</span>
          </label>
          <Input
            {...register('title')}
            placeholder="뉴스 제목을 입력하세요"
            className="h-11"
            data-testid="input-news-title-edit"
          />
          {errors.title && <p className="text-sm text-destructive mt-1.5">{String(errors.title.message)}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            요약 <span className="text-destructive">*</span>
          </label>
          <Textarea
            {...register('excerpt')}
            placeholder="뉴스 내용을 간략하게 요약해주세요 (목록에 표시됩니다)"
            className="min-h-[80px] resize-none"
            data-testid="textarea-news-excerpt-edit"
          />
          {errors.excerpt && <p className="text-sm text-destructive mt-1.5">{String(errors.excerpt.message)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            카테고리 <span className="text-destructive">*</span>
          </label>
          <Select
            value={selectedCategory}
            onValueChange={(value) => setValue('category', value, { shouldValidate: true, shouldDirty: true })}
          >
            <SelectTrigger className="h-11" data-testid="select-news-category-edit">
              <SelectValue placeholder="카테고리 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="notice">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  공지사항
                </div>
              </SelectItem>
              <SelectItem value="news">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  뉴스
                </div>
              </SelectItem>
              <SelectItem value="column">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  칼럼
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.category && <p className="text-sm text-destructive mt-1.5">{String(errors.category.message)}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">발행 상태</label>
          <div className="h-11 flex items-center gap-3 px-3 rounded-md border bg-muted/30">
            <Switch
              checked={isPublished}
              onCheckedChange={(checked) => setValue('isPublished', checked)}
              disabled={!canPublish}
              data-testid="switch-news-published-edit"
            />
            <span className={`text-sm font-medium ${isPublished ? 'text-green-600' : 'text-muted-foreground'}`}>
              {isPublished ? '발행됨' : '초안'}
            </span>
          </div>
        </div>
      </div>

      {isPublished && (
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            발행일
          </label>
          <Input
            type="datetime-local"
            value={publishedAt || ''}
            onChange={(e) => setValue('publishedAt', e.target.value)}
            className="h-11"
            data-testid="input-news-published-at-edit"
          />
          <p className="text-xs text-muted-foreground mt-1">발행일을 수정할 수 있습니다.</p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          본문 내용 <span className="text-destructive">*</span>
        </label>
        <RichTextEditor
          value={watch('content') || ''}
          onChange={(value) => setValue('content', value)}
          data-testid="editor-news-content-edit"
        />
        {errors.content && <p className="text-sm text-destructive mt-1.5">{String(errors.content.message)}</p>}
      </div>

      <div className="border rounded-lg p-4 bg-muted/20">
        <label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          대표 이미지
        </label>

        {!featuredImageUrl ? (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 sm:p-8 text-center hover:border-primary/50 transition-colors bg-background">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">이미지를 업로드하세요</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF (최대 10MB)</p>
              </div>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={getUploadParameters}
                onComplete={handleFeaturedImageUpload}
                buttonClassName="mt-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                파일 선택
              </ObjectUploader>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <img
              src={featuredImageUrl}
              alt="대표 이미지"
              className="w-full h-48 sm:h-56 object-cover rounded-lg border"
              data-testid="img-featured-preview-edit"
              onError={(e) => {
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.opacity = '0.5';
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={getUploadParameters}
                onComplete={handleFeaturedImageUpload}
                buttonClassName="bg-white text-black hover:bg-gray-100"
              >
                <Upload className="h-4 w-4 mr-2" />
                변경
              </ObjectUploader>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removeFeaturedImage}
                data-testid="button-remove-featured-edit"
              >
                <X className="h-4 w-4 mr-1" />
                삭제
              </Button>
            </div>
          </div>
        )}
      </div>

      <MediaUploader
        mediaItems={mediaItems}
        onMediaChange={setMediaItems}
        onGetUploadParameters={getUploadParameters}
        onUploadComplete={setImagePublicAcl}
      />

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess()}
          className="flex-1 sm:flex-none"
        >
          취소
        </Button>
        <Button
          type="submit"
          disabled={updateMutation.isPending}
          className="flex-1 sm:flex-none sm:min-w-[120px]"
          data-testid="button-submit-news-edit"
        >
          {updateMutation.isPending ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              수정 중...
            </>
          ) : (
            '수정 완료'
          )}
        </Button>
      </div>
    </form>
  );
}
