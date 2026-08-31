import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Power, RotateCcw, Trash2 } from 'lucide-react';
import UserEditDialog from '@/components/UserEditDialog';
import { useEffect, useState } from 'react';
import type { User } from '@shared/schema';
import { useAdminUsers } from '@/hooks/useAdminData';
import { useToast } from '@/hooks/use-toast';
import { ApiRequestError, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { AdminListPagination } from '../AdminListPagination';
import { QueryState } from '@/components/QueryState';

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof ApiRequestError
    && error.responseBody
    && typeof error.responseBody === 'object'
    && 'message' in error.responseBody
    && typeof error.responseBody.message === 'string'
  ) {
    return error.responseBody.message;
  }
  return fallback;
}

export function UsersTab({ activeTab }: { activeTab: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const usersQuery = useAdminUsers(activeTab, page);
  const { data: usersData } = usersQuery;

  useEffect(() => {
    if (usersData && usersData.totalPages > 0 && page > usersData.totalPages) {
      setPage(usersData.totalPages);
    }
  }, [usersData, page]);

  const refreshUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/users'] });
  };

  const handleActiveToggle = async (managedUser: User) => {
    setPendingUserId(managedUser.id);
    try {
      await apiRequest('PUT', `/api/users/${managedUser.id}`, {
        isActive: !managedUser.isActive,
      });
      toast({
        title: managedUser.isActive ? '계정을 비활성화했습니다' : '계정을 활성화했습니다',
      });
      refreshUsers();
    } catch (error) {
      toast({
        title: '계정 상태 변경 실패',
        description: getApiErrorMessage(error, '계정 상태를 변경하지 못했습니다.'),
        variant: 'destructive',
      });
    } finally {
      setPendingUserId(null);
    }
  };

  const handleDelete = async (managedUser: User) => {
    const confirmed = window.confirm(
      '사용자 계정을 영구 삭제합니다. 연결된 회원 프로필과 행사 신청 정보도 삭제되며 복구할 수 없습니다. 계속하시겠습니까?',
    );
    if (!confirmed) return;

    setPendingUserId(managedUser.id);
    try {
      await apiRequest('DELETE', `/api/users/${managedUser.id}`);
      toast({ title: '사용자 계정을 삭제했습니다' });
      refreshUsers();
    } catch (error) {
      toast({
        title: '사용자 삭제 실패',
        description: getApiErrorMessage(error, '삭제 대신 계정을 비활성화해 주세요.'),
        variant: 'destructive',
      });
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <TabsContent value="users" className="space-y-6">
      <h2 className="text-2xl font-bold">사용자 관리</h2>
      <QueryState
        isLoading={usersQuery.isLoading}
        isError={usersQuery.isError}
        onRetry={() => usersQuery.refetch()}
        empty={!usersData?.users.length}
        emptyMessage="사용자가 없습니다."
      >
        <div className="space-y-2">
          {usersData?.users.map((user: User) => (
          <div key={user.id} className={`flex flex-wrap justify-between items-center gap-3 p-4 border rounded ${
            user.isActive ? '' : 'bg-muted/50 opacity-75'
          }`}>
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
              <Badge
                variant={user.isActive ? 'default' : 'secondary'}
                data-testid={`badge-user-active-${user.id}`}
              >
                {user.isActive ? '활성' : '비활성'}
              </Badge>
                <Button
                size="sm"
                variant="outline"
                  aria-label={`${user.name} 수정`}
                onClick={() => {
                  setSelectedUser(user);
                  setEditDialogOpen(true);
                }}
                data-testid={`button-edit-user-${user.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleActiveToggle(user)}
                disabled={pendingUserId === user.id || (currentUser?.id === user.id && user.isActive)}
                aria-label={user.isActive ? `${user.name} 비활성화` : `${user.name} 활성화`}
                title={user.isActive ? '비활성화' : '활성화'}
                data-testid={`button-toggle-user-active-${user.id}`}
              >
                {user.isActive ? <Power className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(user)}
                disabled={pendingUserId === user.id || currentUser?.id === user.id}
                aria-label={`${user.name} 영구 삭제`}
                title="영구 삭제"
                data-testid={`button-delete-user-${user.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          ))}
        </div>
      </QueryState>
      <AdminListPagination
        page={usersData?.page || page}
        totalPages={usersData?.totalPages || 0}
        onPageChange={setPage}
        testId="pagination-users"
      />

      {selectedUser && (
        <UserEditDialog
          user={selectedUser}
          isOpen={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            refreshUsers();
          }}
        />
      )}
    </TabsContent>
  );
}
