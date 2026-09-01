import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Member } from '@shared/schema';
import { EditMemberForm } from '../forms/EditMemberForm';
import { useAdminMembers } from '@/hooks/useAdminData';
import { useAuth } from '@/hooks/useAuth';
import { CreateMemberDialog } from '../forms/CreateMemberDialog';
import { QueryState } from '@/components/QueryState';
import { AdminFilterBar } from '../AdminFilterBar';
import { AdminListPagination } from '../AdminListPagination';

export function MembersTab({ activeTab }: { activeTab: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, hasPermission } = useAuth();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filterInput, setFilterInput] = useState({ country: '', industry: '', membershipLevel: '', membershipStatus: '' });
  const [filters, setFilters] = useState({ search: '', ...filterInput });

  const membersQuery = useAdminMembers(activeTab, page, filters);
  const { data: membersData } = membersQuery;
  const canCreate = isAdmin || hasPermission('member.create');
  const canUpdate = isAdmin || hasPermission('member.update');
  const canDelete = isAdmin || hasPermission('member.delete');
  useEffect(() => {
    if (membersData && membersData.totalPages > 0 && page > membersData.totalPages) setPage(membersData.totalPages);
  }, [membersData, page]);
  const applyFilters = () => {
    setPage(1);
    setFilters({ ...filterInput, search: searchInput.trim() });
  };
  const resetFilters = () => {
    setSearchInput('');
    const empty = { country: '', industry: '', membershipLevel: '', membershipStatus: '' };
    setFilterInput(empty);
    setFilters({ search: '', ...empty });
    setPage(1);
  };
  const invalidate = () => {
    queryClient.invalidateQueries({ predicate: (query) =>
      query.queryKey[0] === '/api/members' || query.queryKey[0] === '/api/admin/members' });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/dashboard'] });
  };

  return (
    <TabsContent value="members" className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">회원사 관리</h2>
        {canCreate && <CreateMemberDialog onSuccess={invalidate} />}
      </div>
      <AdminFilterBar
        scope="members"
        search={searchInput}
        onSearchChange={setSearchInput}
        onApply={applyFilters}
        onReset={resetFilters}
        searchLabel="회원사 검색"
        searchPlaceholder="회사명 또는 설명 검색"
        total={membersData?.total}
        filters={[
          { name: 'country', label: '국가', value: filterInput.country || 'all', onChange: (v) => setFilterInput((f) => ({ ...f, country: v === 'all' ? '' : v })), testId: 'select-member-country-filter', options: [{ value: 'all', label: '전체 국가' }, { value: 'Korea', label: '한국' }, { value: 'China', label: '중국' }] },
          { name: 'industry', label: '업종', value: filterInput.industry || 'all', onChange: (v) => setFilterInput((f) => ({ ...f, industry: v === 'all' ? '' : v })), testId: 'select-member-industry-filter', options: [{ value: 'all', label: '전체 업종' }, { value: '제조업', label: '제조업' }, { value: '무역', label: '무역' }, { value: 'IT/소프트웨어', label: 'IT/소프트웨어' }, { value: '물류', label: '물류' }, { value: '금융', label: '금융' }, { value: '기타', label: '기타' }] },
          { name: 'membershipLevel', label: '회원 등급', value: filterInput.membershipLevel || 'all', onChange: (v) => setFilterInput((f) => ({ ...f, membershipLevel: v === 'all' ? '' : v })), testId: 'select-member-level-filter', options: [{ value: 'all', label: '전체 등급' }, { value: 'regular', label: '정회원' }, { value: 'premium', label: '프리미엄' }, { value: 'sponsor', label: '후원회원' }] },
          { name: 'membershipStatus', label: '회원 상태', value: filterInput.membershipStatus || 'all', onChange: (v) => setFilterInput((f) => ({ ...f, membershipStatus: v === 'all' ? '' : v })), testId: 'select-member-status-filter', options: [{ value: 'all', label: '전체 상태' }, { value: 'pending', label: '승인 대기' }, { value: 'active', label: '활성' }, { value: 'inactive', label: '비활성' }] },
        ]}
      />

      <QueryState
        isLoading={membersQuery.isLoading}
        isError={membersQuery.isError}
        onRetry={() => membersQuery.refetch()}
        empty={!membersData?.members?.length}
        emptyMessage="회원사가 없습니다."
      >
      <div className="space-y-2">
        {membersData?.members?.map((member: Member) => (
          <div key={member.id} className="flex justify-between items-center p-4 border rounded">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{member.companyName}</p>
                <Badge variant={member.membershipStatus === 'active' ? 'default' : member.membershipStatus === 'inactive' ? 'destructive' : 'secondary'}>
                  {member.membershipStatus === 'active' ? '활성' : member.membershipStatus === 'inactive' ? '비활성' : '승인 대기'}
                </Badge>
                {!member.isPublic && <Badge variant="outline">비공개</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{member.industry} • {member.country} {member.city}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedMember(member);
                  setViewDialogOpen(true);
                }}
                data-testid={`button-view-member-${member.id}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {canUpdate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedMember(member);
                    setEditDialogOpen(true);
                  }}
                  data-testid={`button-edit-member-${member.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (confirm('정말 이 회원을 삭제하시겠습니까?')) {
                      try {
                        const response = await apiRequest('DELETE', `/api/members/${member.id}`, null);
                        if (response.ok) {
                          toast({ title: "회원이 삭제되었습니다" });
                          invalidate();
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
              )}
            </div>
          </div>
        ))}
      </div>
      </QueryState>
      <AdminListPagination page={membersData?.page || page} totalPages={membersData?.totalPages || 0} onPageChange={setPage} testId="pagination-members" />

      {selectedMember && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMember.companyName} 상세 정보</DialogTitle>
              <DialogDescription>회원사 정보를 확인하고 관리할 수 있습니다</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedMember.logo && (
                <div className="flex justify-center">
                  <img src={selectedMember.logo} alt={selectedMember.companyName} className="h-20 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">회사명</p>
                  <p className="font-medium">{selectedMember.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">업종</p>
                  <p className="font-medium">{selectedMember.industry}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">국가</p>
                  <p className="font-medium">{selectedMember.country}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">도시</p>
                  <p className="font-medium">{selectedMember.city}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">주소</p>
                  <p className="font-medium">{selectedMember.address}</p>
                </div>
                {selectedMember.website && (
                  <div>
                    <p className="text-sm text-muted-foreground">웹사이트</p>
                    <p className="font-medium"><a href={selectedMember.website} target="_blank" className="text-blue-600 hover:underline">{selectedMember.website}</a></p>
                  </div>
                )}
                {selectedMember.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">전화</p>
                    <p className="font-medium">{selectedMember.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">담당자</p>
                  <p className="font-medium">{selectedMember.contactPerson}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">담당자 이메일</p>
                  <p className="font-medium">{selectedMember.contactEmail}</p>
                </div>
                {selectedMember.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">설명</p>
                    <p className="font-medium whitespace-pre-wrap">{selectedMember.description}</p>
                  </div>
                )}
              </div>
              {canUpdate && (
                <Button onClick={() => {
                  setViewDialogOpen(false);
                  setEditDialogOpen(true);
                }} className="w-full">
                  편집하기
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedMember && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMember.companyName} 편집</DialogTitle>
            </DialogHeader>
            <EditMemberForm
              member={selectedMember}
              onSuccess={() => {
                setEditDialogOpen(false);
                invalidate();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </TabsContent>
  );
}
