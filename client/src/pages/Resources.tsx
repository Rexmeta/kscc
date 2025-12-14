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
import { t } from '@/lib/i18n';
import type { PostWithTranslations, PostMeta } from '@shared/schema';
import { deletePost } from '@/lib/adminPostApi';

const categoryIcons = {
  reports: FileText,
  forms: File,
  presentations: Presentation,
  guides: BookOpen,
};

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
  const [category, setCategory] = useState('');
  const [selectedResource, setSelectedResource] = useState<PostWithTranslations | null>(null);
  const [, navigate] = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/posts', 'resource', { page, category, language, limit: 20 }],
    queryFn: async () => {
      const params = new URLSearchParams({
        postType: 'resource',
        status: 'published',
        limit: '20',
        offset: ((page - 1) * 20).toString(),
        ...(category && { tags: category }), // Use tags for category filtering
      });
      
      const response = await fetch(`/api/posts?${params}`, {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {}
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "접근 권한 없음",
            description: "로그인이 필요하거나 권한이 없습니다.",
            variant: "destructive",
          });
        }
        throw new Error('Failed to fetch resources');
      }
      
      return response.json();
    },
  });

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
          return key === '/api/posts';
        }
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
    refetch();
  };

  const handleReset = () => {
    setCategory('');
    setPage(1);
    refetch();
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

  const canAccess = (resource: PostWithTranslations) => {
    const accessLevel = getMetaValue(resource.meta || [], 'resource.accessLevel') || 'public';
    if (accessLevel === 'public') return true;
    if (accessLevel === 'members' && isAuthenticated) return true;
    if (accessLevel === 'premium' && isAdmin) return true;
    return false;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-muted py-16">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">{t('resources.title')}</h1>
            <p className="text-lg text-muted-foreground">Resource Center / 资料中心</p>
          </div>
        </div>
      </section>

      {/* Resource Categories */}
      <section className="py-16 bg-background">
        <div className="container">
          <div className="mb-12 grid gap-6 md:grid-cols-4">
            <Card className="card-hover p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-bold">{t('resources.categories.reports')}</h3>
              <p className="text-sm text-muted-foreground mb-4">사천·충칭 시장 동향 및 산업 분석 자료</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">15</span>
                <span className="text-sm">자료</span>
              </div>
            </Card>
            
            <Card className="card-hover p-6 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                <File className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-2 text-xl font-bold">{t('resources.categories.forms')}</h3>
              <p className="text-sm text-muted-foreground mb-4">회원 가입 및 행사 신청 서식</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">8</span>
                <span className="text-sm">양식</span>
              </div>
            </Card>
            
            <Card className="card-hover p-6 bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Presentation className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-bold">{t('resources.categories.presentations')}</h3>
              <p className="text-sm text-muted-foreground mb-4">세미나 및 행사 프레젠테이션</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">24</span>
                <span className="text-sm">파일</span>
              </div>
            </Card>
            
            <Card className="card-hover p-6 bg-gradient-to-br from-foreground/5 to-foreground/10 border-foreground/20">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-foreground/10">
                <BookOpen className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-bold">{t('resources.categories.guides')}</h3>
              <p className="text-sm text-muted-foreground mb-4">투자 및 진출 가이드 문서</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">12</span>
                <span className="text-sm">문서</span>
              </div>
            </Card>
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
                <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? "" : value)}>
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
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
                </div>
              ) : resources.length > 0 ? (
                resources.map((resource: PostWithTranslations) => {
                  const translation = getTranslation(resource, language);
                  const categoryValue = getMetaValue(resource.meta || [], 'resource.category') || 'reports';
                  const fileType = getMetaValue(resource.meta || [], 'resource.fileType') || 'pdf';
                  const fileSize = getMetaValue(resource.meta || [], 'resource.fileSize') || 0;
                  const accessLevel = getMetaValue(resource.meta || [], 'resource.accessLevel') || 'public';
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
                                <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                              </span>
                              <span>{fileType?.toUpperCase()} · {Math.round(fileSize / 1024)}KB</span>
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
                })
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">자료가 없습니다.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </Button>
              <span className="flex items-center px-4">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
              </Button>
            </div>
          )}

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
              {selectedResource && getTranslation(selectedResource, language)?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedResource && (
            <div className="space-y-6">
              {/* File Info */}
              <Card className="p-4 bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">파일 형식</p>
                    <Badge variant="secondary">
                      {(getMetaValue(selectedResource.meta || [], 'resource.fileType') || 'PDF')?.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">파일 크기</p>
                    <p className="font-medium">
                      {Math.round((getMetaValue(selectedResource.meta || [], 'resource.fileSize') || 0) / 1024)} KB
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">카테고리</p>
                    <Badge variant="outline">
                      {(() => {
                        const cat = getMetaValue(selectedResource.meta || [], 'resource.category') || 'reports';
                        if (cat === 'reports') return '보고서';
                        if (cat === 'forms') return '양식';
                        if (cat === 'presentations') return '발표자료';
                        if (cat === 'guides') return '가이드북';
                        return cat;
                      })()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">접근 권한</p>
                    {getAccessBadge(getMetaValue(selectedResource.meta || [], 'resource.accessLevel') || 'public')}
                  </div>
                </div>
              </Card>

              {/* Description */}
              {getTranslation(selectedResource, language)?.content && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    설명
                  </h4>
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: getTranslation(selectedResource, language)?.content || '' }}
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
                      {new Date(selectedResource.createdAt).toLocaleDateString('ko-KR', {
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
                      {getMetaValue(selectedResource.meta || [], 'resource.downloadCount') || 0}회
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex gap-2">
                  {canAccess(selectedResource) ? (
                    <Button
                      className="flex-1"
                      onClick={(e) => handleDownload(selectedResource, e)}
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
                      onClick={() => handleEdit(selectedResource.id)}
                      data-testid="button-edit-resource"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      수정
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDelete(selectedResource.id)}
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
