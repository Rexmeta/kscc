import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Lock, File, Presentation, BookOpen, Filter, RefreshCw, Plus, Eye, Calendar, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { queryKeys } from '@/lib/queryClient';
import { fetchJson } from '@/lib/queryClient';
import { QueryState } from '@/components/QueryState';
import { PagePagination } from '@/components/PagePagination';
import { formatLocalizedDate } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import type { PostWithTranslations, PostMeta } from '@shared/schema';
import { deletePost } from '@/lib/adminPostApi';

const categoryIcons = {
  reports: FileText,
  forms: File,
  presentations: Presentation,
  guides: BookOpen,
};

const resourceCategoryCards = [
  { key: 'reports', title: 'resources.categories.reports', icon: FileText, cardClass: 'from-primary/5 to-primary/10 border-primary/20', iconClass: 'bg-primary/10', textClass: 'text-primary' },
  { key: 'forms', title: 'resources.categories.forms', icon: File, cardClass: 'from-secondary/5 to-secondary/10 border-secondary/20', iconClass: 'bg-secondary/10', textClass: 'text-secondary' },
  { key: 'presentations', title: 'resources.categories.presentations', icon: Presentation, cardClass: 'from-accent/5 to-accent/10 border-accent/20', iconClass: 'bg-accent/10', textClass: 'text-accent' },
  { key: 'guides', title: 'resources.categories.guides', icon: BookOpen, cardClass: 'from-foreground/5 to-foreground/10 border-foreground/20', iconClass: 'bg-foreground/10', textClass: 'text-foreground' },
] as const;

const getCategoryIcon = (category: string) => {
  return categoryIcons[category as keyof typeof categoryIcons] || FileText;
};

// Helper to get meta value by key
const getMetaValue = (meta: PostMeta[], key: string): any => {
  const metaItem = meta.find(m => m.key === key);
  if (!metaItem) return null;
  
  // Return the appropriate value based on what's set
  if (metaItem.valueText !== null) return metaItem.valueText;
  if (metaItem.valueNumber !== null) return metaItem.valueNumber;
  if (metaItem.valueBoolean !== null) return metaItem.valueBoolean;
  if (metaItem.valueTimestamp !== null) return metaItem.valueTimestamp;
  if (metaItem.value !== null) return metaItem.value;
  return null;
};

// Helper to get translation for current locale with fallback
const getTranslation = (post: PostWithTranslations, locale: string) => {
  if (!post.translations || post.translations.length === 0) {
    return { title: post.slug, content: '', excerpt: '' };
  }
  return post.translations.find(t => t.locale === locale) || post.translations[0];
};

