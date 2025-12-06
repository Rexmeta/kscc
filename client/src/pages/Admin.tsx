import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
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
import { Member, Inquiry, Partner, type PostWithTranslations, type InquiryWithReplies, type InquiryReply } from '@shared/schema';
import { ObjectUploader } from '@/components/ObjectUploader';
import { InquiryDetailView } from '@/components/InquiryDetailView';
import type { UploadResult } from '@uppy/core';
import { 
  mapNewsFormToPost, mapPostToNewsForm, type NewsFormData,
  mapEventFormToPost, mapPostToEventForm, type EventFormData,
  mapResourceFormToPost, mapPostToResourceForm, type ResourceFormData
} from '@/lib/adminPostMappers';
import { createPost, updatePost, deletePost } from '@/lib/adminPostApi';
import PageEditModal from '@/components/PageEditModal';

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
  endDate: z.string().optional(),
  location: z.string().min(1, '장소를 입력해주세요'),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  eventType: z.string().default('offline'),
  capacity: z.number().optional().or(z.nan()).transform((val) => Number.isNaN(val) ? undefined : val),
  fee: z.number().optional().or(z.nan()).transform((val) => Number.isNaN(val) ? 0 : val),
  registrationDeadline: z.string().optional(),
  images: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
  isPublished: z.boolean().default(true),
});

const resourceSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  description: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  fileUrl: z.string().url('유효한 URL을 입력해주세요'),
  fileName: z.string(),
  fileType: z.string(),
  accessLevel: z.string().default('public'),
  isActive: z.boolean().default(true),
});

const partnerSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  logo: z.string().url('유효한 URL을 입력해주세요'),
  website: z.string().optional(),
  description: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  isActive: z.boolean().default(true),
  order: z.number().default(0),
});

