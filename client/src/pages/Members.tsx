import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, RefreshCw, Users, Plus } from 'lucide-react';
import { t } from '@/lib/i18n';
import { Member } from '@shared/schema';
import MemberCard from '@/components/MemberCard';
import { useAuth } from '@/hooks/useAuth';

export default function MembersPage() {
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [membershipLevel, setMembershipLevel] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/members', { page, search, country, industry, membershipLevel, limit: 12 }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(search && { search }),
        ...(country && { country }),
        ...(industry && { industry }),
        ...(membershipLevel && { membershipLevel }),
      });
      const response = await fetch(`/api/members?${params}`);
      return response.json();
    },
  });

  const members = data?.members || [];
  const totalPages = data?.totalPages || 1;

  const handleFilter = () => {
    setPage(1);
    refetch();
  };

  const handleReset = () => {
    setSearch('');
    setCountry('');
    setIndustry('');
    setMembershipLevel('');
    setPage(1);
    refetch();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="bg-muted py-16">
        <div className="container">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-foreground">{t('members.title')}</h1>
            <p className="text-lg text-muted-foreground">Member Directory / 会员名录</p>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-8 border-b">
        <div className="container">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">회원 목록</h2>
            {hasPermission('member.manage') && (
              <Button asChild data-testid="button-manage-members">
                <Link href="/admin?tab=members">
                  <Plus className="h-4 w-4 mr-2" />
                  회원 관리
                </Link>
              </Button>
            )}
          </div>
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="form-label">{t('members.search.company')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="회사명 또는 키워드 입력..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-company"
                  />
                </div>
              </div>
              
              <div>
                <label className="form-label">{t('members.search.country')}</label>
                <Select value={country || "all"} onValueChange={(value) => setCountry(value === "all" ? "" : value)}>
                  <SelectTrigger data-testid="select-country">
                    <SelectValue placeholder="국가 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="Korea">한국</SelectItem>
                    <SelectItem value="China">중국</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="form-label">{t('members.search.industry')}</label>
                <Select value={industry || "all"} onValueChange={(value) => setIndustry(value === "all" ? "" : value)}>
                  <SelectTrigger data-testid="select-industry">
                    <SelectValue placeholder="업종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="제조업">제조업</SelectItem>
                    <SelectItem value="무역">무역</SelectItem>
                    <SelectItem value="IT/소프트웨어">IT/소프트웨어</SelectItem>
                    <SelectItem value="물류">물류</SelectItem>
                    <SelectItem value="금융">금융</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-4 mt-4">
              <div>
                <label className="form-label">{t('members.search.level')}</label>
                <Select value={membershipLevel || "all"} onValueChange={(value) => setMembershipLevel(value === "all" ? "" : value)}>
                  <SelectTrigger data-testid="select-level">
                    <SelectValue placeholder="회원등급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="regular">{t('members.levels.regular')}</SelectItem>
                    <SelectItem value="premium">{t('members.levels.premium')}</SelectItem>
                    <SelectItem value="sponsor">{t('members.levels.sponsor')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 md:col-span-3 items-end">
                <Button onClick={handleFilter} data-testid="button-apply-filter">
                  <Filter className="h-4 w-4" />
                  필터 적용
                </Button>
                <Button variant="outline" onClick={handleReset} data-testid="button-reset-filter">
                  <RefreshCw className="h-4 w-4" />
                  초기화
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Members Grid */}
      <section className="py-16">
        <div className="container">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : members.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member: Member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    {t('common.previous')}
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        onClick={() => setPage(pageNum)}
                        data-testid={`button-page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    data-testid="button-next-page"
                  >
                    {t('common.next')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">조건에 맞는 회원사가 없습니다.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
