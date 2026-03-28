import { TabsContent } from '@/components/ui/tabs';
import { Users, Newspaper, Calendar, MessageSquare } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminData';

export function DashboardTab({ activeTab }: { activeTab: string }) {
  const { data: dashboardStats } = useAdminDashboard(activeTab);

  return (
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
  );
}