const memberSchema = z.object({
  companyName: z.string().min(1, '회사명을 입력해주세요'),
  industry: z.string().min(1, '업종을 선택해주세요'),
  country: z.string().min(1, '국가를 선택해주세요'),
  city: z.string().min(1, '도시를 입력해주세요'),
  address: z.string().min(1, '주소를 입력해주세요'),
  phone: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  membershipLevel: z.string().default('regular'),
  contactPerson: z.string().min(1, '담당자명을 입력해주세요'),
  contactEmail: z.string().email('유효한 이메일을 입력해주세요'),
  contactPhone: z.string().optional(),
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
  const [createNewsDialogOpen, setCreateNewsDialogOpen] = useState(false);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [createResourceDialogOpen, setCreateResourceDialogOpen] = useState(false);
  const [pageEditModalOpen, setPageEditModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<PostWithTranslations | null>(null);
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Read URL parameters to auto-navigate to specific tab and action
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const action = params.get('action');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (action === 'create') {
      if (tab === 'news') {
        setCreateNewsDialogOpen(true);
      } else if (tab === 'events') {
        setCreateEventDialogOpen(true);
      } else if (tab === 'resources') {
        setCreateResourceDialogOpen(true);
      }
    }
  }, []);

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

  const { data: usersData } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin,
  });

  const { data: membersData } = useQuery({
    queryKey: ['/api/members', { admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/members?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'members',
  });

  const { data: newsData } = useQuery({
    queryKey: ['/api/posts', { postType: 'news', admin: true }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/posts?postType=news&admin=true');
      return response.json();
    },
    enabled: isAdmin && activeTab === 'articles',
  });

  const { data: eventsData } = useQuery({
    queryKey: ['/api/posts', { postType: 'event', admin: true }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/posts?postType=event&admin=true');
      return response.json();
    },
    enabled: isAdmin && activeTab === 'events',
  });

  const { data: resourcesData } = useQuery({
    queryKey: ['/api/posts', { postType: 'resource', admin: true }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/posts?postType=resource&admin=true');
      return response.json();
    },
    enabled: isAdmin && activeTab === 'resources',
  });

  const { data: inquiriesData } = useQuery({
    queryKey: ['/api/inquiries'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/inquiries');
      return response.json();
    },
    enabled: isAdmin && activeTab === 'inquiries',
  });

  const { data: partnersData } = useQuery({
    queryKey: ['/api/partners'],
    queryFn: async () => {
      const response = await fetch('/api/partners');
      return response.json();
    },
    enabled: activeTab === 'partners',
  });

  const { data: pagesData } = useQuery({
    queryKey: ['/api/posts', { postType: 'page', admin: true }],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/posts?postType=page&admin=true');
      return response.json();
    },
    enabled: isAdmin && activeTab === 'pages',
  });

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-600">관리자만 접근할 수 있습니다</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">관리 대시보드</h1>
          <p className="text-muted-foreground mt-2">회원, 행사, 뉴스, 자료 및 문의사항을 관리합니다</p>
        </div>

        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${(user?.role === 'admin' || user?.role === 'operator') ? 'grid-cols-9' : 'grid-cols-8'}`}>
              <TabsTrigger value="dashboard" data-testid="tab-dashboard">대시보드</TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">사용자</TabsTrigger>
              <TabsTrigger value="members" data-testid="tab-members">회원</TabsTrigger>
              <TabsTrigger value="articles" data-testid="tab-articles">뉴스</TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">행사</TabsTrigger>
              <TabsTrigger value="resources" data-testid="tab-resources">자료</TabsTrigger>
              <TabsTrigger value="pages" data-testid="tab-pages">페이지</TabsTrigger>
              <TabsTrigger value="inquiries" data-testid="tab-inquiries">문의</TabsTrigger>
              {(user?.role === 'admin' || user?.role === 'operator') && (
                <TabsTrigger value="manual" data-testid="tab-manual">운영 매뉴얼</TabsTrigger>
              )}
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">총 사용자</p>
                        <p className="text-3xl font-bold" data-testid="stat-total-users">{dashboardStats?.stats?.totalUsers || 0}</p>
                      </div>
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">회원사</p>
                        <p className="text-3xl font-bold" data-testid="stat-total-members">{dashboardStats?.stats?.totalMembers || 0}</p>
                      </div>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">행사</p>
                        <p className="text-3xl font-bold" data-testid="stat-total-events">{dashboardStats?.stats?.totalEvents || 0}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">새 문의</p>
                        <p className="text-3xl font-bold" data-testid="stat-new-inquiries">{dashboardStats?.stats?.newInquiries || 0}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>최근 활동</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {dashboardStats?.recentActivities?.map((activity: any, index: number) => (
                      <div key={index} className="flex justify-between items-center" data-testid={`activity-${index}`}>
                        <span>{activity.description}</span>
                        <span className="text-muted-foreground">{new Date(activity.timestamp).toLocaleDateString()}</span>
                      </div>
                    )) || <p className="text-muted-foreground">최근 활동이 없습니다</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">사용자 관리</h2>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {usersData?.map((user: any) => (
                      <div key={user.id} className="p-4 flex items-center justify-between" data-testid={`user-row-${user.id}`}>
                        <div className="flex items-center space-x-4">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.name}</h4>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === 'admin' ? 'default' : user.role === 'operator' ? 'secondary' : 'outline'} data-testid={`badge-user-role-${user.id}`}>
                            {user.role === 'admin' ? '관리자' : user.role === 'operator' ? '운영자' : '사용자'}
                          </Badge>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-user-type-${user.id}`}>
                            {user.userType === 'admin' ? '관리자' : user.userType === 'operator' ? '운영자' : user.userType === 'company' ? '회원사' : '일반'}
                          </Badge>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-user-tier-${user.id}`}>
                            {user.membershipTier === 'bronze' ? '브론즈' : user.membershipTier === 'silver' ? '실버' : user.membershipTier === 'gold' ? '골드' : user.membershipTier === 'platinum' ? '플래티넘' : '무료'}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setSelectedItem(user);
                              setEditDialogOpen(true);
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
                      <div key={member.id} className="p-4 space-y-3 border-b last:border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            {member.logo && (
                              <img src={member.logo} alt={member.companyName} className="w-12 h-12 object-contain rounded border" onError={(e) => e.currentTarget.style.display = 'none'} />
                            )}
                            {!member.logo && <Building2 className="h-8 w-8 text-muted-foreground flex-shrink-0" />}
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setSelectedItem(member);
                                setViewDialogOpen(true);
                              }}
                            >
                              <h4 className="font-medium hover:underline">{member.companyName}</h4>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {member.contactPerson} • {member.contactEmail}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              member.membershipStatus === 'active' ? 'default' :
                              member.membershipStatus === 'pending' ? 'secondary' :
                              'destructive'
                            } className="whitespace-nowrap">
                              {member.membershipStatus === 'active' ? '활성' :
                               member.membershipStatus === 'pending' ? '승인대기' : '보류'}
                            </Badge>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {member.membershipLevel === 'premium' ? '프리미엄' :
                               member.membershipLevel === 'sponsor' ? '후원' : '정회원'}
                            </Badge>
                          </div>
                        </div>
                        {member.website && (
                          <div className="text-xs text-muted-foreground pl-15">
                            {member.website}
                          </div>
                        )}
                        <div className="flex items-center justify-end space-x-2 pt-2">
                          {member.membershipStatus !== 'active' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiRequest('PUT', `/api/members/${member.id}`, { membershipStatus: 'active' });
                                  toast({ title: "회원이 승인되었습니다" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/members', { admin: true }] });
                                } catch (error) {
                                  toast({ title: "승인 실패", variant: "destructive" });
                                }
                              }}
                              data-testid={`button-approve-member-${member.id}`}
                            >
                              ✓ 승인
                            </Button>
                          )}
                          {member.membershipStatus !== 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiRequest('PUT', `/api/members/${member.id}`, { membershipStatus: 'pending' });
                                  toast({ title: "상태가 승인 대기로 변경되었습니다" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/members', { admin: true }] });
                                } catch (error) {
                                  toast({ title: "상태 변경 실패", variant: "destructive" });
                                }
                              }}
                              data-testid={`button-pending-member-${member.id}`}
                            >
                              대기
                            </Button>
                          )}
                          {member.membershipStatus !== 'inactive' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiRequest('PUT', `/api/members/${member.id}`, { membershipStatus: 'inactive' });
                                  toast({ title: "회원이 보류되었습니다" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/members', { admin: true }] });
                                } catch (error) {
                                  toast({ title: "보류 실패", variant: "destructive" });
                                }
                              }}
                              data-testid={`button-hold-member-${member.id}`}
                            >
                              보류
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setSelectedItem(member);
                              setEditDialogOpen(true);
                            }}
                            data-testid={`button-edit-member-${member.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={async () => {
                              if (confirm('정말 이 회원을 삭제하시겠습니까?')) {
                                try {
                                  const response = await apiRequest('DELETE', `/api/members/${member.id}`, null);
                                  if (response.ok) {
                                    toast({ title: "회원이 삭제되었습니다" });
                                    queryClient.invalidateQueries({ queryKey: ['/api/members', { admin: true }] });
                                  }
                                } catch (error) {
                                  toast({ title: "삭제 실패", variant: "destructive" });
                                }
                              }
                            }}
                            data-testid={`button-delete-member-${member.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
                            data-testid={`button-view-registrations-${event.id}`}
                          >
                            신청자 보기
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
                            variant="ghost"
                            onClick={async () => {
                              if (confirm('정말 이 행사를 삭제하시겠습니까?')) {
                                try {
                                  await deletePost(event.id);
                                  toast({ title: "행사가 삭제되었습니다" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] });
                                } catch (error) {
                                  toast({ title: "삭제 실패", variant: "destructive" });
                                }
                              }
                            }}
                            data-testid={`button-delete-event-${event.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* News Management */}
            <TabsContent value="articles" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">뉴스 관리</h2>
                <CreateNewsDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] })} />
              </div>
              
              <div className="grid gap-4">
                {newsData?.posts?.map((article: PostWithTranslations) => (
                  <Card key={article.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        {article.listImage && (
                          <img 
                            src={article.listImage} 
                            alt={article.translations?.[0]?.title || '뉴스'}
                            className="w-20 h-20 object-cover rounded border"
                            data-testid={`img-news-${article.id}`}
                            onError={(e) => e.currentTarget.style.display = 'none'}
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">{article.translations?.[0]?.title || '제목 없음'}</h4>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{article.translations?.[0]?.excerpt || '설명 없음'}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{new Date(article.publishedAt || article.createdAt).toLocaleDateString()}</span>
                            <Badge variant="secondary">{article.status}</Badge>
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
                            variant="ghost"
                            onClick={async () => {
                              if (confirm('정말 이 뉴스를 삭제하시겠습니까?')) {
                                try {
                                  await deletePost(article.id);
                                  toast({ title: "뉴스가 삭제되었습니다" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] });
                                } catch (error) {
                                  toast({ title: "삭제 실패", variant: "destructive" });
                                }
                              }
                            }}
                            data-testid={`button-delete-news-${article.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
                {resourcesData?.posts?.map((resource: PostWithTranslations) => (
                  <Card key={resource.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">{resource.translations?.[0]?.title || '제목 없음'}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{resource.translations?.[0]?.excerpt || '설명 없음'}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <Badge variant="outline">{(resource.tags as any)?.[0] || '기타'}</Badge>
                            <Badge variant="secondary">{resource.status}</Badge>
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
                            variant="ghost"
                            onClick={async () => {
                              if (confirm('정말 이 자료를 삭제하시겠습니까?')) {
                                try {
                                  await deletePost(resource.id);
                                  toast({ title: "자료가 삭제되었습니다" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'resource', admin: true }] });
                                } catch (error) {
                                  toast({ title: "삭제 실패", variant: "destructive" });
                                }
                              }
                            }}
                            data-testid={`button-delete-resource-${resource.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Inquiries Tab */}
            <TabsContent value="inquiries" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">문의사항 관리</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-inquiry">
                      <Plus className="h-4 w-4 mr-2" />
                      새 문의
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 문의 등록</DialogTitle>
                      <DialogDescription>문의 정보를 입력해주세요</DialogDescription>
                    </DialogHeader>
                    <CreateInquiryForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] })} />
                  </DialogContent>
                </Dialog>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {inquiriesData?.inquiries?.map((inquiry: InquiryWithReplies) => (
                      <div key={inquiry.id} className="p-4 flex items-center justify-between" data-testid={`inquiry-row-${inquiry.id}`}>
                        <div className="flex-1">
                          <h4 className="font-medium cursor-pointer hover:underline" onClick={() => {
                            setSelectedItem(inquiry);
                            setViewDialogOpen(true);
                          }}>{inquiry.subject}</h4>
                          <p className="text-sm text-muted-foreground">
                            {inquiry.name} • {inquiry.category} • {inquiry.phone || inquiry.email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{inquiry.message}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col items-end space-y-1">
                            <Badge variant={
                              inquiry.status === 'new' ? 'destructive' :
                              inquiry.status === 'in_progress' ? 'secondary' : 'default'
                            }>
                              {inquiry.status === 'new' ? '새 문의' :
                               inquiry.status === 'in_progress' ? '진행 중' : '해결'}
                            </Badge>
                          </div>
                          {inquiry.status === 'new' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiRequest('PUT', `/api/inquiries/${inquiry.id}`, { status: 'in_progress' });
                                  toast({ title: "상태가 변경되었습니다" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
                                } catch (error) {
                                  toast({ title: "상태 변경 실패", variant: "destructive" });
                                }
                              }}
                              data-testid={`button-progress-inquiry-${inquiry.id}`}
                            >
                              진행 중
                            </Button>
                          )}
                          {inquiry.status !== 'resolved' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiRequest('PUT', `/api/inquiries/${inquiry.id}`, { status: 'resolved' });
                                  toast({ title: "문의가 해결되었습니다" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
                                } catch (error) {
                                  toast({ title: "상태 변경 실패", variant: "destructive" });
                                }
                              }}
                              data-testid={`button-resolve-inquiry-${inquiry.id}`}
                            >
                              ✓ 해결
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedItem(inquiry);
                              setViewDialogOpen(true);
                            }}
                            data-testid={`button-view-inquiry-${inquiry.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={async () => {
                              if (confirm('정말 이 문의를 삭제하시겠습니까?')) {
                                try {
                                  const response = await apiRequest('DELETE', `/api/inquiries/${inquiry.id}`, null);
                                  if (response.ok) {
                                    toast({ title: "문의가 삭제되었습니다" });
                                    queryClient.invalidateQueries({ queryKey: ['/api/inquiries'] });
                                  }
                                } catch (error) {
                                  toast({ title: "삭제 실패", variant: "destructive" });
                                }
                              }
                            }}
                            data-testid={`button-delete-inquiry-${inquiry.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pages Tab */}
            <TabsContent value="pages" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">페이지 관리</h2>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {pagesData?.posts?.map((page: PostWithTranslations) => {
                      const translation = page.translations?.find(t => t.locale === 'ko') || page.translations?.[0];
                      return (
                        <div key={page.id} className="p-4 flex items-center justify-between" data-testid={`page-row-${page.id}`}>
                          <div className="flex-1">
                            <h4 className="font-medium">{translation?.title || page.slug}</h4>
                            <p className="text-sm text-muted-foreground">
                              /{page.slug} • {page.status}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {translation?.excerpt || '페이지 설명 없음'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedPage(page);
                                setPageEditModalOpen(true);
                              }}
                              data-testid={`button-edit-page-${page.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {(!pagesData?.posts || pagesData.posts.length === 0) && (
                      <div className="p-8 text-center text-muted-foreground">
                        페이지가 없습니다
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {selectedPage && (
                <PageEditModal
                  isOpen={pageEditModalOpen}
                  onClose={() => {
                    setPageEditModalOpen(false);
                    setSelectedPage(null);
                  }}
                  page={selectedPage}
                />
              )}
            </TabsContent>

            {/* Partners Tab */}
            <TabsContent value="partners" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">파트너 관리</h2>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {partnersData?.map((partner: any) => (
                      <div key={partner.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          {partner.logo && (
                            <img src={partner.logo} alt={partner.name} className="w-16 h-16 object-contain rounded border" onError={(e) => e.currentTarget.style.display = 'none'} />
                          )}
                          <div>
                            <h4 className="font-medium">{partner.name}</h4>
                            <p className="text-sm text-muted-foreground">{partner.category}</p>
                            {partner.website && <p className="text-xs text-muted-foreground mt-1"><a href={partner.website} target="_blank" className="text-blue-600 hover:underline">{partner.website}</a></p>}
                            {partner.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{partner.description}</p>}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
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
                            variant="ghost"
                            onClick={async () => {
                              if (confirm('정말 이 파트너를 삭제하시겠습니까?')) {
                                try {
                                  const response = await apiRequest('DELETE', `/api/partners/${partner.id}`, null);
                                  if (response.ok) {
                                    toast({ title: "파트너가 삭제되었습니다" });
                                    queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
                                  }
                                } catch (error) {
                                  toast({ title: "삭제 실패", variant: "destructive" });
                                }
                              }
                            }}
                            data-testid={`button-delete-partner-${partner.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!partnersData || partnersData.length === 0) && (
                      <div className="p-8 text-center text-muted-foreground">
                        파트너가 없습니다
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Operations Manual Tab - Operator and Admin only */}
            {(user?.role === 'admin' || user?.role === 'operator') && (
              <TabsContent value="manual" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">KSCC 운영 매뉴얼</h2>
                  <Badge variant="secondary">운영자 전용</Badge>
                </div>
                
                <div className="grid gap-6">
                  {/* 목적 정의 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">0. 목적 정의</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>한국-현지 기업 네트워킹</li>
                        <li>투자/거래/협력 정보 제공</li>
                        <li>현지 정부/기관 연결</li>
                        <li>교민 비즈니스 지원</li>
                      </ul>
                      <p className="mt-3 text-sm font-medium text-destructive">이 목적에서 벗어나는 일은 하지 않는다.</p>
                    </CardContent>
                  </Card>

                  {/* 조직 구조 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">1. 조직 구조</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="font-medium">법적 형태: 비영리 사단법인</p>
                        <p className="text-sm text-muted-foreground">회원구조: 개인·기업·기관</p>
                      </div>
                      <div>
                        <p className="font-medium mb-2">핵심 인력:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <span>• 회장 1</span>
                          <span>• 부회장(재무) 1</span>
                          <span>• 부회장(행사/프로그램) 1</span>
                          <span>• 사무국장 1 (실무 책임)</span>
                          <span>• 이사 3~7</span>
                          <span>• 감사 1</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 재정 구조 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">2. 재정 구조</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="font-medium mb-2">수입원:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            <li>연회비</li>
                            <li>행사 참가비</li>
                            <li>스폰서십/광고</li>
                            <li>정부·기관 협력금(가능시)</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium mb-2">지출:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            <li>사무국비</li>
                            <li>회계/법률</li>
                            <li>행사비</li>
                            <li>웹/CRM 운영비</li>
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="font-medium text-sm">원칙:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          <li>이사회 승인 없이 지출 불가</li>
                          <li>분기별 재무보고 공개</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 정관 주요 조항 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">3. 규정(정관) 주요 조항</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                        <li>목적</li>
                        <li>회원자격/권리/의무</li>
                        <li>회비 규정</li>
                        <li>임원 구성 및 임기(2년)</li>
                        <li>이사회 운영</li>
                        <li>사무국 운영</li>
                        <li>재무규정</li>
                        <li>총회 소집</li>
                        <li>해산 및 잔여재산 처리(공익 조직에 귀속)</li>
                      </ol>
                    </CardContent>
                  </Card>

                  {/* 회원 서비스 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">4. 회원 서비스 핵심</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">회원이 얻는 실제 가치가 명확해야 한다.</p>
                      <div className="grid md:grid-cols-2 gap-2">
                        <div className="p-2 bg-muted rounded text-sm">1. 정기 네트워킹</div>
                        <div className="p-2 bg-muted rounded text-sm">2. 시장 정보 브리핑</div>
                        <div className="p-2 bg-muted rounded text-sm">3. 정부·기관 연결</div>
                        <div className="p-2 bg-muted rounded text-sm">4. 전문가 세미나</div>
                        <div className="p-2 bg-muted rounded text-sm">5. 기업 방문 투어</div>
                        <div className="p-2 bg-muted rounded text-sm">6. 투자·파트너 매칭</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 3개월 준비 로드맵 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">5. 3개월 준비 로드맵</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border-l-4 border-blue-500 pl-4">
                        <p className="font-medium">1개월차: 정관·조직·법적 준비</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                          <li>설립 목적 완성</li>
                          <li>정관 1차 초안 작성</li>
                          <li>이사진·감사 구성 확정</li>
                          <li>회비 구조 확정</li>
                          <li>사무국 임명</li>
                          <li>웹사이트 기본 페이지 생성</li>
                        </ul>
                        <p className="text-xs mt-2 font-medium text-blue-600">Outcome: 핵심 조직 + 법적 골격</p>
                      </div>
                      <div className="border-l-4 border-green-500 pl-4">
                        <p className="font-medium">2개월차: 브랜딩·제도·재무 준비</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                          <li>비영리 등록 절차 진행</li>
                          <li>회비 납부 방식 설정(Stripe/PayPal/계좌)</li>
                          <li>회계 기준 문서화</li>
                          <li>브랜드 CI, 문서 템플릿</li>
                          <li>노동·법률 자문 계약</li>
                        </ul>
                        <p className="text-xs mt-2 font-medium text-green-600">Outcome: 투명성·신뢰 기반 확보</p>
                      </div>
                      <div className="border-l-4 border-purple-500 pl-4">
                        <p className="font-medium">3개월차: 회원 모집·첫 행사</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                          <li>회원 모집 시작(목표 20~50)</li>
                          <li>첫 네트워킹 행사 개최</li>
                          <li>정부/대사관 기관 소개 미팅</li>
                          <li>뉴스레터 발행 시작</li>
                          <li>CRM(회원관리) 시스템 오픈</li>
                        </ul>
                        <p className="text-xs mt-2 font-medium text-purple-600">Outcome: 조직 실체 확보</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 월별 운영 계획 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">6. 월별 운영 계획 (설립 1년차)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-3 border rounded-lg">
                          <p className="font-medium text-sm mb-2">Q1 (정착기)</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground">
                            <li>월 1회 네트워킹</li>
                            <li>1회 세미나(세금/법률/시장)</li>
                            <li>분기 재무보고</li>
                          </ul>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <p className="font-medium text-sm mb-2">Q2 (확장기)</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground">
                            <li>현지기관 공동 세미나</li>
                            <li>한국기관(KOTRA/KITA) 협력</li>
                            <li>기업 투어 1회</li>
                          </ul>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <p className="font-medium text-sm mb-2">Q3 (가속기)</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground">
                            <li>주제별 포럼(수출/투자/스타트업)</li>
                            <li>정부 정책사절단 대응</li>
                            <li>스폰서십 확대</li>
                          </ul>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <p className="font-medium text-sm mb-2">Q4 (평가·성숙기)</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground">
                            <li>연차총회 + 재무보고</li>
                            <li>회원 설문조사</li>
                            <li>차기전략 수립</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 행사 운영 표준 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">7. 행사 운영 표준</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="font-medium text-sm">A타입: 조찬 포럼</p>
                          <p className="text-xs text-muted-foreground">1시간 발표 + 1시간 네트워킹</p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="font-medium text-sm">B타입: 기업 방문</p>
                          <p className="text-xs text-muted-foreground">공장/사무실/센터 투어</p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                          <p className="font-medium text-sm">C타입: 정부·기관 세션</p>
                          <p className="text-xs text-muted-foreground">규제/법률/세제 안내</p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <p className="font-medium text-sm">D타입: 교민 비즈니스 DAY</p>
                          <p className="text-xs text-muted-foreground">소규모 B2B 매칭</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* KPI */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">8. KPI (1년 검증 지표)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">측정 가능한 지표만.</p>
                      <div className="grid grid-cols-5 gap-3">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">40+</p>
                          <p className="text-xs text-muted-foreground">유료 회원</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">12+</p>
                          <p className="text-xs text-muted-foreground">행사 횟수</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">5+</p>
                          <p className="text-xs text-muted-foreground">기관 협력</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">4</p>
                          <p className="text-xs text-muted-foreground">재무 보고</p>
                        </div>
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-2xl font-bold">10+</p>
                          <p className="text-xs text-muted-foreground">기업 매칭</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 회계·투명성 체계 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">9. 회계·투명성 체계</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>은행 계좌 단일(회계분리)</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>지출 결재 2인 승인</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>회계 보고서 분기 공개</span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>연말 외부 회계 검토</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* 디지털 운영 체계 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">10. 디지털 운영 체계</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-2 text-sm">
                        <div className="p-2 border rounded">Web + CRM</div>
                        <div className="p-2 border rounded">Stripe/PayPal</div>
                        <div className="p-2 border rounded">Notion 사무국 매뉴얼</div>
                        <div className="p-2 border rounded">Google Workspace</div>
                        <div className="p-2 border rounded">Mailchimp 뉴스레터</div>
                        <div className="p-2 border rounded">Zoom/Hybrid 세미나</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 성공조건 & 실패 방지 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-green-600">11. 성공조건 5가지</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ol className="list-decimal list-inside text-sm space-y-1">
                          <li>행사 콘텐츠 품질</li>
                          <li>기관 연결 능력</li>
                          <li>회계 투명성</li>
                          <li>회원 혜택 명확성</li>
                          <li>사무국의 실행력</li>
                        </ol>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg text-destructive">12. 실패 방지 원칙</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span>회장 개인 이슈로 운영하지 않는다</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span>정치 종교와 완전 분리</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span>사적 이익 추구 금지</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span>회원 이익 우선</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 문서 세트 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">13. 문서 세트(템플릿)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-2">
                        <Badge variant="outline" className="justify-center py-2">정관 템플릿</Badge>
                        <Badge variant="outline" className="justify-center py-2">사무국 매뉴얼</Badge>
                        <Badge variant="outline" className="justify-center py-2">재무규정</Badge>
                        <Badge variant="outline" className="justify-center py-2">회비운영규정</Badge>
                        <Badge variant="outline" className="justify-center py-2">회원가입 양식</Badge>
                        <Badge variant="outline" className="justify-center py-2">행사 운영 매뉴얼</Badge>
                        <Badge variant="outline" className="justify-center py-2">연차보고 템플릿</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 결론 */}
                  <Card className="border-2 border-primary">
                    <CardContent className="pt-6">
                      <blockquote className="text-center">
                        <p className="text-lg font-medium mb-2">
                          비영리는 <span className="text-primary">돈 버는 조직이 아니라 신뢰를 축적하는 조직</span>이다.
                        </p>
                        <p className="text-muted-foreground">
                          신뢰가 쌓이면 <strong>비즈니스·협력은 자연스럽게 따라온다.</strong>
                        </p>
                      </blockquote>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Member View Dialog */}
          {selectedItem && activeTab === 'members' && (
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedItem.companyName} 상세 정보</DialogTitle>
                  <DialogDescription>회원사 정보를 확인하고 관리할 수 있습니다</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedItem.logo && (
                    <div className="flex justify-center">
                      <img src={selectedItem.logo} alt={selectedItem.companyName} className="h-20 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">회사명</p>
                      <p className="font-medium">{selectedItem.companyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">업종</p>
                      <p className="font-medium">{selectedItem.industry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">국가</p>
                      <p className="font-medium">{selectedItem.country}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">도시</p>
                      <p className="font-medium">{selectedItem.city}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">주소</p>
                      <p className="font-medium">{selectedItem.address}</p>
                    </div>
                    {selectedItem.website && (
                      <div>
                        <p className="text-sm text-muted-foreground">웹사이트</p>
                        <p className="font-medium"><a href={selectedItem.website} target="_blank" className="text-blue-600 hover:underline">{selectedItem.website}</a></p>
                      </div>
                    )}
                    {selectedItem.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">전화</p>
                        <p className="font-medium">{selectedItem.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">담당자</p>
                      <p className="font-medium">{selectedItem.contactPerson}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">담당자 이메일</p>
                      <p className="font-medium">{selectedItem.contactEmail}</p>
                    </div>
                    {selectedItem.description && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">설명</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedItem.description}</p>
                      </div>
                    )}
                  </div>
                  <Button onClick={() => {
                    setViewDialogOpen(false);
                    setEditDialogOpen(true);
                  }} className="w-full">
                    편집하기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Member Edit Dialog */}
          {selectedItem && activeTab === 'members' && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[600px] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedItem.companyName} 편집</DialogTitle>
                </DialogHeader>
                <EditMemberForm 
                  member={selectedItem} 
                  onSuccess={() => {
                    setEditDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['/api/members', { admin: true }] });
                  }}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* User Edit Dialog */}
          {selectedItem && activeTab === 'users' && (
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>사용자 정보 수정</DialogTitle>
                  <DialogDescription>{selectedItem.name} 사용자의 권한을 관리합니다</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">역할</label>
                    <Select defaultValue={selectedItem.role} onValueChange={async (value) => {
                      try {
                        await apiRequest('PUT', `/api/users/${selectedItem.id}`, { role: value });
                        toast({ title: "역할이 변경되었습니다" });
                        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                      } catch (error) {
                        toast({ title: "변경 실패", variant: "destructive" });
                      }
                    }}>
                      <SelectTrigger className="mt-1" data-testid={`select-user-role-${selectedItem.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">관리자</SelectItem>
                        <SelectItem value="operator">운영자</SelectItem>
                        <SelectItem value="user">사용자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">계정 유형</label>
                    <Select defaultValue={selectedItem.userType} onValueChange={async (value) => {
                      try {
                        await apiRequest('PUT', `/api/users/${selectedItem.id}`, { userType: value });
                        toast({ title: "계정 유형이 변경되었습니다" });
                        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                      } catch (error) {
                        toast({ title: "변경 실패", variant: "destructive" });
                      }
                    }}>
                      <SelectTrigger className="mt-1" data-testid={`select-user-type-${selectedItem.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">관리자</SelectItem>
                        <SelectItem value="operator">운영자</SelectItem>
                        <SelectItem value="company">회원사</SelectItem>
                        <SelectItem value="user">일반 사용자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">회원등급</label>
                    <Select defaultValue={selectedItem.membershipTier} onValueChange={async (value) => {
                      try {
                        await apiRequest('PUT', `/api/users/${selectedItem.id}`, { membershipTier: value });
                        toast({ title: "회원등급이 변경되었습니다" });
                        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                      } catch (error) {
                        toast({ title: "변경 실패", variant: "destructive" });
                      }
                    }}>
                      <SelectTrigger className="mt-1" data-testid={`select-user-tier-${selectedItem.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">무료</SelectItem>
                        <SelectItem value="bronze">브론즈</SelectItem>
                        <SelectItem value="silver">실버</SelectItem>
                        <SelectItem value="gold">골드</SelectItem>
                        <SelectItem value="platinum">플래티넘</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setEditDialogOpen(false)} className="w-full">완료</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Inquiry View Dialog */}
          {selectedItem && activeTab === 'inquiries' && (
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
              <InquiryDetailView inquiryId={selectedItem.id} onClose={() => setViewDialogOpen(false)} />
            </Dialog>
          )}

          {/* Event Registrations Dialog */}
          {registrationsDialogOpen && selectedItem && (
            <EventRegistrationsDialog 
              open={registrationsDialogOpen} 
              onOpenChange={setRegistrationsDialogOpen} 
              event={selectedItem}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Edit Member Form Component
function EditMemberForm({ member, onSuccess }: any) {
  const [logoUrl, setLogoUrl] = useState(member.logo || '');
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      companyName: member.companyName,
      industry: member.industry,
      country: member.country,
      city: member.city,
      address: member.address,
      phone: member.phone || '',
      website: member.website || '',
      description: member.description || '',
      logo: member.logo || '',
      membershipLevel: member.membershipLevel || 'regular',
      contactPerson: member.contactPerson,
      contactEmail: member.contactEmail,
      contactPhone: member.contactPhone || '',
    }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    (window as any).__lastUploadObjectPath = data.objectPath;
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleLogoUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        setLogoUrl(objectPath);
        setValue('logo', objectPath);
        toast({ title: '로고 업로드 완료!' });
      }
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', `/api/members/${member.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "회원이 수정되었습니다" });
      queryClient.invalidateQueries({ queryKey: ['/api/members', { admin: true }] });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "수정 실패", variant: "destructive" });
    }
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">회사명</label>
          <Input {...register('companyName')} />
          {errors.companyName && <p className="text-sm text-destructive mt-1">{String(errors.companyName.message)}</p>}
        </div>
        <div>
          <label className="form-label">업종</label>
          <Input {...register('industry')} />
          {errors.industry && <p className="text-sm text-destructive mt-1">{String(errors.industry.message)}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">국가</label>
          <Select defaultValue={member.country} onValueChange={(value) => setValue('country', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Korea">한국</SelectItem>
              <SelectItem value="China">중국</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="form-label">도시</label>
          <Input {...register('city')} />
          {errors.city && <p className="text-sm text-destructive mt-1">{String(errors.city.message)}</p>}
        </div>
      </div>

      <div>
        <label className="form-label">주소</label>
        <Input {...register('address')} />
        {errors.address && <p className="text-sm text-destructive mt-1">{String(errors.address.message)}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">전화</label>
          <Input {...register('phone')} />
        </div>
        <div>
          <label className="form-label">웹사이트</label>
          <Input {...register('website')} />
        </div>
      </div>

      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('description')} />
      </div>

      <div>
        <label className="form-label">로고 업로드</label>
        <div className="flex gap-2 mb-2">
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={5242880}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleLogoUpload}
            buttonClassName="whitespace-nowrap"
          >
            <Upload className="h-4 w-4 mr-2" />
            로고 선택
          </ObjectUploader>
        </div>
        {logoUrl && (
          <div className="flex gap-2 items-center">
            <img src={logoUrl} alt="로고" className="h-16 object-contain rounded border" onError={(e) => e.currentTarget.style.display = 'none'} data-testid="img-member-logo" />
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setLogoUrl('');
                setValue('logo', '');
              }}
              data-testid="button-remove-logo"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="form-label">담당자명</label>
          <Input {...register('contactPerson')} />
          {errors.contactPerson && <p className="text-sm text-destructive mt-1">{String(errors.contactPerson.message)}</p>}
        </div>
        <div>
          <label className="form-label">담당자 이메일</label>
          <Input {...register('contactEmail')} />
          {errors.contactEmail && <p className="text-sm text-destructive mt-1">{String(errors.contactEmail.message)}</p>}
        </div>
        <div>
          <label className="form-label">담당자 전화</label>
          <Input {...register('contactPhone')} />
        </div>
      </div>

      <div>
        <label className="form-label">회원 등급</label>
        <Select defaultValue={member.membershipLevel} onValueChange={(value) => setValue('membershipLevel', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">정회원</SelectItem>
            <SelectItem value="premium">프리미엄</SelectItem>
            <SelectItem value="sponsor">후원</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? '저장 중...' : '저장'}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess}>
          취소
        </Button>
      </div>
    </form>
  );
}

// ... (나머지 컴포넌트들 - CreateNewsDialog, CreateEventDialog, CreateResourceDialog 등)
function CreateNewsDialog({ 
  onSuccess, 
  open, 
  onOpenChange 
}: { 
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
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
  
  const isPublished = watch('isPublished');

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
    (window as any).__lastUploadObjectPath = data.objectPath;
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleFeaturedImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        setFeaturedImageUrl(objectPath);
        setValue('featuredImage', objectPath);
        toast({ title: '대표 이미지 업로드 완료!' });
      }
    }
  };

  const handleAdditionalImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        const updated = [...imageUrls, objectPath];
        setImageUrls(updated);
        setValue('images', updated);
        toast({ title: '이미지 업로드 완료!' });
      }
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
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] });
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
    console.log('[News Form] Submitting:', data);
    console.log('[News Form] Errors:', errors);
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            <label className="form-label">요약</label>
            <Textarea {...register('excerpt')} data-testid="textarea-news-excerpt" />
            {errors.excerpt && <p className="text-sm text-destructive mt-1">{String(errors.excerpt.message)}</p>}
          </div>

          <div>
            <label className="form-label">내용</label>
            <Textarea {...register('content')} rows={5} data-testid="textarea-news-content" />
            {errors.content && <p className="text-sm text-destructive mt-1">{String(errors.content.message)}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">카테고리</label>
              <Select onValueChange={(value) => setValue('category', value, { shouldValidate: true, shouldDirty: true })}>
                <SelectTrigger data-testid="select-news-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notice">공지</SelectItem>
                  <SelectItem value="news">뉴스</SelectItem>
                  <SelectItem value="column">칼럼</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive mt-1">{String(errors.category.message)}</p>}
            </div>
            <div>
              <label className="form-label">발행</label>
              <div className="flex items-center space-x-2 mt-2">
                <Switch {...register('isPublished')} data-testid="switch-news-published" />
                <span className="text-sm">{isPublished ? '발행됨' : '초안'}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">대표 이미지</label>
            <div className="flex gap-2 mb-4">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleFeaturedImageUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                대표 이미지 선택
              </ObjectUploader>
            </div>
            {featuredImageUrl && (
              <img 
                src={featuredImageUrl} 
                alt="대표 이미지" 
                className="max-w-sm h-40 object-cover rounded border"
                data-testid="img-featured-preview"
                onError={(e) => {
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.opacity = '0.5';
                }}
              />
            )}
          </div>

          <div>
            <label className="form-label">추가 이미지</label>
            <div className="flex gap-2 mb-4">
              <ObjectUploader
                maxNumberOfFiles={10}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleAdditionalImageUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                이미지 추가
              </ObjectUploader>
              <Button
                type="button"
                variant="outline"
                onClick={addImageUrl}
              >
                URL 추가
              </Button>
            </div>
            <div className="flex gap-2 mb-4">
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                data-testid="input-image-url"
              />
            </div>
            
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={url} 
                      alt={`Image ${index}`}
                      className="w-full h-24 object-cover rounded border"
                      data-testid={`img-preview-${index}`}
                      onError={(e) => {
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.opacity = '0.5';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageUrl(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/90"
                      data-testid={`button-remove-image-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-news">
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Event Dialog - stub for now
function CreateEventDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" />행사 생성</Button>
      </DialogTrigger>
      <DialogContent>행사 생성 폼</DialogContent>
    </Dialog>
  );
}

// Create Resource Dialog - stub for now
function CreateResourceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" />자료 생성</Button>
      </DialogTrigger>
      <DialogContent>자료 생성 폼</DialogContent>
    </Dialog>
  );
}

// Create Inquiry Form
function CreateInquiryForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [category, setCategory] = useState('');
  const form = useForm({
    defaultValues: {
      subject: '',
      message: '',
      name: '',
      email: '',
      phone: '',
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, category })
      });
      if (!response.ok) throw new Error('Failed to create inquiry');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "문의가 접수되었습니다" });
      form.reset();
      setCategory('');
      onSuccess();
    },
    onError: () => {
      toast({ title: "문의 접수 실패", variant: "destructive" });
    }
  });

  return (
    <form onSubmit={form.handleSubmit(data => submitMutation.mutate(data))} className="space-y-4">
      <Input placeholder="제목" {...form.register('subject', { required: true })} data-testid="input-inquiry-subject" />
      <Input placeholder="이름" {...form.register('name', { required: true })} data-testid="input-inquiry-name" />
      <Input placeholder="이메일" type="email" {...form.register('email', { required: true })} data-testid="input-inquiry-email" />
      <Input placeholder="전화번호" {...form.register('phone')} data-testid="input-inquiry-phone" />
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger data-testid="select-inquiry-category">
          <SelectValue placeholder="카테고리 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="product">상품 문의</SelectItem>
          <SelectItem value="billing">결제 문의</SelectItem>
          <SelectItem value="support">기술 지원</SelectItem>
          <SelectItem value="other">기타</SelectItem>
        </SelectContent>
      </Select>
      <Textarea placeholder="문의 내용" {...form.register('message', { required: true })} data-testid="textarea-inquiry-message" />
      <Button type="submit" disabled={submitMutation.isPending || !category} data-testid="button-submit-inquiry" className="w-full">
        {submitMutation.isPending ? '접수 중...' : '문의 접수'}
      </Button>
    </form>
  );
}

// Event Registrations Dialog - stub for now
function EventRegistrationsDialog({ open, onOpenChange, event }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>행사 신청자 목록</DialogContent>
    </Dialog>
  );
}
