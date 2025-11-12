import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Building, Calendar, FileText, Settings, Edit, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { t } from '@/lib/i18n';
import { UserRegistrationWithEvent, Member } from '@shared/schema';
import { Link } from 'wouter';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();

  const { data: registrations } = useQuery({
    queryKey: ['/api/user/registrations'],
    queryFn: async () => {
      const response = await fetch('/api/user/registrations', {
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
      return data.members.find((m: Member) => m.userId === user?.id);
    },
    enabled: isAuthenticated && !!user,
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
            <Button variant="outline" data-testid="button-edit-profile">
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
                        <Link 
                          key={registration.id}
                          href={registration.event ? `/events/${registration.eventId}` : '#'}
                        >
                          <div
                            className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                            data-testid={`registration-${registration.id}`}
                          >
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground mb-1" data-testid={`event-title-${registration.id}`}>
                                {registration.event?.title || '행사 정보 없음'}
                              </h4>
                              {registration.event && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span data-testid={`event-date-${registration.id}`}>
                                      {new Date(registration.event.eventDate).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  {registration.event.location && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <MapPin className="h-3 w-3" />
                                      <span data-testid={`event-location-${registration.id}`}>
                                        {registration.event.location}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right ml-4">
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
                              <p className="text-xs text-muted-foreground mt-1">
                                등록일: {new Date(registration.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </Link>
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
    </div>
  );
}
