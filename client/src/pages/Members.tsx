import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, Users, Plus } from 'lucide-react';
import { t } from '@/lib/i18n';
import { Member } from '@shared/schema';
import MemberCard from '@/components/MemberCard';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import { fetchJson } from '@/lib/queryClient';
import { QueryState } from '@/components/QueryState';
import { PagePagination } from '@/components/PagePagination';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function MembersPage() {
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [membershipLevel, setMembershipLevel] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.members.list({ page, search: debouncedSearch, country, industry, membershipLevel, limit: 12 }),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(country && { country }),
        ...(industry && { industry }),
        ...(membershipLevel && { membershipLevel }),
      });
       return fetchJson<{ members: Member[]; totalPages: number }>(`/api/members?${params}`, { signal });
    },
  });

  const members = data?.members || [];
  const totalPages = data?.totalPages || 1;

  const handleReset = () => {
    setSearch('');
    setCountry('');
    setIndustry('');
    setMembershipLevel('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Header */}
       <section className="page-banner bg-muted dark:bg-muted">
        <div className="container">
          <div className="text-center">
             <h1 className="mb-2 text-2xl font-bold text-foreground dark:text-foreground sm:mb-4 sm:text-4xl">{t('members.title')}</h1>
             <p className="text-sm text-muted-foreground dark:text-muted-foreground sm:text-lg">Member Directory / 会员名录</p>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
       <section className="page-filter border-b border-border dark:border-border">
        <div className="container">
           <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
             <h2 className="text-xl font-semibold text-foreground dark:text-foreground sm:text-2xl">회원 목록</h2>
            {hasPermission('member.manage') && (
               <Button className="h-9 px-3 text-sm" asChild data-testid="button-manage-members">
                <Link href="/admin?tab=members">
                  <Plus className="h-4 w-4 mr-2" />
                  회원 관리
                </Link>
              </Button>
            )}
          </div>
           <Card className="page-filter-card dark:border-border dark:bg-card">
             <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
               <div className="col-span-2 min-w-0 md:col-span-2">
                 <label className="form-label page-filter-label text-foreground dark:text-foreground">{t('members.search.company')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="회사명 또는 키워드 입력..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                     className="page-filter-control pl-10"
                    data-testid="input-search-company"
                  />
                </div>
              </div>
              
               <div className="min-w-0">
                 <label className="form-label page-filter-label text-foreground dark:text-foreground">{t('members.search.country')}</label>
                <Select value={country || "all"} onValueChange={(value) => { setCountry(value === "all" ? "" : value); setPage(1); }}>
                   <SelectTrigger className="page-filter-control w-full px-2 text-xs sm:px-3 sm:text-sm" data-testid="select-country">
                    <SelectValue placeholder="국가 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="Korea">한국</SelectItem>
                    <SelectItem value="China">중국</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
               <div className="min-w-0">
                 <label className="form-label page-filter-label text-foreground dark:text-foreground">{t('members.search.industry')}</label>
                <Select value={industry || "all"} onValueChange={(value) => { setIndustry(value === "all" ? "" : value); setPage(1); }}>
                   <SelectTrigger className="page-filter-control w-full px-2 text-xs sm:px-3 sm:text-sm" data-testid="select-industry">
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
            
             <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-4 md:grid-cols-4">
               <div className="min-w-0">
                 <label className="form-label page-filter-label text-foreground dark:text-foreground">{t('members.search.level')}</label>
                <Select value={membershipLevel || "all"} onValueChange={(value) => { setMembershipLevel(value === "all" ? "" : value); setPage(1); }}>
                   <SelectTrigger className="page-filter-control w-full px-2 text-xs sm:px-3 sm:text-sm" data-testid="select-level">
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
              
               <div className="flex items-end gap-2 md:col-span-3">
                 <Button className="page-filter-control w-full px-3" variant="outline" onClick={handleReset} data-testid="button-reset-filter">
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
          <QueryState
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            empty={members.length === 0}
            emptyMessage={t('common.empty')}
          >
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {members.map((member: Member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
              
              {/* Pagination */}
              <PagePagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          </QueryState>
        </div>
      </section>
    </div>
  );
}
