import type { Post } from "@shared/schema";

/**
 * A metadata key is used instead of process-local state so ACL reconciliation
 * survives restarts and can be retried by another application instance.
 */
export const RESOURCE_ACL_SYNC_META_KEY = "system.resourceAclSynchronizedAt";

export class InvalidPostScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPostScheduleError";
    Object.setPrototypeOf(this, InvalidPostScheduleError.prototype);
  }
}

/**
 * A scheduled post stays a draft until the worker changes it to published.
 * Past schedule times are accepted deliberately: they allow a restart or a
 * missed interval to recover the post on the next worker pass.
 */
export function validatePostSchedule(
  post: Pick<Post, "status" | "publishedAt" | "scheduledAt" | "expiresAt">,
): void {
  if (post.scheduledAt === null || post.scheduledAt === undefined) return;

  if (post.status !== "draft") {
    throw new InvalidPostScheduleError(
      "Scheduled posts must remain drafts until their scheduled time",
    );
  }
  if (post.publishedAt !== null && post.publishedAt !== undefined) {
    throw new InvalidPostScheduleError(
      "Scheduled posts cannot have a publishedAt timestamp before publication",
    );
  }
  if (post.expiresAt && post.expiresAt <= post.scheduledAt) {
    throw new InvalidPostScheduleError(
      "A scheduled post must expire after its scheduled time",
    );
  }
}

function formatTimestamp(timestamp: Date): string {
  return timestamp.toISOString();
}

/**
 * The marker includes both the post version and the currently desired ACL
 * state. This is important for a future publishedAt or expiresAt boundary:
 * neither boundary changes posts.updatedAt when the clock moves forward.
 */
export function getResourceAclSyncMarker(
  post: Pick<Post, "status" | "visibility" | "publishedAt" | "expiresAt" | "updatedAt">,
  visibility: "public" | "private",
): string {
  return `${formatTimestamp(post.updatedAt)}:${visibility}`;
}