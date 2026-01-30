import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
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
  Upload,
  Network,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { t } from '@/lib/i18n';
import { Member, Inquiry, Partner, type PostWithTranslations, type InquiryWithReplies, type InquiryReply, type OrganizationMember } from '@shared/schema';
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
import UserEditDialog from '@/components/UserEditDialog';
import RichTextEditor from '@/components/RichTextEditor';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Form schemas
const newsSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  excerpt: z.string().min(1, '요약을 입력해주세요'),
  content: z.string().optional(),
  category: z.string().optional(),
  featuredImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  isPublished: z.boolean().optional().default(false),
  publishedAt: z.string().optional(),
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
  excerpt: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  fileUrl: z.string().optional(),
  isPublished: z.boolean().default(false),
});

const memberSchema = z.object({
  companyName: z.string(),
  industry: z.string(),
  country: z.string(),
  city: z.string(),
  address: z.string(),
  phone: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  membershipLevel: z.string(),
  contactPerson: z.string(),
  contactEmail: z.string().email(),
});

const organizationMemberSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  nameEn: z.string().optional(),
  nameZh: z.string().optional(),
  position: z.string().min(1, '직책을 입력해주세요'),
  positionEn: z.string().optional(),
  positionZh: z.string().optional(),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  photo: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionZh: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

const ORGANIZATION_CATEGORIES = [
  { value: 'executives', label: '임원진' },
  { value: 'honorary', label: '명예직' },
  { value: 'vicepresidents', label: '부회장' },
  { value: 'directors', label: '이사' },
  { value: 'advisors', label: '고문' },
  { value: 'secretariat', label: '사무국' },
  { value: 'committees', label: '위원회' },
  { value: 'organizations', label: '단체회원' },
];

