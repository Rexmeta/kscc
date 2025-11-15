import { useState, useEffect } from 'react';
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
  XCircle,
  X,
  Upload
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { News, Event, Member, Resource, Inquiry, Partner, type PostWithTranslations } from '@shared/schema';
import { ObjectUploader } from '@/components/ObjectUploader';
import type { UploadResult } from '@uppy/core';
import { 
  mapNewsFormToPost, mapPostToNewsForm, type NewsFormData,
  mapEventFormToPost, mapPostToEventForm, type EventFormData,
  mapResourceFormToPost, mapPostToResourceForm, type ResourceFormData
} from '@/lib/adminPostMappers';
import { createPost, updatePost, deletePost } from '@/lib/adminPostApi';

// Form schemas
const newsSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  excerpt: z.string().min(1, '요약을 입력해주세요'),
  content: z.string().min(1, '내용을 입력해주세요'),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  featuredImage: z.string().url('유효한 URL을 입력해주세요').optional().or(z.literal('')),
  images: z.array(z.string().url()).optional(),
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
  capacity: z.number().optional().or(z.nan()).transform((val) => Number.isNaN(val) ? undefined : val),
  fee: z.number().optional().or(z.nan()).transform((val) => Number.isNaN(val) ? 0 : val),
  images: z.array(z.string()).optional(),
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