export default function ResourcesPage() {
  const [page, setPage] = useState(1);
  const [categoryInput, setCategoryInput] = useState('');
  const [category, setCategory] = useState('');
  const [selectedResource, setSelectedResource] = useState<PostWithTranslations | null>(null);
  const [, navigate] = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: categoryData, isError: categoryError, refetch: refetchCategories } = useQuery<{ categories: Record<string, number> }>({
    queryKey: ['/api/posts/resource/categories', isAuthenticated ? 'authenticated' : 'public'],
    queryFn: async ({ signal }) => {
       return fetchJson('/api/posts/resource/categories', { signal });
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.posts.list({ postType: 'resource', page, category, language, limit: 20 }),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        postType: 'resource',
        status: 'published',
        limit: '20',
        offset: ((page - 1) * 20).toString(),
        ...(category && { tags: category }), // Use tags for category filtering
        locale: language,
        compact: 'true',
      });
      
       return fetchJson<{ posts: PostWithTranslations[]; total: number }>(`/api/posts?${params}`, { signal });
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: resourceDetail } = useQuery<PostWithTranslations>({
    queryKey: queryKeys.posts.detail(selectedResource?.id || '', language),
    queryFn: async ({ signal }) => {
      return fetchJson<PostWithTranslations>(`/api/posts/${selectedResource!.id}?locale=${language}`, { signal });
    },
    enabled: !!selectedResource?.id,
    staleTime: 5 * 60 * 1000,
  });
  const resourceForDialog = resourceDetail || selectedResource;

  const deleteMutation = useMutation({
    mutationFn: (resourceId: string) => deletePost(resourceId),
    onSuccess: () => {
      toast({
        title: "삭제 완료",
        description: "자료가 성공적으로 삭제되었습니다.",
      });
      // Invalidate all posts-related queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === '/api/posts' || key === '/api/posts/resource/categories';
        },
      });
      setSelectedResource(null);
    },
    onError: (error: Error) => {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (resource: PostWithTranslations) => {
      const fileUrl = getMetaValue(resource.meta || [], 'resource.fileUrl');
      const fileName = getMetaValue(resource.meta || [], 'resource.fileName') || 'download';
      
      if (!fileUrl) {
        throw new Error('File URL not found');
      }
      
      // Increment download count
      if (isAuthenticated) {
        await fetch(`/api/posts/${resource.id}/meta/increment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            key: 'resource.downloadCount',
            amount: 1
          })
        });
      }
      
      // Download the file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "다운로드 완료",
        description: "파일 다운로드가 완료되었습니다.",
      });
      refetch(); // Refresh to update download count
    },
    onError: (error) => {
      toast({
        title: "다운로드 실패",
        description: "파일을 다운로드할 수 없습니다. 권한을 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const resources = data?.posts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleFilter = () => {
    setPage(1);
    setCategory(categoryInput);
  };

  const handleReset = () => {
    setCategoryInput('');
    setCategory('');
    setPage(1);
  };

  const handleEdit = (resourceId: string) => {
    navigate(`/admin?tab=resources&edit=${resourceId}`);
    setSelectedResource(null);
  };

  const handleDelete = (resourceId: string) => {
    if (confirm('정말로 이 자료를 삭제하시겠습니까?')) {
      deleteMutation.mutate(resourceId);
    }
  };

  const handleDownload = (resource: PostWithTranslations, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadMutation.mutate(resource);
  };
  
  const handleViewDetails = (resource: PostWithTranslations) => {
    setSelectedResource(resource);
  };

  const getAccessBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case 'public':
        return <Badge variant="secondary" className="badge-primary">{t('resources.access.public')}</Badge>;
      case 'members':
        return <Badge variant="secondary" className="badge-accent">{t('resources.access.members')}</Badge>;
      case 'premium':
        return <Badge variant="secondary" className="badge-secondary">{t('resources.access.premium')}</Badge>;
      default:
        return <Badge variant="secondary">{accessLevel}</Badge>;
    }
  };

  const getResourceAccessLevel = (resource: PostWithTranslations) =>
    resource.visibility || getMetaValue(resource.meta || [], 'resource.accessLevel') || 'unknown';

  const canAccess = (resource: PostWithTranslations) => {
    const accessLevel = getResourceAccessLevel(resource);
    if (accessLevel === 'public') return true;
    if (accessLevel === 'members' && isAuthenticated) return true;
    if (accessLevel === 'premium' && isAdmin) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Header */}
      <section className="bg-muted dark:bg-muted py-16">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground dark:text-foreground">{t('resources.title')}</h1>
            <p className="text-lg text-muted-foreground dark:text-muted-foreground">Resource Center / 资料中心</p>
          </div>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-16 bg-background dark:bg-background">
        <div className="container">
          <div className="mb-12 grid gap-6 md:grid-cols-4">
            {resourceCategoryCards.map(({ key, title, icon: Icon, cardClass, iconClass, textClass }) => {
              const count = categoryData?.categories?.[key] || 0;
              return (
                <Card key={key} className={`card-hover p-6 bg-gradient-to-br ${cardClass}`}>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${iconClass}`}>
                    <Icon className={`h-6 w-6 ${textClass}`} />
                  </div>
                  <h3 className="mb-2 text-xl font-bold">{t(title)}</h3>
                  <p className="text-sm text-muted-foreground mb-4">현재 등록된 자료</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-sm">자료</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Filter */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">자료 목록</h2>
            {isAdmin && (
              <Button asChild data-testid="button-upload-resource">
                <Link href="/admin?tab=resources">
                  <Plus className="h-4 w-4 mr-2" />
                  자료 업로드
                </Link>
              </Button>
            )}
          </div>
          <Card className="p-6 mb-8">
            <div className="flex gap-4 items-end">
              <div>
                <label className="form-label">카테고리</label>
                <Select value={categoryInput || "all"} onValueChange={(value) => setCategoryInput(value === "all" ? "" : value)}>
                  <SelectTrigger className="w-48" data-testid="select-category">
                    <SelectValue placeholder="전체 카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="reports">{t('resources.categories.reports')}</SelectItem>
                    <SelectItem value="forms">{t('resources.categories.forms')}</SelectItem>
                    <SelectItem value="presentations">{t('resources.categories.presentations')}</SelectItem>
                    <SelectItem value="guides">{t('resources.categories.guides')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

          {/* Resources List */}
          <Card className="overflow-hidden">
            <div className="bg-muted px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-foreground">자료 목록</h3>
            </div>
            
            <div className="divide-y divide-border">
              <QueryState
                isLoading={isLoading}
                isError={isError}
                onRetry={() => refetch()}
                empty={resources.length === 0}
                emptyMessage={t('common.empty')}
              >
                {resources.map((resource: PostWithTranslations) => {
                  const translation = getTranslation(resource, language);
                   const categoryValue = getMetaValue(resource.meta || [], 'resource.category') || 'uncategorized';
                   const fileType = getMetaValue(resource.meta || [], 'resource.fileType');
                   const fileSize = getMetaValue(resource.meta || [], 'resource.fileSize');
                   const accessLevel = getResourceAccessLevel(resource);
                  const IconComponent = getCategoryIcon(categoryValue);
                  const accessible = canAccess(resource);
                  
                  return (
                    <div key={resource.id} className="px-6 py-4 hover:bg-muted transition-all">
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center space-x-4 flex-1 cursor-pointer"
                          onClick={() => handleViewDetails(resource)}
                        >
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                            {accessible ? (
                              <IconComponent className="h-6 w-6 text-accent" />
                            ) : (
                              <Lock className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1" data-testid={`resource-title-${resource.id}`}>
                              {translation?.title || resource.slug}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <File className="h-4 w-4" />
                                <span>{formatLocalizedDate(resource.createdAt, language)}</span>
                              </span>
                               <span>
                                 {fileType ? String(fileType).toUpperCase() : '파일 형식 정보 없음'}
                                 {' · '}
                                 {typeof fileSize === 'number' ? `${Math.round(fileSize / 1024)}KB` : '크기 정보 없음'}
                               </span>
                              {getAccessBadge(accessLevel)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(resource)}
                            data-testid={`button-view-${resource.id}`}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline ml-2">상세보기</span>
                          </Button>
                          {accessible ? (
                            <Button
                              size="sm"
                              onClick={(e) => handleDownload(resource, e)}
                              disabled={downloadMutation.isPending}
                              data-testid={`button-download-${resource.id}`}
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">{t('common.download')}</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              data-testid={`button-login-required-${resource.id}`}
                            >
                              <Lock className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">{t('resources.loginRequired')}</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </QueryState>
            </div>
          </Card>

          {/* Pagination */}
          <PagePagination page={page} totalPages={totalPages} onPageChange={setPage} />

          {/* Member-Only Notice */}
          {!isAuthenticated && (
            <Card className="p-6 mt-8 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground mb-2">회원 전용 자료</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    더 많은 심화 자료, 정책 브리핑, 입찰 공고는 로그인 후 이용하실 수 있습니다.
                  </p>
                  <Button asChild data-testid="button-login-redirect">
                    <Link href="/login">로그인하기</Link>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Resource Detail Dialog */}
      <Dialog open={!!selectedResource} onOpenChange={(open) => !open && setSelectedResource(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {resourceForDialog && getTranslation(resourceForDialog, language)?.title}
            </DialogTitle>
          </DialogHeader>
          
          {resourceForDialog && (
            <div className="space-y-6">
              {/* File Info */}
              <Card className="p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">파일 형식</p>
                    <Badge variant="secondary">
                        {getMetaValue(resourceForDialog.meta || [], 'resource.fileType')
                          ? String(getMetaValue(resourceForDialog.meta || [], 'resource.fileType')).toUpperCase()
                          : '정보 없음'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">파일 크기</p>
                    <p className="font-medium">
                      {typeof getMetaValue(resourceForDialog.meta || [], 'resource.fileSize') === 'number'
                        ? `${Math.round(getMetaValue(resourceForDialog.meta || [], 'resource.fileSize') / 1024)} KB`
                        : '정보 없음'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">카테고리</p>
                    <Badge variant="outline">
                      {(() => {
                        const cat = getMetaValue(resourceForDialog.meta || [], 'resource.category') || 'uncategorized';
                        if (cat === 'reports') return '보고서';
                        if (cat === 'forms') return '양식';
                        if (cat === 'presentations') return '발표자료';
                        if (cat === 'guides') return '가이드북';
                        return cat === 'uncategorized' ? '미분류' : cat;
                      })()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">접근 권한</p>
                    {getAccessBadge(getResourceAccessLevel(resourceForDialog))}
                  </div>
                </div>
              </Card>

              {/* Description */}
              {getTranslation(resourceForDialog, language)?.content && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    설명
                  </h4>
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: getTranslation(resourceForDialog, language)?.content || '' }}
                  />
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">등록일</p>
                    <p className="font-medium">
                      {formatLocalizedDate(resourceForDialog.createdAt, language, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">다운로드</p>
                    <p className="font-medium">
                      {getMetaValue(resourceForDialog.meta || [], 'resource.downloadCount') || 0}회
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex gap-2">
                  {canAccess(resourceForDialog) ? (
                    <Button
                      className="flex-1"
                      onClick={(e) => handleDownload(resourceForDialog, e)}
                      disabled={downloadMutation.isPending}
                      data-testid="button-download-dialog"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadMutation.isPending ? '다운로드 중...' : '다운로드'}
                    </Button>
                  ) : (
                    <Button className="flex-1" disabled>
                      <Lock className="h-4 w-4 mr-2" />
                      접근 권한 없음
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedResource(null)}
                    data-testid="button-close-dialog"
                  >
                    닫기
                  </Button>
                </div>
                
                {/* Admin Actions */}
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEdit(resourceForDialog.id)}
                      data-testid="button-edit-resource"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      수정
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDelete(resourceForDialog.id)}
                      disabled={deleteMutation.isPending}
                      data-testid="button-delete-resource"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
