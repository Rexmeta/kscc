import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import type { OrganizationMember } from '@shared/schema';
import { CreateOrganizationMemberDialog } from '../forms/CreateOrganizationMemberDialog';
import { EditOrganizationMemberDialog } from '../forms/EditOrganizationMemberDialog';
import { ORGANIZATION_CATEGORIES } from '../adminSchemas';
import { useAdminOrganizationMembers } from '@/hooks/useAdminData';

export function OrganizationTab({ activeTab, executivesOnly = false }: { activeTab: string; executivesOnly?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAdmin, hasPermission } = useAuth();
  const [orgCategoryFilter, setOrgCategoryFilter] = useState<string>(executivesOnly ? 'executives' : 'all');
  const [selectedOrgMember, setSelectedOrgMember] = useState<OrganizationMember | null>(null);
  const canManageExecutives = user?.role === 'operator';
  const canCreate = isAdmin || (canManageExecutives && hasPermission('organization.executives.create'));
  const canUpdate = isAdmin || (canManageExecutives && hasPermission('organization.executives.update'));

  const { data: orgMembersData } = useAdminOrganizationMembers(orgCategoryFilter, activeTab, executivesOnly);
  const invalidateOrganizationMembers = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === '/api/organization-members',
    });
  };

  return (
    <TabsContent value={executivesOnly ? 'executives' : 'organization'} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{executivesOnly ? '임원진 관리' : '조직 구조 관리'}</h2>
        {canCreate && (
          <CreateOrganizationMemberDialog
            executivesOnly={executivesOnly}
            onSuccess={invalidateOrganizationMembers}
          />
        )}
      </div>

      {!executivesOnly && (
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
      )}

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
              {canUpdate && (
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
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if (confirm('정말 이 구성원을 삭제하시겠습니까?')) {
                      try {
                        const response = await apiRequest('DELETE', `/api/organization-members/${member.id}`, null);
                        if (response.ok) {
                          toast({ title: "구성원이 삭제되었습니다" });
                          invalidateOrganizationMembers();
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
              )}
            </div>
          </div>
        ))}
        {(!orgMembersData || orgMembersData.length === 0) && (
          <div className="p-8 text-center text-muted-foreground">
            등록된 조직 구성원이 없습니다
          </div>
        )}
      </div>

      {selectedOrgMember && (
        <EditOrganizationMemberDialog
          member={selectedOrgMember}
          onSuccess={() => {
            invalidateOrganizationMembers();
          }}
          onClose={() => setSelectedOrgMember(null)}
        />
      )}
    </TabsContent>
  );
}