// Location search component
function LocationSearch({ onSelect }: { onSelect: (location: string) => void }) {
  const [showResults, setShowResults] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [locations] = useState(['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주']);

  const filteredLocations = locations.filter(loc =>
    loc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <Input
        placeholder="장소 검색..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowResults(e.target.value.length >= 2);
        }}
        onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
      />
      {showResults && (
        <div className="absolute top-full mt-1 w-full bg-white border rounded shadow-lg z-10">
          <div className="max-h-48 overflow-y-auto">
            {filteredLocations.length > 0 ? (
              filteredLocations.map(location => (
                <div
                  key={location}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => {
                    onSelect(location);
                    setSearchTerm('');
                    setShowResults(false);
                  }}
                >
                  {location}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                검색 결과가 없습니다
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
  const [selectedOrgMember, setSelectedOrgMember] = useState<OrganizationMember | null>(null);
  const [orgCategoryFilter, setOrgCategoryFilter] = useState<string>('all');
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
    enabled: isAdmin && activeTab === 'dashboard',
  });

  // Users query
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
    enabled: isAdmin && activeTab === 'users',
  });

  // Members query
  const { data: membersData } = useQuery({
    queryKey: ['/api/members', { admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/members?admin=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'members',
  });

  // News query
  const { data: newsData } = useQuery({
    queryKey: ['/api/posts', { postType: 'news', admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/posts?postType=news&admin=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'articles',
  });

  // Events query
  const { data: eventsData } = useQuery({
    queryKey: ['/api/posts', { postType: 'event', admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/posts?postType=event&admin=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'events',
  });

  // Resources query
  const { data: resourcesData } = useQuery({
    queryKey: ['/api/posts', { postType: 'resource', admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/posts?postType=resource&admin=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'resources',
  });

  // Pages query
  const { data: pagesData } = useQuery({
    queryKey: ['/api/posts', { postType: 'page', admin: true }],
    queryFn: async () => {
      const response = await fetch('/api/posts?postType=page&admin=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'pages',
  });

  // Inquiries query
  const { data: inquiriesData } = useQuery({
    queryKey: ['/api/inquiries'],
    queryFn: async () => {
      const response = await fetch('/api/inquiries', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'inquiries',
  });

  // Partners query
  const { data: partnersData } = useQuery({
    queryKey: ['/api/partners'],
    queryFn: async () => {
      const response = await fetch('/api/partners', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'partners',
  });

  // Organization Members query
  const { data: orgMembersData } = useQuery({
    queryKey: ['/api/organization-members', { category: orgCategoryFilter, admin: true }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('isActive', 'false');
      if (orgCategoryFilter && orgCategoryFilter !== 'all') {
        params.append('category', orgCategoryFilter);
      }
      const response = await fetch(`/api/organization-members?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAdmin && activeTab === 'organization',
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">관리자만 접근 가능합니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Mobile: Dropdown Select */}
            <div className="md:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full" data-testid="mobile-tab-select">
                  <SelectValue placeholder="메뉴 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard" data-testid="option-tab-dashboard">대시보드</SelectItem>
                  <SelectItem value="users" data-testid="option-tab-users">사용자</SelectItem>
                  <SelectItem value="members" data-testid="option-tab-members">회원</SelectItem>
                  <SelectItem value="articles" data-testid="option-tab-articles">뉴스</SelectItem>
                  <SelectItem value="events" data-testid="option-tab-events">행사</SelectItem>
                  <SelectItem value="resources" data-testid="option-tab-resources">자료</SelectItem>
                  <SelectItem value="pages" data-testid="option-tab-pages">페이지</SelectItem>
                  <SelectItem value="inquiries" data-testid="option-tab-inquiries">문의</SelectItem>
                  <SelectItem value="organization" data-testid="option-tab-organization">조직</SelectItem>
                  {(user?.role === 'admin' || user?.role === 'operator') && (
                    <SelectItem value="manual" data-testid="option-tab-manual">매뉴얼</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Desktop: Tab List */}
            <div className="hidden md:block">
              <TabsList className="grid w-full grid-cols-9 lg:grid-cols-10 gap-1">
                <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="text-sm">대시보드</TabsTrigger>
                <TabsTrigger value="users" data-testid="tab-users" className="text-sm">사용자</TabsTrigger>
                <TabsTrigger value="members" data-testid="tab-members" className="text-sm">회원</TabsTrigger>
                <TabsTrigger value="articles" data-testid="tab-articles" className="text-sm">뉴스</TabsTrigger>
                <TabsTrigger value="events" data-testid="tab-events" className="text-sm">행사</TabsTrigger>
                <TabsTrigger value="resources" data-testid="tab-resources" className="text-sm">자료</TabsTrigger>
                <TabsTrigger value="pages" data-testid="tab-pages" className="text-sm">페이지</TabsTrigger>
                <TabsTrigger value="inquiries" data-testid="tab-inquiries" className="text-sm">문의</TabsTrigger>
                <TabsTrigger value="organization" data-testid="tab-organization" className="text-sm">조직</TabsTrigger>
                {(user?.role === 'admin' || user?.role === 'operator') && (
                  <TabsTrigger value="manual" data-testid="tab-manual" className="text-sm">매뉴얼</TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-6 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">회원</p>
                      <p className="text-3xl font-bold">{dashboardStats?.stats?.totalMembers || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <div className="p-6 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">뉴스</p>
                      <p className="text-3xl font-bold">{dashboardStats?.stats?.totalNews || 0}</p>
                    </div>
                    <Newspaper className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="p-6 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">행사</p>
                      <p className="text-3xl font-bold">{dashboardStats?.stats?.totalEvents || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
                <div className="p-6 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">문의</p>
                      <p className="text-3xl font-bold">{dashboardStats?.stats?.totalInquiries || 0}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-orange-500" />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <h2 className="text-2xl font-bold">사용자 관리</h2>
              <div className="space-y-2">
                {usersData?.map((user: any) => (
                  <div key={user.id} className="flex justify-between items-center p-4 border rounded">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'operator' ? 'secondary' : 'outline'} data-testid={`badge-user-role-${user.id}`}>
                        {user.role === 'admin' ? '관리자' : user.role === 'operator' ? '운영자' : '사용자'}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-user-type-${user.id}`}>
                        {user.userType === 'admin' ? '관리자' : user.userType === 'operator' ? '운영자' : user.userType === 'company' ? '회원사' : '일반'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
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
              </div>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">회원 관리</h2>
              </div>
              
              <div className="space-y-2">
                {membersData?.members?.map((member: Member) => (
                  <div key={member.id} className="flex justify-between items-center p-4 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{member.companyName}</p>
                      <p className="text-sm text-muted-foreground">{member.industry} • {member.country} {member.city}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(member);
                          setViewDialogOpen(true);
                        }}
                        data-testid={`button-view-member-${member.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
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
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">행사 관리</h2>
                <CreateEventDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] })} />
              </div>
              
              <div className="space-y-4">
                {eventsData?.posts?.map((event: PostWithTranslations) => (
                  <div key={event.id} className="p-4 border rounded flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{event.translations?.[0]?.title || '제목 없음'}</h4>
                      <p className="text-sm text-muted-foreground">{event.translations?.[0]?.subtitle || '설명 없음'}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                        <span>상태: {event.status}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
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
                  <div key={article.id} className="p-4 border rounded flex justify-between items-start gap-4">
                    {article.coverImage && (
                      <img 
                        src={article.coverImage} 
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
                  <div key={resource.id} className="p-4 border rounded flex justify-between items-start">
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
                ))}
              </div>
            </TabsContent>

            {/* Pages Tab */}
            <TabsContent value="pages" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">페이지 관리</h2>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
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
              </div>

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
              
              <div className="border rounded-lg overflow-hidden">
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
              </div>
            </TabsContent>

            {/* Organization Tab */}
            <TabsContent value="organization" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">조직 구조 관리</h2>
                <CreateOrganizationMemberDialog 
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/organization-members', { category: orgCategoryFilter, admin: true }] });
                  }}
                />
              </div>

              <div className="flex items-center space-x-4 mb-4">
                <span className="text-sm font-medium">카테고리:</span>
                <Select value={orgCategoryFilter} onValueChange={setOrgCategoryFilter}>
                  <SelectTrigger className="w-48" data-testid="select-org-category-filter">
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {ORGANIZATION_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {orgMembersData?.map((member: OrganizationMember) => (
                  <div key={member.id} className="flex justify-between items-center p-4 border rounded" data-testid={`row-org-member-${member.id}`}>
                    <div className="flex items-center space-x-4">
                      {member.photo && (
                        <img 
                          src={member.photo} 
                          alt={member.name} 
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      )}
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.position}</p>
                        <Badge variant="outline" className="mt-1">
                          {ORGANIZATION_CATEGORIES.find(c => c.value === member.category)?.label || member.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">순서: {member.sortOrder}</span>
                      <Badge variant={member.isActive ? 'default' : 'secondary'}>
                        {member.isActive ? '활성' : '비활성'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedOrgMember(member);
                        }}
                        data-testid={`button-edit-org-member-${member.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={async () => {
                          if (confirm('정말 이 구성원을 삭제하시겠습니까?')) {
                            try {
                              const response = await apiRequest('DELETE', `/api/organization-members/${member.id}`, null);
                              if (response.ok) {
                                toast({ title: "구성원이 삭제되었습니다" });
                                queryClient.invalidateQueries({ queryKey: ['/api/organization-members'] });
                              }
                            } catch (error) {
                              toast({ title: "삭제 실패", variant: "destructive" });
                            }
                          }
                        }}
                        data-testid={`button-delete-org-member-${member.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!orgMembersData || orgMembersData.length === 0) && (
                  <div className="p-8 text-center text-muted-foreground">
                    등록된 조직 구성원이 없습니다
                  </div>
                )}
              </div>

              {/* Edit Organization Member Dialog */}
              {selectedOrgMember && (
                <EditOrganizationMemberDialog 
                  member={selectedOrgMember}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/organization-members', { category: orgCategoryFilter, admin: true }] });
                  }}
                  onClose={() => setSelectedOrgMember(null)}
                />
              )}
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
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">0. 목적 정의</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>한국-현지 기업 네트워킹</li>
                      <li>투자/거래/협력 정보 제공</li>
                      <li>현지 정부/기관 연결</li>
                      <li>교민 비즈니스 지원</li>
                    </ul>
                    <p className="mt-3 text-sm font-medium text-destructive">이 목적에서 벗어나는 일은 하지 않는다.</p>
                  </div>

                  {/* 조직 구조 */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">1. 조직 구조</h3>
                    <p className="font-medium">법적 형태: 비영리 사단법인</p>
                    <p className="text-sm text-muted-foreground mb-4">회원구조: 개인·기업·기관</p>
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

                  {/* 역할과 책임 */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">2. 역할과 책임</h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">회장</p>
                        <p>조직의 대외 대표, 전략 수립 및 주요 의사결정</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">부회장(재무)</p>
                        <p>회계 관리, 예산 수립, 재정 감시</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">부회장(행사/프로그램)</p>
                        <p>행사 기획 및 실행, 프로그램 개발</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">사무국장</p>
                        <p>일상 운영 총괄, 회원 관리, 행정 업무</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">이사</p>
                        <p>주요 정책 결정, 감시 및 조언</p>
                      </div>
                    </div>
                  </div>

                  {/* 의사결정 및 거버넌스 */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">3. 의사결정 및 거버넌스</h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">총회 (연 1회)</p>
                        <p>주요 사항 보고, 예산 심의, 임원 선출</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">이사회 (월 1회)</p>
                        <p>중요 사업 결정, 예산 배분, 행사 승인</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">운영회의 (주 1회)</p>
                        <p>실무진 회의, 현안 논의, 업무 분담</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">소위원회</p>
                        <p>산업별, 분야별 전문위원회로 세부 사항 검토</p>
                      </div>
                    </div>
                  </div>

                  {/* 회원 관리 */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">4. 회원 관리</h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">회원 등급</p>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>정회원: 기업 및 기관 (의결권 있음)</li>
                          <li>준회원: 개인 및 소상공인 (의견 제시 권리)</li>
                          <li>명예회원: 특별 공헌자</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">회원 혜택</p>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>정보 공유 및 네트워킹 기회</li>
                          <li>행사 우선 참여권</li>
                          <li>법률/재무 상담</li>
                          <li>비즈니스 매칭 지원</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">회비</p>
                        <p>정회원 연 기본 회비 + 추가 프로그램 참가비</p>
                      </div>
                    </div>
                  </div>

                  {/* 행사 및 프로그램 운영 */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">5. 행사 및 프로그램 운영</h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">정기 행사</p>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>분기별 경제 세미나</li>
                          <li>상반/하반 정기 회의</li>
                          <li>연례 신년회 및 송년회</li>
                          <li>월별 회원 간담회</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">특별 프로그램</p>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>비즈니스 미션 및 현지 방문</li>
                          <li>투자 설명회</li>
                          <li>산업별 포럼</li>
                          <li>온라인 교육 및 웨비나</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">행사 기획 프로세스</p>
                        <p>기획 → 예산 승인 → 실행 → 결과 보고</p>
                      </div>
                    </div>
                  </div>

                  {/* 재정 및 회계 관리 */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">6. 재정 및 회계 관리</h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">재원</p>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>회비 (정회원, 준회원)</li>
                          <li>행사 수수료</li>
                          <li>후원금 및 기부금</li>
                          <li>정부 지원금</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">예산 원칙</p>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>투명성 - 모든 수지 명시</li>
                          <li>효율성 - 필수 사업에 집중</li>
                          <li>공정성 - 회원 이익 최우선</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">결산</p>
                        <p>연 1회 감사 실시, 총회에서 보고 및 승인</p>
                      </div>
                    </div>
                  </div>

                  {/* 대외 관계 및 파트너십 */}
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">7. 대외 관계 및 파트너십</h3>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">정부 기관 연계</p>
                        <p>한국 및 현지 정부 기관과의 협력, 정책 건의</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">유관 기관 협력</p>
                        <p>다른 상공회의소, 업계 협회와의 연대</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">기업 파트너십</p>
                        <p>회원사 간 비즈니스 매칭, 합작투자 지원</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">미디어 관계</p>
                        <p>뉴스 배포, 보도자료 관리, 회원 홍보</p>
                      </div>
                    </div>
                  </div>

                  {/* 결론 */}
                  <div className="border-2 border-blue-500 rounded-lg p-6 bg-blue-50 dark:bg-blue-950">
                    <h3 className="text-lg font-semibold mb-4">8. 결론</h3>
                    <p className="text-center text-lg font-semibold mb-3">
                      비영리는 <span className="text-blue-600 dark:text-blue-400">돈 버는 조직이 아니라 신뢰를 축적하는 조직</span>이다.
                    </p>
                    <p className="text-center text-muted-foreground">
                      신뢰가 쌓이면 <strong>비즈니스·협력은 자연스럽게 따라온다.</strong>
                    </p>
                    <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded border-l-4 border-blue-500">
                      <p className="text-sm font-medium text-foreground mb-2">KSCC 운영의 핵심 가치:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>투명성과 신뢰 우선</li>
                        <li>회원의 이익과 발전</li>
                        <li>한-중 경제 협력 증진</li>
                        <li>윤리적 운영과 책임성</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Inquiries Tab */}
            <TabsContent value="inquiries" className="space-y-6">
              <h2 className="text-2xl font-bold">문의 관리</h2>
              <div className="space-y-4">
                {inquiriesData?.inquiries?.map((inquiry: InquiryWithReplies) => (
                  <div key={inquiry.id} className="p-4 border rounded flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{inquiry.subject}</h4>
                      <p className="text-sm text-muted-foreground">{inquiry.name} • {inquiry.email}</p>
                      <p className="text-sm mt-2 line-clamp-2">{inquiry.message}</p>
                    </div>
                    <div className="flex space-x-2">
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
            </TabsContent>
          </Tabs>

          {/* Member View Dialog */}
          {selectedItem && activeTab === 'members' && (
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <UserEditDialog 
              user={selectedItem}
              isOpen={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/users'] });
              }}
            />
          )}

          {/* News Edit Dialog */}
          {selectedItem && activeTab === 'articles' && editDialogOpen && (
            <Dialog open={editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(false)}>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>뉴스 수정</DialogTitle>
                </DialogHeader>
                <EditNewsForm 
                  news={selectedItem} 
                  onSuccess={() => {
                    setEditDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] });
                  }}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Event Edit Dialog */}
          {selectedItem && activeTab === 'events' && editDialogOpen && (
            <Dialog open={editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(false)}>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>행사 수정</DialogTitle>
                </DialogHeader>
                <EditEventForm 
                  event={selectedItem} 
                  onSuccess={() => {
                    setEditDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] });
                  }}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Resource Edit Dialog */}
          {selectedItem && activeTab === 'resources' && editDialogOpen && (
            <Dialog open={editDialogOpen} onOpenChange={(open) => !open && setEditDialogOpen(false)}>
              <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>자료 수정</DialogTitle>
                </DialogHeader>
                <EditResourceForm 
                  resource={selectedItem} 
                  onSuccess={() => {
                    setEditDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'resource', admin: true }] });
                  }}
                />
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
    }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', `/api/members/${member.id}`, {
        ...data,
        logo: logoUrl || data.logo,
      });
    },
    onSuccess: () => {
      toast({ title: "회원 정보가 업데이트되었습니다" });
      queryClient.invalidateQueries({ queryKey: ['/api/members', { admin: true }] });
      onSuccess();
    },
    onError: () => {
      toast({ title: "업데이트 실패", variant: "destructive" });
    }
  });

  return (
    <form onSubmit={handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">회사명</label>
          <Input {...register('companyName')} />
        </div>
        <div>
          <label className="form-label">업종</label>
          <Input {...register('industry')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="form-label">국가</label>
          <Input {...register('country')} />
        </div>
        <div>
          <label className="form-label">도시</label>
          <Input {...register('city')} />
        </div>
        <div>
          <label className="form-label">주소</label>
          <Input {...register('address')} />
        </div>
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
        <label className="form-label">로고 URL</label>
        <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        {logoUrl && <img src={logoUrl} alt="Logo" className="mt-2 h-12 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />}
      </div>

      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('description')} rows={3} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">담당자</label>
          <Input {...register('contactPerson')} />
        </div>
        <div>
          <label className="form-label">담당자 이메일</label>
          <Input {...register('contactEmail')} />
        </div>
      </div>

      <div>
        <label className="form-label">회원등급</label>
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

// EditNewsForm Component
function EditNewsForm({ news, onSuccess }: { news: PostWithTranslations; onSuccess: () => void }) {
  // Extract existing data from news
  const categoryFromMeta = String(news.meta?.find(m => m.key === 'category')?.value || news.tags?.[0] || '');
  const existingImages = (news.meta?.find(m => m.key === 'news.images')?.value as string[]) || [];
  
  const [featuredImageUrl, setFeaturedImageUrl] = useState(news.coverImage || '');
  const [imageUrls, setImageUrls] = useState<string[]>(existingImages);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: news.translations?.[0]?.title || '',
      excerpt: news.translations?.[0]?.excerpt || '',
      content: news.translations?.[0]?.content || '',
      category: categoryFromMeta,
      featuredImage: news.coverImage || '',
      images: existingImages,
      isPublished: news.status === 'published',
      publishedAt: news.publishedAt ? new Date(news.publishedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    }
  });
  
  const isPublished = watch('isPublished');
  const publishedAt = watch('publishedAt');
  const selectedCategory = watch('category');

  const setImagePublicAcl = async (objectPath: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: objectPath }),
      });
    } catch (e) {
      console.error('Failed to set image ACL:', e);
    }
  };

  const handleGetUploadParameters = async (file: { type?: string }) => {
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
      headers: {
        'Content-Type': file?.type || 'application/octet-stream',
      },
    };
  };

  const handleFeaturedImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        await setImagePublicAcl(objectPath);
        setFeaturedImageUrl(objectPath);
        setValue('featuredImage', objectPath);
        toast({ title: '대표 이미지가 업로드되었습니다' });
      }
    }
  };

  const handleAdditionalImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        await setImagePublicAcl(objectPath);
        const updated = [...imageUrls, objectPath];
        setImageUrls(updated);
        setValue('images', updated);
        toast({ title: '이미지가 추가되었습니다' });
      }
    }
  };

  const addImageUrl = () => {
    if (newImageUrl.trim() && (newImageUrl.startsWith('http://') || newImageUrl.startsWith('https://'))) {
      const updated = [...imageUrls, newImageUrl.trim()];
      setImageUrls(updated);
      setValue('images', updated);
      setNewImageUrl('');
      setShowUrlInput(false);
      toast({ title: '이미지 URL이 추가되었습니다' });
    } else {
      toast({ title: '올바른 URL을 입력해주세요', variant: 'destructive' });
    }
  };

  const removeImageUrl = (index: number) => {
    const updated = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updated);
    setValue('images', updated);
  };

  const removeFeaturedImage = () => {
    setFeaturedImageUrl('');
    setValue('featuredImage', '');
  };

  const updateMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      return await updatePost({
        postId: news.id,
        post: {
          coverImage: featuredImageUrl || formData.featuredImage || null,
          status: (formData.isPublished ? 'published' : 'draft') as any,
          publishedAt: formData.isPublished ? (formData.publishedAt ? new Date(formData.publishedAt) : new Date()) : null,
          tags: [formData.category],
        },
        translation: {
          locale: 'ko' as any,
          title: formData.title,
          excerpt: formData.excerpt,
          subtitle: formData.excerpt,
          content: formData.content,
        },
        meta: [
          { key: 'category', value: formData.category },
          ...(imageUrls.length > 0 ? [{ key: 'news.images', value: imageUrls }] : []),
        ],
      });
    },
    onSuccess: () => {
      toast({ title: "뉴스가 수정되었습니다" });
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] });
      onSuccess();
    },
    onError: (error) => {
      console.error('[EditNewsForm] Update failed:', error);
      toast({ 
        title: "뉴스 수정 실패", 
        description: error instanceof Error ? error.message : "알 수 없는 오류",
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log('[EditNewsForm] Form submitted:', data);
    console.log('[EditNewsForm] Form errors:', errors);
    updateMutation.mutate(data);
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
                onGetUploadParameters={handleGetUploadParameters}
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
                onGetUploadParameters={handleGetUploadParameters}
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

      <div className="border rounded-lg p-4 bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            추가 이미지
            {imageUrls.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {imageUrls.length}개
              </span>
            )}
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs"
            >
              <LinkIcon className="h-3.5 w-3.5 mr-1" />
              URL
            </Button>
            <ObjectUploader
              maxNumberOfFiles={10}
              maxFileSize={10485760}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleAdditionalImageUpload}
              buttonClassName="h-8 text-xs"
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              업로드
            </ObjectUploader>
          </div>
        </div>

        {showUrlInput && (
          <div className="flex gap-2 mb-4">
            <Input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1"
              data-testid="input-image-url-edit"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addImageUrl();
                }
              }}
            />
            <Button type="button" onClick={addImageUrl} size="sm">
              추가
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setShowUrlInput(false);
                setNewImageUrl('');
              }}
            >
              취소
            </Button>
          </div>
        )}
        
        {imageUrls.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative group aspect-square">
                <img 
                  src={url} 
                  alt={`추가 이미지 ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border"
                  data-testid={`img-preview-edit-${index}`}
                  onError={(e) => {
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.opacity = '0.5';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImageUrl(index)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  data-testid={`button-remove-image-edit-${index}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>추가 이미지가 없습니다</p>
          </div>
        )}
      </div>

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

// EditEventForm Component
function EditEventForm({ event, onSuccess }: { event: PostWithTranslations; onSuccess: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const translation = event.translations?.[0];
  const eventMeta = event.meta || [];
  const getMetaVal = (key: string) => String(eventMeta.find(m => m.key === key)?.value || '');
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: translation?.title || '',
      description: translation?.excerpt || '',
      content: translation?.content || '',
      eventDate: getMetaVal('event.date'),
      endDate: getMetaVal('event.endDate'),
      location: getMetaVal('event.location'),
      category: getMetaVal('event.category') || 'networking',
      eventType: getMetaVal('event.eventType') || 'offline',
      capacity: parseInt(getMetaVal('event.capacity')) || undefined,
      fee: parseInt(getMetaVal('event.fee')) || 0,
      registrationDeadline: getMetaVal('event.registrationDeadline'),
      isPublic: true,
      isPublished: event.status === 'published',
    }
  });
  
  const isPublished = watch('isPublished');

  const updateMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      return await updatePost({
        postId: event.id,
        post: {
          status: (formData.isPublished ? 'published' : 'draft') as any,
          publishedAt: formData.isPublished ? new Date() : null,
        },
        translation: {
          locale: 'ko' as any,
          title: formData.title,
          excerpt: formData.description,
          subtitle: formData.description,
          content: formData.content || '',
        },
        meta: [
          { key: 'event.date', value: formData.eventDate },
          { key: 'event.endDate', value: formData.endDate || '' },
          { key: 'event.location', value: formData.location },
          { key: 'event.category', value: formData.category },
          { key: 'event.eventType', value: formData.eventType },
          { key: 'event.capacity', value: String(formData.capacity || '') },
          { key: 'event.fee', value: String(formData.fee || 0) },
          { key: 'event.registrationDeadline', value: formData.registrationDeadline || '' },
        ],
      });
    },
    onSuccess: () => {
      toast({ title: "행사가 수정되었습니다" });
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "행사 수정 실패", description: error instanceof Error ? error.message : "알 수 없는 오류", variant: "destructive" });
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
      <div>
        <label className="form-label">제목</label>
        <Input {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{String(errors.title.message)}</p>}
      </div>
      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('description')} />
        {errors.description && <p className="text-sm text-destructive">{String(errors.description.message)}</p>}
      </div>
      <div>
        <label className="form-label">상세 내용</label>
        <RichTextEditor
          value={watch('content') || ''}
          onChange={(value) => setValue('content', value)}
          data-testid="editor-event-content-edit"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">시작 날짜</label>
          <Input type="datetime-local" {...register('eventDate')} />
        </div>
        <div>
          <label className="form-label">종료 날짜</label>
          <Input type="datetime-local" {...register('endDate')} />
        </div>
      </div>
      <div>
        <label className="form-label">장소</label>
        <Input {...register('location')} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="form-label">카테고리</label>
          <Select defaultValue={getMetaVal('event.category') || 'networking'} onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="networking">네트워킹</SelectItem>
              <SelectItem value="seminar">세미나</SelectItem>
              <SelectItem value="conference">컨퍼런스</SelectItem>
              <SelectItem value="workshop">워크샵</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="form-label">정원</label>
          <Input type="number" {...register('capacity', { valueAsNumber: true })} />
        </div>
        <div>
          <label className="form-label">참가비</label>
          <Input type="number" {...register('fee', { valueAsNumber: true })} />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Switch checked={isPublished} onCheckedChange={(c) => setValue('isPublished', c)} />
        <span className="text-sm">{isPublished ? '발행됨' : '초안'}</span>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? '수정 중...' : '수정'}</Button>
        <Button type="button" variant="outline" onClick={onSuccess}>취소</Button>
      </div>
    </form>
  );
}

// EditResourceForm Component
function EditResourceForm({ resource, onSuccess }: { resource: PostWithTranslations; onSuccess: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fileUrl, setFileUrl] = useState('');
  
  const translation = resource.translations?.[0];
  const fileUrlMeta = resource.meta?.find((m: any) => m.key === 'resource.fileUrl') as any;
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: translation?.title || '',
      excerpt: translation?.excerpt || '',
      content: translation?.content || '',
      tags: (resource.tags as string[]) || [],
      fileUrl: fileUrlMeta?.value || '',
      isPublished: resource.status === 'published',
    }
  });
  
  const isPublished = watch('isPublished');

  const setFilePublicAcl = async (objectPath: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: objectPath }),
      });
    } catch (e) {
      console.error('Failed to set file ACL:', e);
    }
  };

  const handleGetUploadParameters = async (file: { type?: string }) => {
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
      headers: {
        'Content-Type': file?.type || 'application/octet-stream',
      },
    };
  };

  const handleFileUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        await setFilePublicAcl(objectPath);
        setFileUrl(objectPath);
        setValue('fileUrl', objectPath);
        toast({ title: '파일 업로드 완료!' });
      }
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (formData: any) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const finalFileUrl = fileUrl || formData.fileUrl;
      return await updatePost({
        postId: resource.id,
        post: {
          status: (formData.isPublished ? 'published' : 'draft') as any,
          publishedAt: formData.isPublished ? new Date() : null,
          tags: formData.tags,
        },
        translation: {
          locale: 'ko' as any,
          title: formData.title,
          excerpt: formData.excerpt,
          subtitle: formData.excerpt,
          content: formData.content || '',
        },
        meta: finalFileUrl ? [{ key: 'resource.fileUrl', value: finalFileUrl }] : [],
      });
    },
    onSuccess: () => {
      toast({ title: "자료가 수정되었습니다" });
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'resource', admin: true }] });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: "자료 수정 실패", description: error instanceof Error ? error.message : "알 수 없는 오류", variant: "destructive" });
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
      <div>
        <label className="form-label">제목</label>
        <Input {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{String(errors.title.message)}</p>}
      </div>
      <div>
        <label className="form-label">설명</label>
        <Textarea {...register('excerpt')} />
        {errors.excerpt && <p className="text-sm text-destructive">{String(errors.excerpt.message)}</p>}
      </div>
      <div>
        <label className="form-label">내용</label>
        <RichTextEditor
          value={watch('content') || ''}
          onChange={(value) => setValue('content', value)}
          data-testid="editor-resource-content-edit"
        />
      </div>
      <div>
        <label className="form-label">첨부파일</label>
        <div className="flex gap-2 mb-4">
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={104857600}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleFileUpload}
            buttonClassName="whitespace-nowrap"
          >
            <Upload className="h-4 w-4 mr-2" />
            파일 선택
          </ObjectUploader>
        </div>
        {(fileUrl || fileUrlMeta?.value) && (
          <p className="text-sm text-muted-foreground">
            현재 파일: <a href={fileUrl || fileUrlMeta?.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{fileUrl || fileUrlMeta?.value}</a>
          </p>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Switch checked={isPublished} onCheckedChange={(c) => setValue('isPublished', c)} />
        <span className="text-sm">{isPublished ? '발행됨' : '초안'}</span>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? '수정 중...' : '수정'}</Button>
        <Button type="button" variant="outline" onClick={onSuccess}>취소</Button>
      </div>
    </form>
  );
}

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
  const [showUrlInput, setShowUrlInput] = useState(false);
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
      publishedAt: new Date().toISOString().slice(0, 16),
    }
  });
  
  const isPublished = watch('isPublished');
  const selectedCategory = watch('category');
  const publishedAt = watch('publishedAt');

  const setImagePublicAcl = async (objectPath: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: objectPath }),
      });
    } catch (e) {
      console.error('Failed to set image ACL:', e);
    }
  };

  const handleGetUploadParameters = async (file: { type?: string }) => {
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
      headers: {
        'Content-Type': file?.type || 'application/octet-stream',
      },
    };
  };

  const handleFeaturedImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        await setImagePublicAcl(objectPath);
        setFeaturedImageUrl(objectPath);
        setValue('featuredImage', objectPath);
        toast({ title: '대표 이미지가 업로드되었습니다' });
      }
    }
  };

  const handleAdditionalImageUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        await setImagePublicAcl(objectPath);
        const updated = [...imageUrls, objectPath];
        setImageUrls(updated);
        setValue('images', updated);
        toast({ title: '이미지가 추가되었습니다' });
      }
    }
  };

  const addImageUrl = () => {
    if (newImageUrl.trim() && (newImageUrl.startsWith('http://') || newImageUrl.startsWith('https://'))) {
      const updated = [...imageUrls, newImageUrl.trim()];
      setImageUrls(updated);
      setValue('images', updated);
      setNewImageUrl('');
      setShowUrlInput(false);
      toast({ title: '이미지 URL이 추가되었습니다' });
    } else {
      toast({ title: '올바른 URL을 입력해주세요', variant: 'destructive' });
    }
  };

  const removeImageUrl = (index: number) => {
    const updated = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updated);
    setValue('images', updated);
  };

  const removeFeaturedImage = () => {
    setFeaturedImageUrl('');
    setValue('featuredImage', '');
  };

  const createMutation = useMutation({
    mutationFn: async (formData: NewsFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapNewsFormToPost(formData, user.id);
      return await createPost({ post, translation, meta });
    },
    onSuccess: () => {
      toast({ title: "뉴스가 성공적으로 생성되었습니다" });
      reset();
      setFeaturedImageUrl('');
      setImageUrls([]);
      setShowUrlInput(false);
      setNewImageUrl('');
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'news', admin: true }] });
      onSuccess();
    },
    onError: (error) => {
      console.error('[CreateNewsDialog] Create failed:', error);
      toast({ 
        title: "뉴스 생성 실패", 
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
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
          <Plus className="h-4 w-4 mr-1" />
          뉴스 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
          <DialogTitle className="text-xl font-semibold">새 뉴스 작성</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">새로운 뉴스 또는 공지사항을 작성합니다</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  제목 <span className="text-destructive">*</span>
                </label>
                <Input 
                  {...register('title')} 
                  placeholder="뉴스 제목을 입력하세요"
                  className="h-11"
                  data-testid="input-news-title" 
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
                  data-testid="textarea-news-excerpt" 
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
                  <SelectTrigger className="h-11" data-testid="select-news-category">
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
                    data-testid="switch-news-published" 
                  />
                  <span className={`text-sm font-medium ${isPublished ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {isPublished ? '즉시 발행' : '임시저장'}
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
                  data-testid="input-news-published-at" 
                />
                <p className="text-xs text-muted-foreground mt-1">발행일을 지정할 수 있습니다. 비워두면 현재 시간으로 설정됩니다.</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                본문 내용 <span className="text-destructive">*</span>
              </label>
              <RichTextEditor
                value={watch('content') || ''}
                onChange={(value) => setValue('content', value)}
                data-testid="editor-news-content"
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
                      onGetUploadParameters={handleGetUploadParameters}
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
                    data-testid="img-featured-preview"
                    onError={(e) => {
                      e.currentTarget.style.borderColor = '#ef4444';
                      e.currentTarget.style.opacity = '0.5';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={10485760}
                      onGetUploadParameters={handleGetUploadParameters}
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
                      data-testid="button-remove-featured"
                    >
                      <X className="h-4 w-4 mr-1" />
                      삭제
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  추가 이미지
                  {imageUrls.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {imageUrls.length}개
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-xs"
                  >
                    <LinkIcon className="h-3.5 w-3.5 mr-1" />
                    URL
                  </Button>
                  <ObjectUploader
                    maxNumberOfFiles={10}
                    maxFileSize={10485760}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleAdditionalImageUpload}
                    buttonClassName="h-8 text-xs"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    업로드
                  </ObjectUploader>
                </div>
              </div>

              {showUrlInput && (
                <div className="flex gap-2 mb-4">
                  <Input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1"
                    data-testid="input-image-url"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addImageUrl();
                      }
                    }}
                  />
                  <Button type="button" onClick={addImageUrl} size="sm">
                    추가
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setShowUrlInput(false);
                      setNewImageUrl('');
                    }}
                  >
                    취소
                  </Button>
                </div>
              )}
              
              {imageUrls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img 
                        src={url} 
                        alt={`추가 이미지 ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                        data-testid={`img-preview-${index}`}
                        onError={(e) => {
                          e.currentTarget.style.borderColor = '#ef4444';
                          e.currentTarget.style.opacity = '0.5';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImageUrl(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        data-testid={`button-remove-image-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>추가 이미지가 없습니다</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-6 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1 sm:flex-none"
            >
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending} 
              className="flex-1 sm:flex-none sm:min-w-[120px]"
              data-testid="button-submit-news"
            >
              {createMutation.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  생성 중...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  뉴스 생성
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Event Dialog
function CreateEventDialog({ onSuccess }: { onSuccess: () => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
      eventDate: '',
      endDate: '',
      location: '',
      category: 'networking',
      eventType: 'offline',
      capacity: undefined,
      fee: 0,
      registrationDeadline: '',
      images: [] as string[],
      isPublic: true,
      isPublished: true,
    }
  });
  
  const isPublished = watch('isPublished');

  const createMutation = useMutation({
    mutationFn: async (formData: EventFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const { post, translation, meta } = mapEventFormToPost(formData, user.id);
      return await createPost({ post, translation, meta });
    },
    onSuccess: () => {
      toast({ title: "행사가 생성되었습니다" });
      reset();
      setInternalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'event', admin: true }] });
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
    console.log('[Event Form] Submitting:', data);
    console.log('[Event Form] Errors:', errors);
    createMutation.mutate(data);
  };

  return (
    <Dialog open={internalOpen} onOpenChange={setInternalOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-event">
          <Plus className="h-4 w-4" />
          행사 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 행사 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">제목</label>
            <Input {...register('title')} data-testid="input-event-title" />
            {errors.title && <p className="text-sm text-destructive mt-1">{String(errors.title.message)}</p>}
          </div>

          <div>
            <label className="form-label">설명</label>
            <Textarea {...register('description')} data-testid="textarea-event-description" />
            {errors.description && <p className="text-sm text-destructive mt-1">{String(errors.description.message)}</p>}
          </div>

          <div>
            <label className="form-label">상세 내용</label>
            <RichTextEditor
              value={watch('content') || ''}
              onChange={(value) => setValue('content', value)}
              data-testid="editor-event-content"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">시작 날짜</label>
              <Input type="datetime-local" {...register('eventDate')} data-testid="input-event-date" />
              {errors.eventDate && <p className="text-sm text-destructive mt-1">{String(errors.eventDate.message)}</p>}
            </div>
            <div>
              <label className="form-label">종료 날짜</label>
              <Input type="datetime-local" {...register('endDate')} data-testid="input-event-endDate" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">장소</label>
              <Input {...register('location')} data-testid="input-event-location" />
              {errors.location && <p className="text-sm text-destructive mt-1">{String(errors.location.message)}</p>}
            </div>
            <div>
              <label className="form-label">카테고리</label>
              <Select defaultValue="networking" onValueChange={(v) => setValue('category', v)}>
                <SelectTrigger data-testid="select-event-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="networking">네트워킹</SelectItem>
                  <SelectItem value="seminar">세미나</SelectItem>
                  <SelectItem value="conference">컨퍼런스</SelectItem>
                  <SelectItem value="workshop">워크샵</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-destructive mt-1">{String(errors.category.message)}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">형식</label>
              <Select defaultValue="offline" onValueChange={(v) => setValue('eventType', v)}>
                <SelectTrigger data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">오프라인</SelectItem>
                  <SelectItem value="online">온라인</SelectItem>
                  <SelectItem value="hybrid">하이브리드</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="form-label">정원</label>
              <Input type="number" {...register('capacity', { valueAsNumber: true })} data-testid="input-event-capacity" />
            </div>
            <div>
              <label className="form-label">참가비</label>
              <Input type="number" {...register('fee', { valueAsNumber: true })} data-testid="input-event-fee" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={isPublished} onCheckedChange={(c) => setValue('isPublished', c)} data-testid="switch-event-published" />
            <span className="text-sm">{isPublished ? '발행됨' : '초안'}</span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-event">
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setInternalOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Create Resource Dialog
function CreateResourceDialog({ onSuccess }: { onSuccess: () => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      content: '',
      tags: [] as string[],
      fileUrl: '',
      isPublished: false,
    }
  });

  const isPublished = watch('isPublished');

  const setFilePublicAcl = async (objectPath: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: objectPath }),
      });
    } catch (e) {
      console.error('Failed to set file ACL:', e);
    }
  };

  const handleGetUploadParameters = async (file: { type?: string }) => {
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
      headers: {
        'Content-Type': file?.type || 'application/octet-stream',
      },
    };
  };

  const handleFileUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        await setFilePublicAcl(objectPath);
        setFileUrl(objectPath);
        setValue('fileUrl', objectPath);
        toast({ title: '파일 업로드 완료!' });
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: async (formData: ResourceFormData) => {
      if (!user?.id) throw new Error('인증되지 않은 사용자입니다');
      const finalFileUrl = fileUrl || formData.fileUrl;
      const { post, translation, meta } = mapResourceFormToPost(formData, user.id, finalFileUrl);
      return await createPost({ post, translation, meta });
    },
    onSuccess: () => {
      toast({ title: "자료가 생성되었습니다" });
      reset();
      setFileUrl('');
      setInternalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/posts', { postType: 'resource', admin: true }] });
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

  const onSubmit = (data: any) => {
    console.log('[Resource Form] Submitting:', data);
    console.log('[Resource Form] Errors:', errors);
    createMutation.mutate(data);
  };

  return (
    <Dialog open={internalOpen} onOpenChange={setInternalOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-resource">
          <Plus className="h-4 w-4" />
          자료 생성
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 자료 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">제목</label>
            <Input {...register('title')} data-testid="input-resource-title" />
            {errors.title && <p className="text-sm text-destructive mt-1">{String(errors.title.message)}</p>}
          </div>

          <div>
            <label className="form-label">설명</label>
            <Textarea {...register('excerpt')} data-testid="textarea-resource-excerpt" />
            {errors.excerpt && <p className="text-sm text-destructive mt-1">{String(errors.excerpt.message)}</p>}
          </div>

          <div>
            <label className="form-label">상세 내용</label>
            <RichTextEditor
              value={watch('content') || ''}
              onChange={(value) => setValue('content', value)}
              data-testid="editor-resource-content"
            />
          </div>

          <div>
            <label className="form-label">첨부파일</label>
            <div className="flex gap-2 mb-4">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={104857600}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleFileUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                파일 선택
              </ObjectUploader>
            </div>
            {fileUrl && (
              <p className="text-sm text-muted-foreground">
                선택된 파일: <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{fileUrl}</a>
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={isPublished} onCheckedChange={(c) => setValue('isPublished', c)} data-testid="switch-resource-published" />
            <span className="text-sm">{isPublished ? '발행됨' : '초안'}</span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-resource">
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setInternalOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
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

// Create Organization Member Dialog
function CreateOrganizationMemberDialog({ 
  onSuccess 
}: { 
  onSuccess: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [photo, setPhoto] = useState('');
  
  const form = useForm({
    resolver: zodResolver(organizationMemberSchema),
    defaultValues: {
      name: '',
      nameEn: '',
      nameZh: '',
      position: '',
      positionEn: '',
      positionZh: '',
      category: '',
      photo: '',
      description: '',
      descriptionEn: '',
      descriptionZh: '',
      sortOrder: 0,
      isActive: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof organizationMemberSchema>) => {
      const response = await fetch('/api/organization-members', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          category,
          photo,
          isActive,
        })
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "구성원이 추가되었습니다" });
      form.reset();
      setCategory('');
      setPhoto('');
      setIsActive(true);
      setInternalOpen(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: "추가 실패", variant: "destructive" });
    }
  });

  const setPhotoPublicAcl = async (objectPath: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: objectPath }),
      });
    } catch (e) {
      console.error('Failed to set photo ACL:', e);
    }
  };

  const handleGetUploadParameters = async (file: { type?: string }) => {
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
      headers: {
        'Content-Type': file?.type || 'application/octet-stream',
      },
    };
  };

  const handlePhotoUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        await setPhotoPublicAcl(objectPath);
        setPhoto(objectPath);
      }
    }
  };

  return (
    <Dialog open={internalOpen} onOpenChange={setInternalOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setInternalOpen(true)} data-testid="button-create-org-member">
          <Plus className="h-4 w-4 mr-2" />
          구성원 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>조직 구성원 추가</DialogTitle>
          <DialogDescription>새로운 조직 구성원 정보를 입력하세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">이름 (한국어) *</label>
              <Input {...form.register('name')} data-testid="input-org-name" />
            </div>
            <div>
              <label className="text-sm font-medium">이름 (영어)</label>
              <Input {...form.register('nameEn')} data-testid="input-org-name-en" />
            </div>
            <div>
              <label className="text-sm font-medium">이름 (중국어)</label>
              <Input {...form.register('nameZh')} data-testid="input-org-name-zh" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">직책 (한국어) *</label>
              <Input {...form.register('position')} data-testid="input-org-position" />
            </div>
            <div>
              <label className="text-sm font-medium">직책 (영어)</label>
              <Input {...form.register('positionEn')} data-testid="input-org-position-en" />
            </div>
            <div>
              <label className="text-sm font-medium">직책 (중국어)</label>
              <Input {...form.register('positionZh')} data-testid="input-org-position-zh" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">카테고리 *</label>
              <Select value={category} onValueChange={(value) => {
                setCategory(value);
                form.setValue('category', value);
              }}>
                <SelectTrigger data-testid="select-org-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">정렬 순서</label>
              <Input type="number" {...form.register('sortOrder', { valueAsNumber: true })} data-testid="input-org-sort-order" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">사진</label>
            <div className="flex gap-2 items-center">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handlePhotoUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                사진 업로드
              </ObjectUploader>
              {photo && (
                <img src={photo} alt="미리보기" className="w-12 h-12 rounded-full object-cover" />
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">설명 (한국어)</label>
            <Textarea {...form.register('description')} data-testid="textarea-org-description" />
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} data-testid="switch-org-active" />
            <span className="text-sm">{isActive ? '활성' : '비활성'}</span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending || !category} data-testid="button-submit-org-member">
              {createMutation.isPending ? '추가 중...' : '추가'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setInternalOpen(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Organization Member Dialog
function EditOrganizationMemberDialog({ 
  member,
  onSuccess,
  onClose
}: { 
  member: OrganizationMember;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(true);
  const { toast } = useToast();
  const [category, setCategory] = useState(member.category);
  const [isActive, setIsActive] = useState(member.isActive);
  const [photo, setPhoto] = useState(member.photo || '');
  
  const form = useForm({
    resolver: zodResolver(organizationMemberSchema),
    defaultValues: {
      name: member.name,
      nameEn: member.nameEn || '',
      nameZh: member.nameZh || '',
      position: member.position,
      positionEn: member.positionEn || '',
      positionZh: member.positionZh || '',
      category: member.category,
      photo: member.photo || '',
      description: member.description || '',
      descriptionEn: member.descriptionEn || '',
      descriptionZh: member.descriptionZh || '',
      sortOrder: member.sortOrder,
      isActive: member.isActive,
    }
  });

  useEffect(() => {
    setCategory(member.category);
    setIsActive(member.isActive);
    setPhoto(member.photo || '');
    form.reset({
      name: member.name,
      nameEn: member.nameEn || '',
      nameZh: member.nameZh || '',
      position: member.position,
      positionEn: member.positionEn || '',
      positionZh: member.positionZh || '',
      category: member.category,
      photo: member.photo || '',
      description: member.description || '',
      descriptionEn: member.descriptionEn || '',
      descriptionZh: member.descriptionZh || '',
      sortOrder: member.sortOrder,
      isActive: member.isActive,
    });
  }, [member, form]);

  const handleOpenChange = (open: boolean) => {
    setInternalOpen(open);
    if (!open) {
      onClose();
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof organizationMemberSchema>) => {
      const response = await fetch(`/api/organization-members/${member.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...data,
          category,
          photo,
          isActive,
        })
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "구성원 정보가 수정되었습니다" });
      handleOpenChange(false);
      onSuccess();
    },
    onError: () => {
      toast({ title: "수정 실패", variant: "destructive" });
    }
  });

  const setPhotoPublicAcl = async (objectPath: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch('/api/images', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageURL: objectPath }),
      });
    } catch (e) {
      console.error('Failed to set photo ACL:', e);
    }
  };

  const handleGetUploadParameters = async (file: { type?: string }) => {
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
      headers: {
        'Content-Type': file?.type || 'application/octet-stream',
      },
    };
  };

  const handlePhotoUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const objectPath = (window as any).__lastUploadObjectPath || '';
      if (objectPath) {
        await setPhotoPublicAcl(objectPath);
        setPhoto(objectPath);
      }
    }
  };

  return (
    <Dialog open={internalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>조직 구성원 수정</DialogTitle>
          <DialogDescription>조직 구성원 정보를 수정하세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">이름 (한국어) *</label>
              <Input {...form.register('name')} data-testid="input-org-edit-name" />
            </div>
            <div>
              <label className="text-sm font-medium">이름 (영어)</label>
              <Input {...form.register('nameEn')} data-testid="input-org-edit-name-en" />
            </div>
            <div>
              <label className="text-sm font-medium">이름 (중국어)</label>
              <Input {...form.register('nameZh')} data-testid="input-org-edit-name-zh" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">직책 (한국어) *</label>
              <Input {...form.register('position')} data-testid="input-org-edit-position" />
            </div>
            <div>
              <label className="text-sm font-medium">직책 (영어)</label>
              <Input {...form.register('positionEn')} data-testid="input-org-edit-position-en" />
            </div>
            <div>
              <label className="text-sm font-medium">직책 (중국어)</label>
              <Input {...form.register('positionZh')} data-testid="input-org-edit-position-zh" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">카테고리 *</label>
              <Select value={category} onValueChange={(value) => {
                setCategory(value);
                form.setValue('category', value);
              }}>
                <SelectTrigger data-testid="select-org-edit-category">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">정렬 순서</label>
              <Input type="number" {...form.register('sortOrder', { valueAsNumber: true })} data-testid="input-org-edit-sort-order" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">사진</label>
            <div className="flex gap-2 items-center">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handlePhotoUpload}
                buttonClassName="whitespace-nowrap"
              >
                <Upload className="h-4 w-4 mr-2" />
                사진 변경
              </ObjectUploader>
              {photo && (
                <img src={photo} alt="미리보기" className="w-12 h-12 rounded-full object-cover" />
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">설명 (한국어)</label>
            <Textarea {...form.register('description')} data-testid="textarea-org-edit-description" />
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} data-testid="switch-org-edit-active" />
            <span className="text-sm">{isActive ? '활성' : '비활성'}</span>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updateMutation.isPending || !category} data-testid="button-submit-org-edit">
              {updateMutation.isPending ? '수정 중...' : '수정'}
            </Button>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
