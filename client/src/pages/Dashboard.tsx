import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Building, Calendar, FileText, Settings, Edit, MapPin, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { UserRegistrationWithEvent, Member, PostWithTranslations } from '@shared/schema';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Helper to safely get translation
function getTranslationSafe(post: PostWithTranslations, locale: string) {
  return post.translations.find(t => t.locale === locale) || post.translations[0];
}

// Helper to extract event meta safely
function getEventMeta(post: PostWithTranslations) {
  const getValue = (key: string) => 
    post.meta.find(m => m.metaKey === key)?.valueText || null;
  
  const getMetaTimestamp = (key: string): Date | null => {
    const meta = post.meta.find(m => m.metaKey === key);
    return meta?.valueTimestamp || null;
  };

  return {
    eventDate: getMetaTimestamp('eventDate'),
    endDate: getMetaTimestamp('endDate'),
    location: getValue('location'),
    capacity: post.meta.find(m => m.metaKey === 'capacity')?.valueNumber || null,
    fee: getValue('fee'),
    registrationDeadline: getMetaTimestamp('registrationDeadline'),
    contactEmail: getValue('contactEmail'),
    contactPhone: getValue('contactPhone'),
  };
}

const profileUpdateSchema = z.object({
  name: z.string().optional().refine(val => !val || val.length >= 1, '이름을 입력해주세요'),
  email: z.string().optional().refine(
    val => !val || z.string().email().safeParse(val).success,
    '유효한 이메일을 입력해주세요'
  ),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional().refine(
    val => !val || val.length >= 6,
    '비밀번호는 최소 6자 이상이어야 합니다'
  ),
}).refine(
  (data) => {
    if (data.newPassword && data.newPassword.length > 0 && !data.currentPassword) {
      return false;
    }
    return true;
  },
  { message: '비밀번호 변경 시 현재 비밀번호를 입력해주세요', path: ['currentPassword'] }
);

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const { data: registrations } = useQuery({
    queryKey: ['/api/auth/registrations'],
    queryFn: async () => {
      const response = await fetch('/api/auth/registrations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: memberInfo } = useQuery({
    queryKey: ['/api/members/me'],
    queryFn: async () => {
      const response = await fetch('/api/members', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      return data.members.find((m: Member) => m.userId === user?.id) || null;
    },
    enabled: isAuthenticated && !!user,
  });

  const profileForm = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
    },
  });

  // Reset form when user data changes or dialog opens
  useEffect(() => {
    if (isProfileDialogOpen && user) {
      profileForm.reset({
        name: user.name || '',
        email: user.email || '',
        currentPassword: '',
        newPassword: '',
      });
    }
  }, [isProfileDialogOpen, user, profileForm]);

  const profileUpdateMutation = useMutation({
    mutationFn: async (data: ProfileUpdateFormData) => {
      // Filter out empty fields
      const updates: any = {};
      if (data.name && data.name.trim() !== '' && data.name !== user?.name) updates.name = data.name;
      if (data.email && data.email.trim() !== '' && data.email !== user?.email) updates.email = data.email;
      
      // Only include password fields if they are not empty
      if (data.currentPassword && data.currentPassword.trim() !== '') {
        updates.currentPassword = data.currentPassword;
      }
      if (data.newPassword && data.newPassword.trim() !== '') {
        updates.newPassword = data.newPassword;
      }

      return apiRequest('PATCH', '/api/auth/profile', updates);
    },
    onSuccess: async () => {
      toast({
        title: '프로필 업데이트 완료',
        description: '프로필이 성공적으로 업데이트되었습니다.',
      });
      // Wait for user data to refresh before resetting form
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setIsProfileDialogOpen(false);
      // Password fields will be cleared when dialog reopens via defaultValues
    },
    onError: (error: any) => {
      toast({
        title: '프로필 업데이트 실패',
        description: error.message || '프로필 업데이트에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  const cancelRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      return apiRequest('PATCH', `/api/auth/registrations/${registrationId}`);
    },
    onSuccess: () => {
      toast({
        title: '행사 등록 취소 완료',
        description: '행사 등록이 성공적으로 취소되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/registrations'] });
    },
    onError: (error: any) => {
      toast({
        title: '행사 등록 취소 실패',
        description: error.message || '행사 등록 취소에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
            <p className="text-muted-foreground mb-4">대시보드에 접근하려면 로그인해주세요.</p>
            <Button>로그인</Button>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-foreground">{t('dashboard.title')}</h1>
              <p className="text-lg text-muted-foreground">안녕하세요, {user?.name}님!</p>
            </div>
            <Button 
              variant="outline" 
              data-testid="button-edit-profile"
              onClick={() => setIsProfileDialogOpen(true)}
            >
              <Edit className="h-4 w-4" />
              프로필 수정
            </Button>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="py-16">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('dashboard.profile')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">이름</label>
                    <p className="text-foreground">{user?.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">이메일</label>
                    <p className="text-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">계정 유형</label>
                    <p className="text-foreground">
                      <Badge variant="secondary">
                        {user?.role === 'admin' ? '관리자' : '회원'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">가입일</label>
                    <p className="text-foreground">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Membership Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {t('dashboard.membership')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {memberInfo ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">회사명</label>
                      <p className="text-foreground">{memberInfo.companyName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">업종</label>
                      <p className="text-foreground">{memberInfo.industry}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">회원등급</label>
                      <p className="text-foreground">
                        <Badge variant="secondary" className={
                          memberInfo.membershipLevel === 'premium' ? 'badge-primary' :
                          memberInfo.membershipLevel === 'sponsor' ? 'badge-accent' :
                          'badge-secondary'
                        }>
                          {memberInfo.membershipLevel === 'premium' ? '프리미엄' :
                           memberInfo.membershipLevel === 'sponsor' ? '후원회원' : '정회원'}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">상태</label>
                      <p className="text-foreground">
                        <Badge variant={memberInfo.membershipStatus === 'active' ? 'default' : 'secondary'}>
                          {memberInfo.membershipStatus === 'active' ? '활성' :
                           memberInfo.membershipStatus === 'pending' ? '승인대기' : '비활성'}
                        </Badge>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">회원사 정보가 없습니다.</p>
                    <Link href="/members">
                      <Button variant="outline" data-testid="button-register-company">
                        회사 등록하기
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  빠른 메뉴
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/events">
                    <Button variant="outline" className="w-full justify-start" data-testid="button-view-events">
                      <Calendar className="h-4 w-4" />
                      행사 둘러보기
                    </Button>
                  </Link>
                  <Link href="/resources">
                    <Button variant="outline" className="w-full justify-start" data-testid="button-view-resources">
                      <FileText className="h-4 w-4" />
                      자료센터 이용
                    </Button>
                  </Link>
                  <Link href="/members">
                    <Button variant="outline" className="w-full justify-start" data-testid="button-view-members">
                      <Building className="h-4 w-4" />
                      회원사 디렉토리
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" className="w-full justify-start" data-testid="button-contact">
                      <User className="h-4 w-4" />
                      문의하기
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Event Registrations */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t('dashboard.events')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {registrations && registrations.length > 0 ? (
                    <div className="space-y-4">
                      {registrations.map((registration: UserRegistrationWithEvent) => (
                        <div
                          key={registration.id}
                          className="flex items-start justify-between rounded-lg border p-4"
                          data-testid={`registration-${registration.id}`}
                        >
                          <Link 
                            href={registration.event ? `/events/${registration.eventId}` : '#'}
                            className="flex-1 hover:opacity-70 transition-opacity"
                          >
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground mb-1" data-testid={`event-title-${registration.id}`}>
                                {registration.event 
                                  ? (getTranslationSafe(registration.event, language)?.title || registration.event.slug)
                                  : '행사 정보 없음'}
                              </h4>
                              {registration.event && (() => {
                                const eventMeta = getEventMeta(registration.event);
                                return (
                                  <div className="space-y-1">
                                    {eventMeta.eventDate && (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        <span data-testid={`event-date-${registration.id}`}>
                                          {new Date(eventMeta.eventDate).toLocaleDateString('ko-KR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                    )}
                                    {eventMeta.location && (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        <span data-testid={`event-location-${registration.id}`}>
                                          {eventMeta.location}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </Link>
                          <div className="text-right ml-4 flex flex-col gap-2">
                            <Badge
                              variant={
                                registration.status === 'approved' ? 'default' :
                                registration.status === 'registered' ? 'secondary' :
                                'destructive'
                              }
                              data-testid={`registration-status-${registration.id}`}
                            >
                              {registration.status === 'approved' ? '승인됨' :
                               registration.status === 'registered' ? '등록됨' :
                               registration.status === 'cancelled' ? '취소됨' :
                               registration.status === 'attended' ? '참석함' : registration.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              등록일: {new Date(registration.createdAt).toLocaleDateString()}
                            </p>
                            {registration.status !== 'cancelled' && registration.status !== 'attended' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('정말 이 행사 등록을 취소하시겠습니까?')) {
                                    cancelRegistrationMutation.mutate(registration.id);
                                  }
                                }}
                                disabled={cancelRegistrationMutation.isPending}
                                data-testid={`button-cancel-${registration.id}`}
                                className="text-destructive hover:text-destructive/90"
                              >
                                <X className="h-4 w-4 mr-1" />
                                취소
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">등록한 행사가 없습니다.</p>
                      <Link href="/events">
                        <Button variant="outline" data-testid="button-browse-events">
                          행사 둘러보기
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Resources Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('dashboard.resources')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
                    <h4 className="font-medium text-primary mb-2">회원 전용 자료</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      회원만 접근 가능한 리포트와 분석 자료를 이용하실 수 있습니다.
                    </p>
                    <Link href="/resources">
                      <Button size="sm" variant="outline" data-testid="button-member-resources">
                        자료 보기
                      </Button>
                    </Link>
                  </div>
                  
                  {user?.role === 'admin' && (
                    <div className="rounded-lg bg-secondary/5 p-4 border border-secondary/20">
                      <h4 className="font-medium text-secondary mb-2">프리미엄 자료</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        관리자 전용 고급 분석 및 정책 브리핑을 이용하실 수 있습니다.
                      </p>
                      <Link href="/resources">
                        <Button size="sm" variant="outline" data-testid="button-premium-resources">
                          프리미엄 자료
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Profile Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>프로필 수정</DialogTitle>
            <DialogDescription>
              회원 정보를 수정할 수 있습니다. 변경하고 싶은 항목만 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit((data) => profileUpdateMutation.mutate(data))} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={user?.name || '이름'} 
                        {...field} 
                        data-testid="input-profile-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder={user?.email || '이메일'} 
                        {...field} 
                        data-testid="input-profile-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">비밀번호 변경 (선택사항)</p>
                <div className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>현재 비밀번호</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="현재 비밀번호" 
                            {...field} 
                            data-testid="input-current-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>새 비밀번호</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="새 비밀번호 (최소 6자)" 
                            {...field} 
                            data-testid="input-new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsProfileDialogOpen(false)}
                  data-testid="button-cancel-profile"
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  disabled={profileUpdateMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {profileUpdateMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
