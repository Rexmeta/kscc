import type { Post } from "@shared/schema";

export interface PostAccessContext {
  userId?: string;
  isAdmin: boolean;
  /**
   * Management mode is an explicit request to include editable post states.
   * It never grants a post type by itself; managedPostTypes is populated from
   * the caller's current ACL permissions.
   */
  isEditor: boolean;
  managedPostTypes: ReadonlySet<string>;
  canReadMembers: boolean;
  canReadPremium: boolean;
}

export const publicPostAccess: PostAccessContext = {
  isAdmin: false,
  isEditor: false,
  managedPostTypes: new Set(),
  canReadMembers: false,
  canReadPremium: false,
};

export function canManagePostType(access: PostAccessContext, postType: string): boolean {
  return access.isEditor && access.managedPostTypes.has(postType);
}

export function canReadPost(post: Post, access: PostAccessContext): boolean {
  if (access.isAdmin) return true;
  const canManage = canManagePostType(access, post.postType);
  if (canManage) {
    if (post.status !== "draft" && post.status !== "published") return false;
  } else if (post.status !== "published") {
    return false;
  }

  // A scheduled or expired published post is not readable. Drafts remain
  // visible to an authorized editor so they can be prepared before publishing.
  if (post.status === "published") {
    const now = Date.now();
    if (post.publishedAt && post.publishedAt.getTime() > now) return false;
    if (post.expiresAt && post.expiresAt.getTime() <= now) return false;
  }

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