// Location Picker Component  
function LocationPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchLocation = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `countrycodes=kr`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const selectLocation = (location: any) => {
    const displayName = location.display_name || location.name;
    onChange(displayName);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="직접 입력 또는 검색"
          data-testid="input-event-location"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowResults(!showResults);
            if (!showResults && !searchQuery) {
              setSearchQuery(value);
              searchLocation(value);
            }
          }}
          data-testid="button-search-location"
        >
          🗺️ 검색
        </Button>
      </div>
      
      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="장소 검색... (예: 서울시청, 강남역)"
              autoFocus
              data-testid="input-location-search"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-muted-foreground">검색 중...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full text-left px-4 py-2 hover:bg-secondary transition-colors"
                  onClick={() => selectLocation(result)}
                  data-testid={`location-result-${index}`}
                >
                  <div className="font-medium">{result.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {result.display_name}
                  </div>
                </button>
              ))
            ) : searchQuery.length >= 2 ? (
              <div className="p-4 text-center text-muted-foreground">
                검색 결과가 없습니다
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                장소명을 입력해주세요 (최소 2자)
              </div>
            )}
          </div>
          <div className="p-2 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowResults(false)}
              className="w-full"
            >
              닫기
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [registrationsDialogOpen, setRegistrationsDialogOpen] = useState(false);
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
  const { data: usersData } = useQuery({
    queryKey: ['/api/users'],
    enabled: isAdmin && activeTab === 'users',
  });

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
    queryKey: ['/api/posts', { postType: 'event', admin: true }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/posts?postType=event&limit=50');
      const data = await response.json();
      // Convert PostWithTranslations[] to legacy Event format for backward compatibility
      return {
        events: data.posts?.map((post: PostWithTranslations) => ({
          ...mapPostToEventForm(post),
          id: post.id,
        })) || [],
        total: data.total || 0,
      };
    },
    enabled: isAdmin && activeTab === 'events',
  });

  const { data: newsData } = useQuery({
    queryKey: ['/api/posts', { postType: 'news', admin: true }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/posts?postType=news&limit=50');
      const data = await response.json();
      // Convert PostWithTranslations[] to legacy News format for backward compatibility
      return {
        articles: data.posts?.map((post: PostWithTranslations) => ({
          ...mapPostToNewsForm(post),
          id: post.id,
        })) || [],
        total: data.total || 0,
      };
    },
    enabled: isAdmin && activeTab === 'news',
  });

  const { data: resourcesData } = useQuery({
    queryKey: ['/api/posts', { postType: 'resource', admin: true }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/posts?postType=resource&limit=50');
      const data = await response.json();
      // Convert PostWithTranslations[] to legacy Resource format for backward compatibility
      return {
        resources: data.posts?.map((post: PostWithTranslations) => ({
          ...mapPostToResourceForm(post),
          id: post.id,
        })) || [],
        total: data.total || 0,
      };
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
    mutationFn: async (formData: NewsFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapNewsFormToPost(formData, user.id);
      return await createPost({ post, translation, meta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] });
      toast({ title: "뉴스가 생성되었습니다" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (formData: EventFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapEventFormToPost(formData, user.id);
      return await createPost({ post, translation, meta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] });
      toast({ title: "행사가 생성되었습니다" });
    },
  });

  const createResourceMutation = useMutation({
    mutationFn: async (formData: ResourceFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapResourceFormToPost(formData, user.id);
      return await createPost({ post, translation, meta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'resource', admin: true }] });
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

  // Update mutations
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...formData }: { id: string } & EventFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapEventFormToPost(formData, user.id);
      return await updatePost({ postId: id, post, translation, meta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] });
      toast({ title: "행사가 수정되었습니다" });
      setEditDialogOpen(false);
    },
  });

  const updateNewsMutation = useMutation({
    mutationFn: async ({ id, ...formData }: { id: string } & NewsFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapNewsFormToPost(formData, user.id);
      return await updatePost({ postId: id, post, translation, meta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] });
      toast({ title: "뉴스가 수정되었습니다" });
      setEditDialogOpen(false);
    },
  });

  const updateResourceMutation = useMutation({
    mutationFn: async ({ id, ...formData }: { id: string } & ResourceFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapResourceFormToPost(formData, user.id);
      return await updatePost({ postId: id, post, translation, meta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'resource', admin: true }] });
      toast({ title: "자료가 수정되었습니다" });
      setEditDialogOpen(false);
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & any) => {
      const response = await apiRequest('PUT', `/api/partners/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
      toast({ title: "파트너가 수정되었습니다" });
      setEditDialogOpen(false);
    },
  });

  // Delete mutations
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] });
      toast({ title: "행사가 삭제되었습니다" });
    },
  });

  const deleteNewsMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] });
      toast({ title: "뉴스가 삭제되었습니다" });
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deletePost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'resource', admin: true }] });
      toast({ title: "자료가 삭제되었습니다" });
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/partners/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
      toast({ title: "파트너가 삭제되었습니다" });
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
            <TabsList className="grid grid-cols-8 w-full">
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">{t('admin.dashboard')}</TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">사용자</TabsTrigger>
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

            {/* Users Management */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">사용자 관리</h2>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {usersData?.map((user: any) => (
                      <div key={user.id} className="p-4 flex items-center justify-between" data-testid={`row-user-${user.id}`}>
                        <div className="flex items-center space-x-4">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.name}</h4>
                            <p className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" data-testid={`badge-tier-${user.id}`}>
                            {user.membership ? user.membership.tierName : '없음'}
                          </Badge>
                          <Badge variant="secondary" data-testid={`badge-role-${user.id}`}>
                            {user.membership ? user.membership.roleName : '없음'}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              toast({ 
                                title: "권한 편집 기능은 곧 추가될 예정입니다.",
                                description: `사용자: ${user.name}`
                              });
                            }}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!usersData || usersData.length === 0) && (
                      <div className="p-8 text-center text-muted-foreground">
                        사용자가 없습니다
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
                <CreateEventDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] })} />
              </div>
              
              <div className="grid gap-4">
                {eventsData?.events?.map((event: any) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        {event.images && event.images.length > 0 && (
                          <img 
                            src={event.images[0]} 
                            alt={event.title}
                            className="w-20 h-20 object-cover rounded border"
                            data-testid={`img-event-${event.id}`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">{event.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                            <span>{event.location}</span>
                            <Badge variant="outline">{event.category}</Badge>
                            <Badge variant="secondary" data-testid={`badge-registration-count-${event.id}`}>
                              신청자: {event.registrationCount || 0}명
                              {event.capacity && ` / ${event.capacity}명`}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(event);
                              setRegistrationsDialogOpen(true);
                            }}
                            data-testid={`button-registrations-event-${event.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(event);
                              setEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-event-${event.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(event);
                              setViewDialogOpen(true);
                            }}
                            data-testid={`button-view-event-${event.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (confirm('정말 삭제하시겠습니까?')) {
                                deleteEventMutation.mutate(event.id);
                              }
                            }}
                            data-testid={`button-delete-event-${event.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
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
                <CreateNewsDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] })} />
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(article);
                              setEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-news-${article.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(article);
                              setViewDialogOpen(true);
                            }}
                            data-testid={`button-view-news-${article.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (confirm('정말 삭제하시겠습니까?')) {
                                deleteNewsMutation.mutate(article.id);
                              }
                            }}
                            data-testid={`button-delete-news-${article.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
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
                <CreateResourceDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'resource', admin: true }] })} />
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(resource);
                              setEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-resource-${resource.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(resource);
                              setViewDialogOpen(true);
                            }}
                            data-testid={`button-view-resource-${resource.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (confirm('정말 삭제하시겠습니까?')) {
                                deleteResourceMutation.mutate(resource.id);
                              }
                            }}
                            data-testid={`button-delete-resource-${resource.id}`}
                          >
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(partner);
                              setEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-partner-${partner.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (confirm('정말 삭제하시겠습니까?')) {
                                deletePartnerMutation.mutate(partner.id);
                              }
                            }}
                            data-testid={`button-delete-partner-${partner.id}`}
                          >
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

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상세 보기</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {activeTab === 'events' && (
                <>
                  <div>
                    <h3 className="font-semibold mb-1">제목</h3>
                    <p>{selectedItem.title}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">설명</h3>
                    <p>{selectedItem.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-1">날짜</h3>
                      <p>{new Date(selectedItem.eventDate).toLocaleString()}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">장소</h3>
                      <p>{selectedItem.location}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">카테고리</h3>
                    <Badge>{selectedItem.category}</Badge>
                  </div>
                  {selectedItem.content && (
                    <div>
                      <h3 className="font-semibold mb-1">상세 내용</h3>
                      <p className="whitespace-pre-wrap">{selectedItem.content}</p>
                    </div>
                  )}
                  {selectedItem.images && selectedItem.images.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">이미지</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedItem.images.map((image: string, index: number) => (
                          <img
                            key={index}
                            src={image}
                            alt={`${selectedItem.title} 이미지 ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                            data-testid={`img-event-view-${index}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              {activeTab === 'news' && (
                <>
                  <div>
                    <h3 className="font-semibold mb-1">제목</h3>
                    <p>{selectedItem.title}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">요약</h3>
                    <p>{selectedItem.excerpt}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">내용</h3>
                    <p className="whitespace-pre-wrap">{selectedItem.content}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{selectedItem.category}</Badge>
                    <Badge variant={selectedItem.isPublished ? 'default' : 'secondary'}>
                      {selectedItem.isPublished ? '발행됨' : '미발행'}
                    </Badge>
                  </div>
                </>
              )}
              {activeTab === 'resources' && (
                <>
                  <div>
                    <h3 className="font-semibold mb-1">제목</h3>
                    <p>{selectedItem.title}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">설명</h3>
                    <p>{selectedItem.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-1">파일명</h3>
                      <p>{selectedItem.fileName}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">파일 형식</h3>
                      <p>{selectedItem.fileType}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">파일 URL</h3>
                    <a href={selectedItem.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {selectedItem.fileUrl}
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{selectedItem.category}</Badge>
                    <Badge variant="outline">{selectedItem.accessLevel}</Badge>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>수정하기</DialogTitle>
          </DialogHeader>
          {selectedItem && activeTab === 'events' && (
            <EditEventForm 
              event={selectedItem} 
              onSuccess={() => {
                setEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] });
              }}
              updateMutation={updateEventMutation}
            />
          )}
          {selectedItem && activeTab === 'news' && (
            <EditNewsForm 
              article={selectedItem} 
              onSuccess={() => {
                setEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] });
              }}
              updateMutation={updateNewsMutation}
            />
          )}
          {selectedItem && activeTab === 'resources' && (
            <EditResourceForm 
              resource={selectedItem} 
              onSuccess={() => {
                setEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'resource', admin: true }] });
              }}
              updateMutation={updateResourceMutation}
            />
          )}
          {selectedItem && activeTab === 'partners' && (
            <EditPartnerForm 
              partner={selectedItem} 
              onSuccess={() => {
                setEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
              }}
              updateMutation={updatePartnerMutation}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Event Registrations Dialog */}
      <EventRegistrationsDialog
        open={registrationsDialogOpen}
        onOpenChange={setRegistrationsDialogOpen}
        event={selectedItem}
      />
    </div>
  );
}

// Edit Forms
function EditEventForm({ event, onSuccess, updateMutation }: any) {
  const [imageUrls, setImageUrls] = useState<string[]>(event.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event.title,
      description: event.description,
      content: event.content || '',
      eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
      location: event.location,
      category: event.category,
      eventType: event.eventType || 'offline',
      capacity: event.capacity || undefined,
      fee: event.fee || 0,
      images: event.images || [],
      isPublic: event.isPublic !== false,
    }
  });

  const handleGetUploadParameters = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleEventImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: uploadURL }),
      });
      
      const data = await response.json();
      const updated = [...imageUrls, data.objectPath];
      setImageUrls(updated);
      setValue('images', updated);
      toast({ title: '이미지 업로드 완료!' });
    }
  };

  const addImageUrl = () => {
    if (newImageUrl.trim() && newImageUrl.startsWith('http')) {
      const updated = [...imageUrls, newImageUrl.trim()];
      setImageUrls(updated);
      setValue('images', updated);
      setNewImageUrl('');
    }
  };

  const removeImageUrl = (index: number) => {
    const updated = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updated);
    setValue('images', updated);
  };

  const onSubmit = (data: any) => {
    updateMutation.mutate({
      id: event.id,
      ...data,
      eventDate: new Date(data.eventDate).toISOString(),
      images: imageUrls.length > 0 ? imageUrls : null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="form-label">제목</label>
        <Input {...register('title')} data-testid="input-event-title" />
        {errors.title && <p className="text-sm text-destructive mt-1">{String(errors.title.message)}</p>}
      </div>
      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('description')} data-testid="input-event-description" />
        {errors.description && <p className="text-sm text-destructive mt-1">{String(errors.description.message)}</p>}
      </div>
      <div>
        <label className="form-label">상세 내용</label>
        <Textarea rows={8} {...register('content')} data-testid="textarea-event-content" placeholder="행사의 상세 내용을 입력하세요 (줄바꿈 가능)" />
        {errors.content && <p className="text-sm text-destructive mt-1">{String(errors.content.message)}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">날짜</label>
          <Input type="datetime-local" {...register('eventDate')} data-testid="input-event-date" />
        </div>
        <div>
          <label className="form-label">장소</label>
          <LocationPicker
            value={watch('location') || ''}
            onChange={(value) => setValue('location', value)}
          />
        </div>
      </div>
      <div>
        <label className="form-label">카테고리</label>
        <Select defaultValue={event.category} onValueChange={(value) => setValue('category', value)}>
          <SelectTrigger data-testid="select-event-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="networking">네트워킹</SelectItem>
            <SelectItem value="seminar">세미나</SelectItem>
            <SelectItem value="workshop">워크샵</SelectItem>
            <SelectItem value="cultural">문화</SelectItem>
          </SelectContent>
        </Select>
        {errors.category && <p className="text-sm text-destructive mt-1">{String(errors.category.message)}</p>}
      </div>
      <div>
        <label className="form-label">이미지</label>
        <div className="flex gap-2 mb-2">
          <Input 
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg 또는 파일 업로드" 
            data-testid="input-event-new-image-url"
          />
          <Button type="button" onClick={addImageUrl} variant="outline" data-testid="button-add-event-image">
            <Plus className="h-4 w-4" />
          </Button>
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={10485760}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleEventImageUpload}
            buttonClassName="whitespace-nowrap"
          >
            <Upload className="h-4 w-4 mr-2" />
            파일 업로드
          </ObjectUploader>
        </div>
        {imageUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`이미지 ${index + 1}`}
                  className="w-full h-32 object-cover rounded border bg-gray-100 dark:bg-gray-800"
                  data-testid={`img-event-edit-preview-${index}`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                  }}
                />
                <Button 
                  type="button" 
                  size="sm" 
                  variant="destructive" 
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImageUrl(index)}
                  data-testid={`button-remove-event-image-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="text-xs text-muted-foreground mt-1 truncate" title={url}>
                  {url}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-event">
          {updateMutation.isPending ? '수정 중...' : '수정'}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess} data-testid="button-cancel-event">
          취소
        </Button>
      </div>
    </form>
  );
}

