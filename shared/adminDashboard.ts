/**
 * The administrator dashboard is intentionally a small snapshot, not a
 * replacement for any of the paginated management endpoints.
 */
export interface AdminDashboardSnapshot {
  stats: {
    /** Kept for compatibility with the original dashboard response. */
    totalMembers: number;
    totalEvents: number;
    totalNews: number;
    totalInquiries: number;
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    activeMembers: number;
    pendingMembers: number;
    inactiveMembers: number;
    unpublishedNews: number;
    unpublishedEvents: number;
    totalContent: number;
    unpublishedContent: number;
    upcomingEvents: number;
    unresolvedInquiries: number;
  };
  recentInquiries: Array<{
    id: string;
    subject: string;
    category: string;
    status: string;
    createdAt: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    status: string;
    eventDate: string;
    location: string | null;
  }>;
}