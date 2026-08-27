import type { Post } from "@shared/schema";

export interface PostAccessContext {
  userId?: string;
  isAdmin: boolean;
  canReadMembers: boolean;
  canReadPremium: boolean;
}

export const publicPostAccess: PostAccessContext = {
  isAdmin: false,
  canReadMembers: false,
  canReadPremium: false,
};

export function canReadPost(post: Post, access: PostAccessContext): boolean {
  if (access.isAdmin) return true;
  if (post.status !== "published") return false;

  const now = Date.now();
  if (post.publishedAt && post.publishedAt.getTime() > now) return false;
  if (post.expiresAt && post.expiresAt.getTime() <= now) return false;

  switch (post.visibility) {
    case "public":
      return true;
    case "members":
      return access.canReadMembers;
    case "premium":
      return access.canReadPremium;
    default:
      return false;
  }
}