function EditNewsForm({ article, onSuccess, updateMutation }: any) {
  const [imageUrls, setImageUrls] = useState<string[]>(article.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      category: article.category,
      featuredImage: article.featuredImage || '',
      images: article.images || [],
      isPublished: article.isPublished,
    }
  });

  const handleGetUploadParameters = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleFeaturedImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: uploadURL }),
      });
      
      const data = await response.json();
      setValue('featuredImage', data.objectPath);
      toast({ title: '대표 이미지 업로드 완료!' });
    }
  };

  const handleAdditionalImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: uploadURL }),
      });
      
      const data = await response.json();
      const updated = [...imageUrls, data.objectPath];
      setImageUrls(updated);
      setValue('images', updated);
      toast({ title: '이미지 업로드 완료!' });
    }
  };

  const addImageUrl = () => {
    if (newImageUrl.trim() && newImageUrl.startsWith('http')) {
      const updated = [...imageUrls, newImageUrl.trim()];
      setImageUrls(updated);
      setValue('images', updated);
      setNewImageUrl('');
    }
  };

  const removeImageUrl = (index: number) => {
    const updated = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updated);
    setValue('images', updated);
  };

  const onSubmit = (data: any) => {
    updateMutation.mutate({ 
      id: article.id, 
      ...data,
      images: imageUrls.length > 0 ? imageUrls : null,
      featuredImage: data.featuredImage || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="form-label">제목</label>
        <Input {...register('title')} data-testid="input-news-title" />
        {errors.title && <p className="text-sm text-destructive mt-1">{String(errors.title.message)}</p>}
      </div>
      <div>
        <label className="form-label">요약</label>
        <Textarea {...register('excerpt')} data-testid="input-news-excerpt" />
        {errors.excerpt && <p className="text-sm text-destructive mt-1">{String(errors.excerpt.message)}</p>}
      </div>
      <div>
        <label className="form-label">내용</label>
        <Textarea rows={8} {...register('content')} data-testid="input-news-content" />
        {errors.content && <p className="text-sm text-destructive mt-1">{String(errors.content.message)}</p>}
      </div>
      <div>
        <label className="form-label">카테고리</label>
        <Select defaultValue={article.category} onValueChange={(value) => register('category').onChange({ target: { value } })}>
          <SelectTrigger data-testid="select-news-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="notice">공지사항</SelectItem>
            <SelectItem value="press">보도자료</SelectItem>
            <SelectItem value="activity">활동소식</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="form-label">대표 이미지</label>
        <div className="flex gap-2 mb-2">
          <Input 
            {...register('featuredImage')} 
            placeholder="https://example.com/image.jpg 또는 파일 업로드" 
            data-testid="input-featured-image"
          />
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={10485760}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleFeaturedImageUpload}
            buttonClassName="whitespace-nowrap"
          >
            <Upload className="h-4 w-4 mr-2" />
            파일 업로드
          </ObjectUploader>
        </div>
        {errors.featuredImage && <p className="text-sm text-destructive mt-1">{String(errors.featuredImage.message)}</p>}
      </div>
      <div>
        <label className="form-label">추가 이미지</label>
        <div className="flex gap-2 mb-2">
          <Input 
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg 또는 파일 업로드" 
            data-testid="input-new-image-url"
          />
          <Button type="button" onClick={addImageUrl} variant="outline" data-testid="button-add-image">
            <Plus className="h-4 w-4" />
          </Button>
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={10485760}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleAdditionalImageUpload}
            buttonClassName="whitespace-nowrap"
          >
            <Upload className="h-4 w-4 mr-2" />
            파일 업로드
          </ObjectUploader>
        </div>
        {imageUrls.length > 0 && (
          <div className="space-y-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-secondary rounded">
                <span className="flex-1 text-sm truncate" data-testid={`text-image-url-${index}`}>{url}</span>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => removeImageUrl(index)}
                  data-testid={`button-remove-image-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-news">
          {updateMutation.isPending ? '수정 중...' : '수정'}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess} data-testid="button-cancel-news">
          취소
        </Button>
      </div>
    </form>
  );
}

function EditResourceForm({ resource, onSuccess, updateMutation }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: resource.title,
      description: resource.description || '',
      category: resource.category,
      fileUrl: resource.fileUrl,
      fileName: resource.fileName,
      fileType: resource.fileType,
      accessLevel: resource.accessLevel || 'public',
      isActive: resource.isActive !== false,
    }
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate({ id: resource.id, ...data });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="form-label">제목</label>
        <Input {...register('title')} />
        {errors.title && <p className="text-sm text-destructive mt-1">{String(errors.title.message)}</p>}
      </div>
      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('description')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">카테고리</label>
          <Select defaultValue={resource.category} onValueChange={(value) => register('category').onChange({ target: { value } })}>
            <SelectTrigger>
              <SelectValue />
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
          <Select defaultValue={resource.accessLevel} onValueChange={(value) => register('accessLevel').onChange({ target: { value } })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">공개</SelectItem>
              <SelectItem value="members">회원전용</SelectItem>
              <SelectItem value="premium">프리미엄</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="form-label">파일 URL</label>
          <Input {...register('fileUrl')} />
        </div>
        <div>
          <label className="form-label">파일명</label>
          <Input {...register('fileName')} />
        </div>
        <div>
          <label className="form-label">파일 형식</label>
          <Input {...register('fileType')} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? '수정 중...' : '수정'}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess}>
          취소
        </Button>
      </div>
    </form>
  );
}

function EditPartnerForm({ partner, onSuccess, updateMutation }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: partner.name,
      logo: partner.logo,
      website: partner.website || '',
      description: partner.description || '',
      category: partner.category,
      isActive: partner.isActive !== false,
      order: partner.order || 0,
    }
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate({ id: partner.id, ...data });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="form-label">이름</label>
        <Input {...register('name')} />
        {errors.name && <p className="text-sm text-destructive mt-1">{String(errors.name.message)}</p>}
      </div>
      <div>
        <label className="form-label">로고 URL</label>
        <Input {...register('logo')} />
        {errors.logo && <p className="text-sm text-destructive mt-1">{String(errors.logo.message)}</p>}
      </div>
      <div>
        <label className="form-label">웹사이트</label>
        <Input {...register('website')} />
      </div>
      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('description')} />
      </div>
      <div>
        <label className="form-label">카테고리</label>
        <Select defaultValue={partner.category} onValueChange={(value) => register('category').onChange({ target: { value } })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sponsor">후원사</SelectItem>
            <SelectItem value="partner">협력사</SelectItem>
            <SelectItem value="government">정부기관</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? '수정 중...' : '수정'}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess}>
          취소
        </Button>
      </div>
    </form>
  );
}

// Create News Dialog Component
function CreateNewsDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      content: '',
      category: '',
      featuredImage: '',
      images: [] as string[],
      isPublished: false,
    }
  });

  const handleGetUploadParameters = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleFeaturedImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: uploadURL }),
      });
      
      const data = await response.json();
      setFeaturedImageUrl(data.objectPath);
      setValue('featuredImage', data.objectPath);
      toast({ title: '대표 이미지 업로드 완료!' });
    }
  };

  const handleAdditionalImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: uploadURL }),
      });
      
      const data = await response.json();
      const updated = [...imageUrls, data.objectPath];
      setImageUrls(updated);
      setValue('images', updated);
      toast({ title: '이미지 업로드 완료!' });
    }
  };

  const addImageUrl = () => {
    if (newImageUrl.trim() && newImageUrl.startsWith('http')) {
      const updated = [...imageUrls, newImageUrl.trim()];
      setImageUrls(updated);
      setValue('images', updated);
      setNewImageUrl('');
    }
  };

  const removeImageUrl = (index: number) => {
    const updated = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updated);
    setValue('images', updated);
  };

  const createMutation = useMutation({
    mutationFn: async (formData: NewsFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapNewsFormToPost(formData, user.id);
      return await createPost({ post, translation, meta });
    },
    onSuccess: () => {
      toast({ title: "뉴스가 생성되었습니다" });
      reset();
      setFeaturedImageUrl('');
      setImageUrls([]);
      setNewImageUrl('');
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      console.error('[CreateNewsDialog] Create failed:', error);
      toast({
        title: "뉴스 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log('[CreateNewsDialog] Form submitted:', data);
    console.log('[CreateNewsDialog] Form errors:', errors);
    console.log('[CreateNewsDialog] User:', user);
    createMutation.mutate({
      ...data,
      featuredImage: featuredImageUrl || '',
      images: imageUrls.length > 0 ? imageUrls : [],
    });
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
            <Select onValueChange={(value) => setValue('category', value)}>
              <SelectTrigger data-testid="select-news-category">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notice">공지사항</SelectItem>
                <SelectItem value="press">보도자료</SelectItem>
                <SelectItem value="activity">활동소식</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-destructive mt-1">{String(errors.category.message)}</p>}
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

          <div>
            <label className="form-label">대표 이미지</label>
            <div className="flex gap-2">
              <Input 
                value={featuredImageUrl}
                onChange={(e) => {
                  setFeaturedImageUrl(e.target.value);
                  setValue('featuredImage', e.target.value);
                }}
                placeholder="https://example.com/image.jpg 또는 파일 업로드" 
                data-testid="input-news-featured-image"
              />
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleFeaturedImageUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                파일 업로드
              </ObjectUploader>
            </div>
          </div>

          <div>
            <label className="form-label">추가 이미지</label>
            <div className="flex gap-2 mb-2">
              <Input 
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg 또는 파일 업로드" 
                data-testid="input-news-new-image-url"
              />
              <Button type="button" onClick={addImageUrl} variant="outline" data-testid="button-add-news-image">
                <Plus className="h-4 w-4" />
              </Button>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleAdditionalImageUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                파일 업로드
              </ObjectUploader>
            </div>
            {imageUrls.length > 0 && (
              <div className="space-y-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-secondary rounded">
                    <span className="flex-1 text-sm truncate">{url}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeImageUrl(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: zodResolver(eventSchema),
  });

  const handleGetUploadParameters = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleEventImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: uploadURL }),
      });
      
      const data = await response.json();
      const updated = [...imageUrls, data.objectPath];
      setImageUrls(updated);
      setValue('images', updated);
      toast({ title: '이미지 업로드 완료!' });
    }
  };

  const addImageUrl = () => {
    if (newImageUrl.trim() && newImageUrl.startsWith('http')) {
      const updated = [...imageUrls, newImageUrl.trim()];
      setImageUrls(updated);
      setValue('images', updated);
      setNewImageUrl('');
    }
  };

  const removeImageUrl = (index: number) => {
    const updated = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updated);
    setValue('images', updated);
  };

  const createMutation = useMutation({
    mutationFn: async (formData: EventFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapEventFormToPost(formData, user.id);
      return await createPost({ post, translation, meta });
    },
    onSuccess: () => {
      toast({ title: "행사가 생성되었습니다" });
      reset();
      setImageUrls([]);
      setNewImageUrl('');
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      console.error('[CreateEventDialog] Create failed:', error);
      toast({
        title: "행사 생성 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate({
      ...data,
      images: imageUrls.length > 0 ? imageUrls : [],
    });
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
              <Select onValueChange={(value) => setValue('category', value)}>
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
              {errors.category && <p className="text-sm text-destructive mt-1">{String(errors.category.message)}</p>}
            </div>
          </div>
          
          <div>
            <label className="form-label">설명</label>
            <Textarea {...register('description')} data-testid="textarea-event-description" />
            {errors.description && <p className="text-sm text-destructive mt-1">{String(errors.description.message)}</p>}
          </div>
          
          <div>
            <label className="form-label">상세 내용</label>
            <Textarea rows={8} {...register('content')} data-testid="textarea-event-create-content" placeholder="행사의 상세 내용을 입력하세요 (줄바꿈 가능)" />
            {errors.content && <p className="text-sm text-destructive mt-1">{String(errors.content.message)}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">날짜</label>
              <Input type="datetime-local" {...register('eventDate')} data-testid="input-event-date" />
              {errors.eventDate && <p className="text-sm text-destructive mt-1">{String(errors.eventDate.message)}</p>}
            </div>
            <div>
              <label className="form-label">장소</label>
              <LocationPicker
                value={watch('location') || ''}
                onChange={(value) => setValue('location', value)}
              />
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

          <div>
            <label className="form-label">이미지</label>
            <div className="flex gap-2 mb-2">
              <Input 
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg 또는 파일 업로드" 
                data-testid="input-event-new-image-url"
              />
              <Button type="button" onClick={addImageUrl} variant="outline" data-testid="button-add-event-image">
                <Plus className="h-4 w-4" />
              </Button>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleEventImageUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                파일 업로드
              </ObjectUploader>
            </div>
            {imageUrls.length > 0 && (
              <div className="space-y-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-secondary rounded">
                    <span className="flex-1 text-sm truncate">{url}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeImageUrl(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      fileUrl: '',
      fileName: '',
      fileType: '',
      accessLevel: 'public',
      isActive: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (formData: ResourceFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapResourceFormToPost(formData, user.id);
      return await createPost({ post, translation, meta });
    },
    onSuccess: () => {
      toast({ title: "자료가 생성되었습니다" });
      reset();
      setUploadedFileName('');
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      console.error('[CreateResourceDialog] Create failed:', error);
      toast({ 
        title: "자료 생성 실패", 
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive" 
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleResourceFileUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const uploadURL = file.uploadURL;
      const originalFileName = file.name || 'file';
      const fileExtension = originalFileName.split('.').pop() || '';
      const fileSize = file.size || 0;
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: uploadURL }),
      });
      
      const data = await response.json();
      
      setValue('fileUrl', data.objectPath);
      setValue('fileName', originalFileName);
      setValue('fileType', fileExtension.toUpperCase());
      setUploadedFileName(originalFileName);
      
      toast({ title: '파일 업로드 완료!', description: `${originalFileName} (${(fileSize / 1024).toFixed(2)} KB)` });
    }
  };

  const onSubmit = (data: any) => {
    console.log('[Resource Form] Submitting:', data);
    console.log('[Resource Form] Errors:', errors);
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
            {errors.title && <p className="text-sm text-destructive mt-1">{String(errors.title.message)}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">카테고리</label>
              <Select onValueChange={(value) => setValue('category', value)}>
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
              {errors.category && <p className="text-sm text-destructive mt-1">{String(errors.category.message)}</p>}
            </div>
            <div>
              <label className="form-label">접근 수준</label>
              <Select defaultValue="public" onValueChange={(value) => setValue('accessLevel', value)}>
                <SelectTrigger data-testid="select-resource-access">
                  <SelectValue placeholder="접근 수준 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">공개</SelectItem>
                  <SelectItem value="members">회원전용</SelectItem>
                  <SelectItem value="premium">프리미엄</SelectItem>
                </SelectContent>
              </Select>
              {errors.accessLevel && <p className="text-sm text-destructive mt-1">{String(errors.accessLevel.message)}</p>}
            </div>
          </div>
          
          <div>
            <label className="form-label">설명</label>
            <Textarea {...register('description')} data-testid="textarea-resource-description" />
          </div>
          
          <div>
            <label className="form-label">파일 업로드</label>
            <div className="flex gap-2 mb-4">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={52428800}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleResourceFileUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                파일 선택
              </ObjectUploader>
              {uploadedFileName && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" data-testid="text-uploaded-filename">{uploadedFileName}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">최대 50MB까지 업로드 가능합니다</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">파일 URL</label>
              <Input {...register('fileUrl')} placeholder="자동 입력됨" readOnly className="bg-muted" data-testid="input-resource-url" />
              {errors.fileUrl && <p className="text-sm text-destructive mt-1">{String(errors.fileUrl.message)}</p>}
            </div>
            <div>
              <label className="form-label">파일명</label>
              <Input {...register('fileName')} placeholder="자동 입력됨" readOnly className="bg-muted" data-testid="input-resource-filename" />
              {errors.fileName && <p className="text-sm text-destructive mt-1">{String(errors.fileName.message)}</p>}
            </div>
            <div>
              <label className="form-label">파일 형식</label>
              <Input {...register('fileType')} placeholder="자동 입력됨" readOnly className="bg-muted" data-testid="input-resource-filetype" />
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

// Event Registrations Dialog Component
function EventRegistrationsDialog({ 
  open, 
  onOpenChange, 
  event 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  event: any;
}) {
  const { data: registrations, isLoading } = useQuery({
    queryKey: ['/api/events', event?.id, 'registrations'],
    queryFn: async () => {
      const response = await fetch(`/api/events/${event.id}/registrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch registrations');
      return response.json();
    },
    enabled: !!event?.id && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>행사 신청자 목록 - {event?.title}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="text-center py-8">로딩 중...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">총 신청자: {registrations?.length || 0}명</span>
              {event?.capacity && (
                <span className="text-muted-foreground">
                  정원: {event.capacity}명 (잔여: {event.capacity - (registrations?.length || 0)}명)
                </span>
              )}
            </div>
            
            <div className="border rounded-lg divide-y">
              {registrations && registrations.length > 0 ? (
                registrations.map((registration: any, index: number) => (
                  <div 
                    key={registration.id} 
                    className="p-4 flex justify-between items-center"
                    data-testid={`registration-item-${index}`}
                  >
                    <div>
                      <div className="font-medium" data-testid={`registration-name-${index}`}>
                        {registration.user?.name || registration.attendeeName || '이름 없음'}
                      </div>
                      <div className="text-sm text-muted-foreground" data-testid={`registration-email-${index}`}>
                        {registration.user?.email || registration.attendeeEmail || '이메일 없음'}
                      </div>
                      {registration.attendeePhone && (
                        <div className="text-sm text-muted-foreground">
                          {registration.attendeePhone}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        registration.status === 'confirmed' ? 'default' :
                        registration.status === 'pending' ? 'secondary' : 'outline'
                      }>
                        {registration.status === 'confirmed' ? '확정' :
                         registration.status === 'pending' ? '대기' : '취소'}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(registration.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  아직 신청자가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
