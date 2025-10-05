import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Newspaper, 
  FileText, 
  MessageSquare, 
  Building2,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { News, Event, Member, Resource, Inquiry, Partner } from '@shared/schema';

// Form schemas
const newsSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  excerpt: z.string().min(1, '요약을 입력해주세요'),
  content: z.string().min(1, '내용을 입력해주세요'),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  isPublished: z.boolean().default(false),
});

const eventSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  description: z.string().min(1, '설명을 입력해주세요'),
  content: z.string().optional(),
  eventDate: z.string().min(1, '날짜를 선택해주세요'),
  location: z.string().min(1, '장소를 입력해주세요'),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  eventType: z.string().default('offline'),
  capacity: z.number().optional(),
  fee: z.number().default(0),
  isPublic: z.boolean().default(true),
});

const resourceSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  description: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  fileUrl: z.string().min(1, '파일 URL을 입력해주세요'),
  fileName: z.string().min(1, '파일명을 입력해주세요'),
  fileType: z.string().min(1, '파일 형식을 입력해주세요'),
  accessLevel: z.string().default('public'),
  isActive: z.boolean().default(true),
});

const partnerSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  logo: z.string().min(1, '로고 URL을 입력해주세요'),
  website: z.string().optional(),
  description: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  isActive: z.boolean().default(true),
  order: z.number().default(0),
});

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dashboard stats query
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin,
  });

  // Data queries
  const { data: membersData } = useQuery({
    queryKey: ['/api/members', { admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/members?limit=50', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'members',
  });

  const { data: eventsData } = useQuery({
    queryKey: ['/api/events', { admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/events?limit=50', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'events',
  });

  const { data: newsData } = useQuery({
    queryKey: ['/api/news', { admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/news?limit=50', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'news',
  });

  const { data: resourcesData } = useQuery({
    queryKey: ['/api/resources', { admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/resources?limit=50', {
        headers: { 'Authorization': `Bearer ${localStorage.getToken('token')}` }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'resources',
  });

  const { data: inquiriesData } = useQuery({
    queryKey: ['/api/inquiries'],
    queryFn: async () => {
      const response = await fetch('/api/inquiries', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'inquiries',
  });

  const { data: partnersData } = useQuery({
    queryKey: ['/api/partners', { admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/partners', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'partners',
  });

  // Mutations
  const createNewsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/news', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
      toast({ title: "뉴스가 생성되었습니다" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/events', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({ title: "행사가 생성되었습니다" });
    },
  });

  const createResourceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/resources', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
      toast({ title: "자료가 생성되었습니다" });
    },
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/partners', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
      toast({ title: "파트너가 생성되었습니다" });
    },
  });

  const updateInquiryMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & any) => {
      const response = await apiRequest('PUT', `/api/inquiries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
      toast({ title: "문의가 업데이트되었습니다" });
    },
  });

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">관리자 권한 필요</h2>
            <p className="text-muted-foreground">이 페이지에 접근할 권한이 없습니다.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-muted py-16">
        <div className="container">
          <h1 className="mb-2 text-4xl font-bold text-foreground">{t('admin.title')}</h1>
          <p className="text-lg text-muted-foreground">시스템 관리 및 콘텐츠 관리</p>
        </div>
      </section>

      {/* Admin Content */}
      <section className="py-8">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">{t('admin.dashboard')}</TabsTrigger>
              <TabsTrigger value="members" data-testid="tab-members">{t('admin.members')}</TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">{t('admin.events')}</TabsTrigger>
              <TabsTrigger value="news" data-testid="tab-news">{t('admin.news')}</TabsTrigger>
              <TabsTrigger value="resources" data-testid="tab-resources">{t('admin.resources')}</TabsTrigger>
              <TabsTrigger value="inquiries" data-testid="tab-inquiries">{t('admin.inquiries')}</TabsTrigger>
              <TabsTrigger value="partners" data-testid="tab-partners">{t('admin.partners')}</TabsTrigger>
            </TabsList>

            {/* Dashboard */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 회원수</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-members">
                      {dashboardStats?.stats?.totalMembers || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">총 행사수</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-events">
                      {dashboardStats?.stats?.totalEvents || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">뉴스 기사</CardTitle>
                    <Newspaper className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-news">
                      {dashboardStats?.stats?.totalNews || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">문의사항</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-total-inquiries">
                      {dashboardStats?.stats?.totalInquiries || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Members Management */}
            <TabsContent value="members" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">회원 관리</h2>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {membersData?.members?.map((member: Member) => (
                      <div key={member.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{member.companyName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {member.contactPerson} • {member.contactEmail}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            member.membershipStatus === 'active' ? 'default' :
                            member.membershipStatus === 'pending' ? 'secondary' :
                            'destructive'
                          }>
                            {member.membershipStatus === 'active' ? '활성' :
                             member.membershipStatus === 'pending' ? '승인대기' : '비활성'}
                          </Badge>
                          <Badge variant="outline">
                            {member.membershipLevel === 'premium' ? '프리미엄' :
                             member.membershipLevel === 'sponsor' ? '후원' : '정회원'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Management */}
            <TabsContent value="events" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">행사 관리</h2>
                <CreateEventDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/events'] })} />
              </div>
              
              <div className="grid gap-4">
                {eventsData?.events?.map((event: Event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">{event.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                            <span>{event.location}</span>
                            <Badge variant="outline">{event.category}</Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* News Management */}
            <TabsContent value="news" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">뉴스 관리</h2>
                <CreateNewsDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/news'] })} />
              </div>
              
              <div className="grid gap-4">
                {newsData?.articles?.map((article: News) => (
                  <Card key={article.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">{article.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{article.excerpt}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '미발행'}</span>
                            <Badge variant="outline">{article.category}</Badge>
                            <Badge variant={article.isPublished ? 'default' : 'secondary'}>
                              {article.isPublished ? '발행됨' : '미발행'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Resources Management */}
            <TabsContent value="resources" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">자료 관리</h2>
                <CreateResourceDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/resources'] })} />
              </div>
              
              <div className="grid gap-4">
                {resourcesData?.resources?.map((resource: Resource) => (
                  <Card key={resource.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">{resource.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{resource.fileName}</span>
                            <Badge variant="outline">{resource.category}</Badge>
                            <Badge variant="outline">{resource.accessLevel}</Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Inquiries Management */}
            <TabsContent value="inquiries" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">문의 관리</h2>
              </div>
              
              <div className="grid gap-4">
                {inquiriesData?.inquiries?.map((inquiry: Inquiry) => (
                  <Card key={inquiry.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">{inquiry.subject}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {inquiry.name} • {inquiry.email}
                          </p>
                          <p className="text-sm mb-2">{inquiry.message}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{new Date(inquiry.createdAt).toLocaleDateString()}</span>
                            <Badge variant="outline">{inquiry.category}</Badge>
                            <Badge variant={
                              inquiry.status === 'resolved' ? 'default' :
                              inquiry.status === 'in_progress' ? 'secondary' :
                              'destructive'
                            }>
                              {inquiry.status === 'resolved' ? '해결됨' :
                               inquiry.status === 'in_progress' ? '처리중' : '새 문의'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {inquiry.status !== 'resolved' && (
                            <Button
                              size="sm"
                              onClick={() => updateInquiryMutation.mutate({
                                id: inquiry.id,
                                status: 'resolved'
                              })}
                            >
                              <CheckCircle className="h-4 w-4" />
                              해결
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Partners Management */}
            <TabsContent value="partners" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">파트너 관리</h2>
                <CreatePartnerDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/partners'] })} />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {partnersData?.map((partner: Partner) => (
                  <Card key={partner.id}>
                    <CardContent className="p-4">
                      <div className="text-center space-y-2">
                        <div className="h-16 bg-muted rounded flex items-center justify-center">
                          {partner.logo ? (
                            <img src={partner.logo} alt={partner.name} className="h-12 w-auto" />
                          ) : (
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <h4 className="font-medium">{partner.name}</h4>
                        <Badge variant="outline">{partner.category}</Badge>
                        <div className="flex justify-center space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}

// Create News Dialog Component
function CreateNewsDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(newsSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/news', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "뉴스가 생성되었습니다" });
      reset();
      setOpen(false);
      onSuccess();
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-news">
          <Plus className="h-4 w-4" />
          뉴스 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>새 뉴스 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">제목</label>
            <Input {...register('title')} data-testid="input-news-title" />
            {errors.title && <p className="text-sm text-destructive mt-1">{String(errors.title.message)}</p>}
          </div>
          
          <div>
            <label className="form-label">카테고리</label>
            <Select onValueChange={(value) => register('category').onChange({ target: { value } })}>
              <SelectTrigger data-testid="select-news-category">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notice">공지사항</SelectItem>
                <SelectItem value="press">보도자료</SelectItem>
                <SelectItem value="activity">활동소식</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="form-label">요약</label>
            <Textarea {...register('excerpt')} data-testid="textarea-news-excerpt" />
            {errors.excerpt && <p className="text-sm text-destructive mt-1">{String(errors.excerpt.message)}</p>}
          </div>
          
          <div>
            <label className="form-label">내용</label>
            <Textarea rows={8} {...register('content')} data-testid="textarea-news-content" />
            {errors.content && <p className="text-sm text-destructive mt-1">{String(errors.content.message)}</p>}
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-news">
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Event Dialog Component
function CreateEventDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(eventSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/events', {
        ...data,
        eventDate: new Date(data.eventDate).toISOString(),
        capacity: data.capacity ? parseInt(data.capacity) : null,
        fee: parseInt(data.fee) || 0,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "행사가 생성되었습니다" });
      reset();
      setOpen(false);
      onSuccess();
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-event">
          <Plus className="h-4 w-4" />
          행사 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>새 행사 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">제목</label>
              <Input {...register('title')} data-testid="input-event-title" />
              {errors.title && <p className="text-sm text-destructive mt-1">{String(errors.title.message)}</p>}
            </div>
            <div>
              <label className="form-label">카테고리</label>
              <Select onValueChange={(value) => register('category').onChange({ target: { value } })}>
                <SelectTrigger data-testid="select-event-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="networking">네트워킹</SelectItem>
                  <SelectItem value="seminar">세미나</SelectItem>
                  <SelectItem value="workshop">워크샵</SelectItem>
                  <SelectItem value="cultural">문화</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="form-label">설명</label>
            <Textarea {...register('description')} data-testid="textarea-event-description" />
            {errors.description && <p className="text-sm text-destructive mt-1">{String(errors.description.message)}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">날짜</label>
              <Input type="datetime-local" {...register('eventDate')} data-testid="input-event-date" />
              {errors.eventDate && <p className="text-sm text-destructive mt-1">{String(errors.eventDate.message)}</p>}
            </div>
            <div>
              <label className="form-label">장소</label>
              <Input {...register('location')} data-testid="input-event-location" />
              {errors.location && <p className="text-sm text-destructive mt-1">{String(errors.location.message)}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">정원</label>
              <Input type="number" {...register('capacity', { valueAsNumber: true })} data-testid="input-event-capacity" />
            </div>
            <div>
              <label className="form-label">참가비</label>
              <Input type="number" {...register('fee', { valueAsNumber: true })} data-testid="input-event-fee" />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-event">
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Resource Dialog Component
function CreateResourceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(resourceSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/resources', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "자료가 생성되었습니다" });
      reset();
      setOpen(false);
      onSuccess();
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-resource">
          <Plus className="h-4 w-4" />
          자료 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>새 자료 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">제목</label>
            <Input {...register('title')} data-testid="input-resource-title" />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">카테고리</label>
              <Select onValueChange={(value) => register('category').onChange({ target: { value } })}>
                <SelectTrigger data-testid="select-resource-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reports">보고서</SelectItem>
                  <SelectItem value="forms">양식</SelectItem>
                  <SelectItem value="presentations">발표자료</SelectItem>
                  <SelectItem value="guides">가이드북</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">접근 수준</label>
              <Select onValueChange={(value) => register('accessLevel').onChange({ target: { value } })}>
                <SelectTrigger data-testid="select-resource-access">
                  <SelectValue placeholder="접근 수준 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">공개</SelectItem>
                  <SelectItem value="members">회원전용</SelectItem>
                  <SelectItem value="premium">프리미엄</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="form-label">설명</label>
            <Textarea {...register('description')} data-testid="textarea-resource-description" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">파일 URL</label>
              <Input {...register('fileUrl')} data-testid="input-resource-url" />
              {errors.fileUrl && <p className="text-sm text-destructive mt-1">{String(errors.fileUrl.message)}</p>}
            </div>
            <div>
              <label className="form-label">파일명</label>
              <Input {...register('fileName')} data-testid="input-resource-filename" />
              {errors.fileName && <p className="text-sm text-destructive mt-1">{String(errors.fileName.message)}</p>}
            </div>
            <div>
              <label className="form-label">파일 형식</label>
              <Input {...register('fileType')} placeholder="PDF, DOCX 등" data-testid="input-resource-filetype" />
              {errors.fileType && <p className="text-sm text-destructive mt-1">{String(errors.fileType.message)}</p>}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-resource">
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Partner Dialog Component
function CreatePartnerDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(partnerSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/partners', {
        ...data,
        order: parseInt(data.order) || 0,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "파트너가 생성되었습니다" });
      reset();
      setOpen(false);
      onSuccess();
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-partner">
          <Plus className="h-4 w-4" />
          파트너 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>새 파트너 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">이름</label>
              <Input {...register('name')} data-testid="input-partner-name" />
              {errors.name && <p className="text-sm text-destructive mt-1">{String(errors.name.message)}</p>}
            </div>
            <div>
              <label className="form-label">카테고리</label>
              <Select onValueChange={(value) => register('category').onChange({ target: { value } })}>
                <SelectTrigger data-testid="select-partner-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sponsor">후원사</SelectItem>
                  <SelectItem value="partner">협력사</SelectItem>
                  <SelectItem value="government">정부기관</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="form-label">로고 URL</label>
            <Input {...register('logo')} data-testid="input-partner-logo" />
            {errors.logo && <p className="text-sm text-destructive mt-1">{String(errors.logo.message)}</p>}
          </div>
          
          <div>
            <label className="form-label">웹사이트</label>
            <Input {...register('website')} data-testid="input-partner-website" />
          </div>
          
          <div>
            <label className="form-label">설명</label>
            <Textarea {...register('description')} data-testid="textarea-partner-description" />
          </div>
          
          <div>
            <label className="form-label">정렬 순서</label>
            <Input type="number" {...register('order', { valueAsNumber: true })} data-testid="input-partner-order" />
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-partner">
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
