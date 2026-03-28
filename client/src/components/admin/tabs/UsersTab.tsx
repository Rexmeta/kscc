import { useQueryClient } from '@tanstack/react-query';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit } from 'lucide-react';
import UserEditDialog from '@/components/UserEditDialog';
import { useState } from 'react';
import type { User } from '@shared/schema';
import { useAdminUsers } from '@/hooks/useAdminData';

export function UsersTab({ activeTab }: { activeTab: string }) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: usersData } = useAdminUsers(activeTab);

  return (
    <TabsContent value="users" className="space-y-6">
      <h2 className="text-2xl font-bold">사용자 관리</h2>
      <div className="space-y-2">
        {usersData?.map((user: User) => (
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
                  setSelectedUser(user);
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

      {selectedUser && (
        <UserEditDialog
          user={selectedUser}
          isOpen={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/users'] });
          }}
        />
      )}
    </TabsContent>
  );
}
