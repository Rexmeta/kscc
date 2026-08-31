import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, Edit, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import type { OrganizationMember } from '@shared/schema';
import { isExecutiveManagementCategory, sortOrganizationMembers } from '@shared/organization';
import { CreateOrganizationMemberDialog } from '../forms/CreateOrganizationMemberDialog';
import { EditOrganizationMemberDialog } from '../forms/EditOrganizationMemberDialog';
import { ORGANIZATION_CATEGORIES } from '../adminSchemas';
import { useAdminOrganizationMembers } from '@/hooks/useAdminData';
import {
  ORGANIZATION_CATEGORY_DISPLAY,
  getCategoryLabel,
  getMemberDescription,
  getMemberName,
  getMemberPosition,
} from '@/lib/organizationDisplay';

type MembersByCategory = Record<string, OrganizationMember[]>;

function groupMembers(
  members: OrganizationMember[],
  categoryFilter: string,
  executivesOnly: boolean,
): MembersByCategory {
  return members.reduce<MembersByCategory>((groups, member) => {
    if (executivesOnly && !isExecutiveManagementCategory(member.category)) return groups;
    if (categoryFilter !== 'all' && member.category !== categoryFilter) return groups;
    const categoryMembers = groups[member.category] || [];
    groups[member.category] = [...categoryMembers, member];
    return groups;
  }, {});
}

export function OrganizationTab({
  activeTab,
  executivesOnly = false,
}: {
  activeTab: string;
  executivesOnly?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAdmin, hasPermission } = useAuth();
  const { language } = useLanguage();
  const [orgCategoryFilter, setOrgCategoryFilter] = useState<string>(
    executivesOnly ? 'executives' : 'all',
  );
  const [selectedOrgMember, setSelectedOrgMember] = useState<OrganizationMember | null>(null);
  const [orderedMembers, setOrderedMembers] = useState<MembersByCategory>({});
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const canManageExecutives = user?.role === 'operator';
  const canCreate = isAdmin || (canManageExecutives && hasPermission('organization.executives.create'));
  const canUpdate = isAdmin || (canManageExecutives && hasPermission('organization.executives.update'));

  const { data: orgMembersData } = useAdminOrganizationMembers(
    orgCategoryFilter,
    activeTab,
    executivesOnly,
  );

  useEffect(() => {
    setOrderedMembers(
      groupMembers(
        sortOrganizationMembers(orgMembersData || []),
        orgCategoryFilter,
        executivesOnly,
      ),
    );
  }, [orgMembersData, orgCategoryFilter, executivesOnly]);

  const invalidateOrganizationMembers = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === '/api/organization-members',
    });
  };

  const displayCategories = useMemo(
    () => executivesOnly
      ? ORGANIZATION_CATEGORY_DISPLAY.filter((category) =>
        isExecutiveManagementCategory(category.value),
      )
      : ORGANIZATION_CATEGORY_DISPLAY.filter((category) =>
        orgCategoryFilter === 'all' || category.value === orgCategoryFilter,
      ),
    [executivesOnly, orgCategoryFilter],
  );

  const moveMember = async (category: string, index: number, direction: -1 | 1) => {
    if (!canUpdate || savingCategory) return;
    const current = orderedMembers[category] || [];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const next = [...current];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    const previous = current;
    setOrderedMembers((groups) => ({ ...groups, [category]: next }));
    setSavingCategory(category);

    try {
      await apiRequest('PUT', '/api/organization-members/reorder', {
        category,
        memberIds: next.map((member) => member.id),
      });
      toast({ title: '표시 순서가 저장되었습니다' });
      invalidateOrganizationMembers();
    } catch (error) {
      setOrderedMembers((groups) => ({ ...groups, [category]: previous }));
      toast({
        title: '순서 저장 실패',
        description: error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setSavingCategory(null);
    }
  };

  return (
    <TabsContent value={executivesOnly ? 'executives' : 'organization'} className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            {executivesOnly ? '임원진 관리' : '조직 구조 관리'}
          </h2>
          {executivesOnly && (
            <p className="text-sm text-muted-foreground mt-1">
              공개 조직 페이지와 같은 순서로 표시됩니다. 위·아래 버튼으로 순서를 바꿀 수 있습니다.
            </p>
          )}
        </div>
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
              {ORGANIZATION_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {displayCategories.map((category) => {
        const members = orderedMembers[category.value] || [];
        if (members.length === 0) return null;
        const Icon = category.icon;

        return (
          <section
            key={category.value}
            className={`p-6 rounded-xl border ${category.color}`}
            data-testid={`section-admin-org-${category.value}`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-bold">{getCategoryLabel(category, language)}</h3>
              <span className="text-sm text-muted-foreground">({members.length})</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member, index) => {
                const name = getMemberName(member, language);
                const position = getMemberPosition(member, language);
                const description = getMemberDescription(member, language);
                const isSaving = savingCategory === category.value;

                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border ${
                      member.isActive
                        ? 'border-gray-100 dark:border-gray-700'
                        : 'border-dashed border-muted-foreground/40 opacity-75'
                    }`}
                    data-testid={`card-admin-org-member-${member.id}`}
                  >
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={name}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        width={64}
                        height={64}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                        <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                        <p className="font-semibold truncate">{name}</p>
                      </div>
                      <p className="text-sm text-primary font-medium">{position}</p>
                      {description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={member.isActive ? 'default' : 'secondary'}>
                          {member.isActive ? '활성' : '비활성'}
                        </Badge>
                        {!member.isActive && (
                          <span className="text-xs text-muted-foreground">공개 페이지 숨김</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-1 shrink-0">
                      {canUpdate && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={index === 0 || isSaving}
                            onClick={() => moveMember(category.value, index, -1)}
                            aria-label={`${name} 위로 이동`}
                            title="위로 이동"
                            data-testid={`button-move-org-member-up-${member.id}`}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={index === members.length - 1 || isSaving}
                            onClick={() => moveMember(category.value, index, 1)}
                            aria-label={`${name} 아래로 이동`}
                            title="아래로 이동"
                            data-testid={`button-move-org-member-down-${member.id}`}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {canUpdate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrgMember(member)}
                          aria-label={`${name} 수정`}
                          data-testid={`button-edit-org-member-${member.id}`}
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">수정</span>
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            if (!confirm('정말 이 구성원을 삭제하시겠습니까?')) return;
                            try {
                              await apiRequest('DELETE', `/api/organization-members/${member.id}`, null);
                              toast({ title: '구성원이 삭제되었습니다' });
                              invalidateOrganizationMembers();
                            } catch {
                              toast({ title: '삭제 실패', variant: 'destructive' });
                            }
                          }}
                          aria-label={`${name} 삭제`}
                          title="삭제"
                          data-testid={`button-delete-org-member-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {(!orgMembersData || orgMembersData.length === 0) && (
        <div className="p-8 text-center text-muted-foreground">
          등록된 조직 구성원이 없습니다
        </div>
      )}

      {selectedOrgMember && (
        <EditOrganizationMemberDialog
          member={selectedOrgMember}
          executivesOnly={executivesOnly}
          onSuccess={invalidateOrganizationMembers}
          onClose={() => setSelectedOrgMember(null)}
        />
      )}
    </TabsContent>
  );
}