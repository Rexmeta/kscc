import type { Post, PostMeta } from "@shared/schema";
import {
  ObjectStorageService,
  getResourceObjectAclVisibility,
} from "./objectStorage";
import {
  getResourceAclSyncMarker,
  RESOURCE_ACL_SYNC_META_KEY,
} from "./postScheduling";
import { storage, type IStorage } from "./storage";

export const DEFAULT_SCHEDULED_PUBLICATION_BATCH_SIZE = 25;
export const DEFAULT_SCHEDULED_PUBLICATION_INTERVAL_MS = 30_000;
const MAX_SCHEDULED_PUBLICATION_BATCH_SIZE = 100;
const MIN_SCHEDULED_PUBLICATION_INTERVAL_MS = 1_000;
const MAX_SCHEDULED_PUBLICATION_INTERVAL_MS = 5 * 60_000;

export interface ScheduledPublicationStorage {
  claimDueScheduledPosts(now: Date, limit: number): Promise<Post[]>;
  getResourcePostsNeedingAcl(now: Date, limit: number): Promise<Post[]>;
  getPostMeta(postId: string, key: string): Promise<PostMeta | undefined>;
  markResourceAclSynchronized(postId: string, marker: string): Promise<void>;
}

export interface ScheduledPublicationObjectStorage {
  updateObjectEntityAclVisibility(
    rawPath: string,
    visibility: "public" | "private",
    ownerId: string,
  ): Promise<string>;
}

export type ScheduledPublicationLogger = (
  event: string,
  details: Record<string, unknown>,
) => void;

export interface ScheduledPublicationRunResult {
  published: number;
  aclSynchronized: number;
  failures: number;
}

function boundedBatchSize(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_SCHEDULED_PUBLICATION_BATCH_SIZE;
  return Math.min(
    Math.max(Math.trunc(value as number), 1),
    MAX_SCHEDULED_PUBLICATION_BATCH_SIZE,
  );
}

function boundedInterval(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_SCHEDULED_PUBLICATION_INTERVAL_MS;
  return Math.min(
    Math.max(Math.trunc(value as number), MIN_SCHEDULED_PUBLICATION_INTERVAL_MS),
    MAX_SCHEDULED_PUBLICATION_INTERVAL_MS,
  );
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "name" in error &&
    typeof error.name === "string") {
    return error.name;
  }
  return "unknown";
}

function defaultLogger(event: string, details: Record<string, unknown>): void {
  console.info("[scheduled-publications]", JSON.stringify({ event, ...details }));
}

export class ScheduledPublicationRunner {
  private readonly batchSize: number;
  private readonly logger: ScheduledPublicationLogger;
  private readonly objectStorageFactory: () => ScheduledPublicationObjectStorage;

  constructor(options: {
    storage?: ScheduledPublicationStorage;
    batchSize?: number;
    logger?: ScheduledPublicationLogger;
    objectStorageFactory?: () => ScheduledPublicationObjectStorage;
  } = {}) {
    this.storage = options.storage || storage;
    this.batchSize = boundedBatchSize(options.batchSize);
    this.logger = options.logger || defaultLogger;
    this.objectStorageFactory =
      options.objectStorageFactory || (() => new ObjectStorageService());
  }

  private readonly storage: ScheduledPublicationStorage;

  async runOnce(now = new Date()): Promise<ScheduledPublicationRunResult> {
    let published = 0;
    let aclSynchronized = 0;
    let failures = 0;

    let duePosts: Post[] = [];
    try {
      duePosts = await this.storage.claimDueScheduledPosts(now, this.batchSize);
      published = duePosts.length;
      if (published > 0) {
        this.logger("posts_published", { count: published });
      }
    } catch (error) {
      failures += 1;
      this.logger("publication_claim_failed", { error: errorCode(error) });
    }

    let resourcePosts: Post[] = [];
    try {
      resourcePosts = await this.storage.getResourcePostsNeedingAcl(now, this.batchSize);
    } catch (error) {
      failures += 1;
      this.logger("resource_acl_scan_failed", { error: errorCode(error) });
      return { published, aclSynchronized, failures };
    }

    // A due resource is normally in the scan result, but deduplication keeps a
    // custom storage implementation or a concurrent update from doing two ACL
    // writes in one pass.
    const candidates = new Map<string, Post>();
    for (const post of [...duePosts, ...resourcePosts]) {
      if (post.postType === "resource") candidates.set(post.id, post);
    }

    for (const post of Array.from(candidates.values())) {
      const visibility = getResourceObjectAclVisibility(post, now);
      const marker = getResourceAclSyncMarker(post, visibility);

      try {
        const existingMarker = await this.storage.getPostMeta(
          post.id,
          RESOURCE_ACL_SYNC_META_KEY,
        );
        if (existingMarker?.valueText === marker) continue;

        const fileMeta = await this.storage.getPostMeta(post.id, "resource.fileUrl");
        const fileUrl = fileMeta?.valueText ||
          (typeof fileMeta?.value === "string" ? fileMeta.value : "");
        if (!fileUrl) continue;

        await this.objectStorageFactory().updateObjectEntityAclVisibility(
          fileUrl,
          visibility,
          post.authorId || "system",
        );
        await this.storage.markResourceAclSynchronized(post.id, marker);
        aclSynchronized += 1;
        this.logger("resource_acl_synchronized", {
          postType: post.postType,
          visibility,
        });
      } catch (error) {
        failures += 1;
        this.logger("resource_acl_sync_failed", { error: errorCode(error) });
      }
    }

    return { published, aclSynchronized, failures };
  }
}

export async function runScheduledPublicationsOnce(
  now = new Date(),
  options: ConstructorParameters<typeof ScheduledPublicationRunner>[0] = {},
): Promise<ScheduledPublicationRunResult> {
  return new ScheduledPublicationRunner(options).runOnce(now);
}

export function startScheduledPublicationWorker(options: {
  intervalMs?: number;
  batchSize?: number;
  logger?: ScheduledPublicationLogger;
  storage?: IStorage;
  objectStorageFactory?: () => ScheduledPublicationObjectStorage;
} = {}): () => void {
  const runner = new ScheduledPublicationRunner(options);
  let stopped = false;
  let running = false;

  const run = () => {
    if (stopped || running) return;
    running = true;
    void runner.runOnce().catch((error) => {
      // runOnce handles expected database and object-storage failures. This
      // guard protects the loop from an unexpected programming/runtime error.
      (options.logger || defaultLogger)("worker_run_failed", {
        error: errorCode(error),
      });
    }).finally(() => {
      running = false;
    });
  };

  const interval = setInterval(run, boundedInterval(options.intervalMs));
  interval.unref?.();
  run();

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

export { RESOURCE_ACL_SYNC_META_KEY };