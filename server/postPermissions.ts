export const postPermissionKeys = {
  news: {
    read: "news.read",
    create: "news.create",
    update: "news.update",
    delete: "news.delete",
    publish: "news.publish",
  },
  event: {
    read: "event.read",
    create: "event.create",
    update: "event.update",
    delete: "event.delete",
    publish: "event.publish",
  },
  resource: {
    read: "resource.read",
    create: "resource.upload",
    update: "resource.update",
    delete: "resource.delete",
    publish: "resource.publish",
  },
  page: {
    read: "page.read",
    create: undefined,
    update: "page.update",
    delete: undefined,
    publish: undefined,
  },
} as const;

export type ManagedPostType = keyof typeof postPermissionKeys;
export type StandardPostAction = keyof typeof postPermissionKeys.news;
export type PostAction = StandardPostAction | "attendeeManage";

export function isManagedPostType(postType: string): postType is ManagedPostType {
  return postType in postPermissionKeys;
}

export function getPostPermissionKey(
  postType: ManagedPostType,
  action: PostAction,
): string | undefined {
  if (action === "attendeeManage") {
    return postType === "event" ? "event.attendee.manage" : undefined;
  }

  return postPermissionKeys[postType][action];
}