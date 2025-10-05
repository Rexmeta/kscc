import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Lock, File, Presentation, BookOpen, Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';
import { Resource } from '@shared/schema';

const categoryIcons = {
  reports: FileText,
  forms: File,
  presentations: Presentation,
  guides: BookOpen,
};

const getCategoryIcon = (category: string) => {
  return categoryIcons[category as keyof typeof categoryIcons] || FileText;
};

export default function ResourcesPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/resources', { page, category, limit: 20 }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(category && { category }),
      });
      const response = await fetch(`/api/resources?${params}`, {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {}
      });
      return response.json();
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (resourceId: string) => {
      const response = await fetch(`/api/resources/${resourceId}/download`, {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        } : {}
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      window.open(data.downloadUrl, '_blank');
      toast({
        title: "다운로드 시작",
        description: "파일 다운로드가 시작되었습니다.",
      });
    },
    onError: (error) => {
      toast({
        title: "다운로드 실패",
        description: "파일을 다운로드할 수 없습니다. 권한을 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const resources = data?.resources || [];
  const totalPages = data?.totalPages || 1;

  const handleFilter = () => {
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setCategory('');
    setPage(1);
    refetch();
  };

  const handleDownload = (resourceId: string) => {
    downloadMutation.mutate(resourceId);
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

  const canAccess = (resource: Resource) => {
    if (resource.accessLevel === 'public') return true;
    if (resource.accessLevel === 'members' && isAuthenticated) return true;
    if (resource.accessLevel === 'premium' && isAdmin) return true;
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
                resources.map((resource: Resource) => {
                  const IconComponent = getCategoryIcon(resource.category);
                  const accessible = canAccess(resource);
                  
                  return (
                    <div key={resource.id} className="px-6 py-4 hover:bg-muted transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                            {accessible ? (
                              <IconComponent className="h-6 w-6 text-accent" />
                            ) : (
                              <Lock className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1" data-testid={`resource-title-${resource.id}`}>
                              {resource.title}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <File className="h-4 w-4" />
                                <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                              </span>
                              <span>{resource.fileType?.toUpperCase()} · {Math.round((resource.fileSize || 0) / 1024)}KB</span>
                              {getAccessBadge(resource.accessLevel)}
                            </div>
                          </div>
                        </div>
                        {accessible ? (
                          <Button
                            onClick={() => handleDownload(resource.id)}
                            disabled={downloadMutation.isPending}
                            className="ml-4"
                            data-testid={`button-download-${resource.id}`}
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('common.download')}</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            disabled
                            className="ml-4"
                            data-testid={`button-login-required-${resource.id}`}
                          >
                            <Lock className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('resources.loginRequired')}</span>
                          </Button>
                        )}
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
                  <Button data-testid="button-login-redirect">
                    로그인하기
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
