// Reference: blueprint:javascript_object_storage
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";
import type { Post } from "@shared/schema";
import { emitOperationalEvent } from "./telemetry";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export function getResourceObjectAclVisibility(
  post: Pick<Post, "status" | "visibility" | "publishedAt" | "expiresAt">,
  now = new Date(),
): ObjectAclPolicy["visibility"] {
  return post.status === "published" &&
    post.visibility === "public" &&
    (!post.publishedAt || post.publishedAt <= now) &&
    (!post.expiresAt || post.expiresAt > now)
    ? "public"
    : "private";
}

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class InvalidObjectPathError extends Error {
  constructor() {
    super("Invalid managed object path");
    this.name = "InvalidObjectPathError";
    Object.setPrototypeOf(this, InvalidObjectPathError.prototype);
  }
}

export class ObjectOwnershipError extends Error {
  constructor() {
    super("Object ownership does not match the requested operation");
    this.name = "ObjectOwnershipError";
    Object.setPrototypeOf(this, ObjectOwnershipError.prototype);
  }
}

export class InvalidUploadIntentError extends Error {
  constructor() {
    super("Invalid or expired upload intent");
    this.name = "InvalidUploadIntentError";
    Object.setPrototypeOf(this, InvalidUploadIntentError.prototype);
  }
}

export interface ObjectUploadResult {
  uploadURL: string;
  objectPath: string;
  uploadIntent: string;
}

interface ObjectUploadIntentPayload extends jwt.JwtPayload {
  typ: "managed-object-upload";
  sub: string;
  objectPath: string;
  purpose: "managed-content";
}

const UPLOAD_INTENT_TTL_SEC = 900;

/**
 * An established owner may only be changed through an authorized linked-post
 * edit, and even that path never replaces the owner. A linked post without an
 * existing ACL cannot establish ownership because it has no trusted owner.
 */
export function canMutateObjectAcl({
  ownerId,
  existingOwner,
  hasValidUploadIntent,
  canEditLinkedPost,
}: {
  ownerId: string;
  existingOwner?: string;
  hasValidUploadIntent: boolean;
  canEditLinkedPost: boolean;
}): boolean {
  if (!hasValidUploadIntent && !canEditLinkedPost) return false;
  if (!existingOwner) return hasValidUploadIntent;
  if (hasValidUploadIntent && existingOwner !== ownerId && !canEditLinkedPost) {
    return false;
  }
  return true;
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        const aclPolicy = await getObjectAclPolicy(file);
        if (aclPolicy?.visibility === "public") {
          return file;
        }
      }
    }

    return null;
  }

  async downloadObject(
    file: File,
    res: Response,
    cacheTtlSec: number = 3600,
    options: { publicCache?: boolean; correlationId?: string } = {},
  ) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      if (!aclPolicy) {
        if (!res.headersSent) res.sendStatus(403);
        return;
      }
      const isPublic = aclPolicy.visibility === "public";
      const usePublicCache = options.publicCache ?? isPublic;

      let contentType = metadata.contentType || "application/octet-stream";

      // If Content-Type is generic, try to detect from magic bytes
      if (contentType === "application/octet-stream") {
        contentType = await this.detectContentType(file, contentType);
      }

      res.set({
        "Content-Type": contentType,
        "Content-Length": metadata.size,
        "Cache-Control": usePublicCache
          ? `public, max-age=${cacheTtlSec}`
          : "private, no-store",
        ...(usePublicCache
          ? {}
          : {
              "Pragma": "no-cache",
              "Expires": "0",
              "Vary": "Authorization",
            }),
      });

      const stream = file.createReadStream();

      stream.on("error", (err) => {
        emitOperationalEvent("storage.failure", "error", {
          correlationId: options.correlationId,
          operation: "download_stream",
          errorType: err instanceof Error ? err.name : "UnknownError",
          result: "failed",
        });
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      emitOperationalEvent("storage.failure", "error", {
        correlationId: options.correlationId,
        operation: "download",
        errorType: error instanceof Error ? error.name : "UnknownError",
        result: "failed",
      });
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  private async detectContentType(file: File, fallback: string): Promise<string> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const stream = file.createReadStream({ start: 0, end: 11 });
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        const header = Buffer.concat(chunks);
        if (header.length >= 3 && header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
          resolve("image/jpeg");
        } else if (header.length >= 4 && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
          resolve("image/png");
        } else if (header.length >= 4 && header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
          resolve("image/gif");
        } else if (header.length >= 12 && header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
                   header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
          resolve("image/webp");
        } else if (header.length >= 2 && header[0] === 0x42 && header[1] === 0x4D) {
          resolve("image/bmp");
        } else if (header.length >= 4 && header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
          resolve("application/pdf");
        } else {
          resolve(fallback);
        }
      });
      stream.on("error", () => resolve(fallback));
    });
  }

  private async createObjectUpload(
    contentType?: string,
  ): Promise<{ uploadURL: string; objectPath: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const entityId = `uploads/${objectId}`;
    const fullPath = `${privateObjectDir}/${entityId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
      contentType,
    });
    return {
      uploadURL,
      objectPath: `/objects/${entityId}`,
    };
  }

  async getObjectEntityUploadURL(contentType?: string): Promise<string> {
    return (await this.createObjectUpload(contentType)).uploadURL;
  }

  async createObjectUploadIntent(
    ownerId: string,
    contentType?: string,
  ): Promise<ObjectUploadResult> {
    if (!ownerId) {
      throw new InvalidUploadIntentError();
    }

    const { uploadURL, objectPath } = await this.createObjectUpload(contentType);
    const uploadIntent = jwt.sign(
      {
        typ: "managed-object-upload",
        sub: ownerId,
        objectPath,
        purpose: "managed-content",
      } satisfies ObjectUploadIntentPayload,
      getUploadIntentSecret(),
      {
        algorithm: "HS256",
        expiresIn: UPLOAD_INTENT_TTL_SEC,
      },
    );

    return { uploadURL, objectPath, uploadIntent };
  }

  verifyObjectUploadIntent(
    token: string,
    ownerId: string,
    objectPath: string,
  ): boolean {
    try {
      const payload = jwt.verify(token, getUploadIntentSecret(), {
        algorithms: ["HS256"],
      });
      if (
        typeof payload === "string" ||
        payload.typ !== "managed-object-upload" ||
        payload.sub !== ownerId ||
        payload.objectPath !== objectPath ||
        payload.purpose !== "managed-content"
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    const entityId = this.getEntityIdFromObjectPath(objectPath);
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("/objects/")) {
      this.getEntityIdFromObjectPath(rawPath);
      return rawPath;
    }

    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      throw new InvalidObjectPathError();
    }

    try {
      const url = new URL(rawPath);
      if (url.search || url.hash) {
        throw new InvalidObjectPathError();
      }

      const privateDir = stripSlashes(this.getPrivateObjectDir());
      const rawObjectPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      if (!rawObjectPath.startsWith(`${privateDir}/`)) {
        throw new InvalidObjectPathError();
      }

      const entityId = rawObjectPath.slice(privateDir.length + 1);
      this.validateEntityId(entityId);
      return `/objects/${entityId}`;
    } catch (error) {
      if (error instanceof InvalidObjectPathError) throw error;
      throw new InvalidObjectPathError();
    }
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    const existingPolicy = await getObjectAclPolicy(objectFile);
    if (existingPolicy && existingPolicy.owner !== aclPolicy.owner) {
      throw new ObjectOwnershipError();
    }
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async updateObjectEntityAclVisibility(
    rawPath: string,
    visibility: ObjectAclPolicy["visibility"],
    ownerId: string,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    const existingPolicy = await getObjectAclPolicy(objectFile);
    if (!existingPolicy) {
      throw new ObjectOwnershipError();
    }
    await setObjectAclPolicy(objectFile, {
      owner: existingPolicy.owner,
      visibility,
      aclRules: existingPolicy.aclRules,
    });
    return normalizedPath;
  }

  private getEntityIdFromObjectPath(objectPath: string): string {
    if (!objectPath.startsWith("/objects/")) {
      throw new InvalidObjectPathError();
    }
    const entityId = objectPath.slice("/objects/".length);
    let decodedEntityId: string;
    try {
      decodedEntityId = decodeURIComponent(entityId);
    } catch {
      throw new InvalidObjectPathError();
    }
    // Keep one canonical representation so encoded separators or dot
    // segments cannot bypass the namespace checks.
    if (decodedEntityId !== entityId) {
      throw new InvalidObjectPathError();
    }
    this.validateEntityId(entityId);
    return entityId;
  }

  private validateEntityId(entityId: string): void {
    if (
      !entityId ||
      entityId.includes("\\") ||
      entityId.includes("\0") ||
      entityId.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      throw new InvalidObjectPathError();
    }
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  async getObjectEntityAclPolicy(file: File): Promise<ObjectAclPolicy | null> {
    return getObjectAclPolicy(file);
  }
}

function stripSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function getUploadIntentSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be set for upload intents");
  }
  return secret;
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
  contentType,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
  contentType?: string;
}): Promise<string> {
  const request: Record<string, unknown> = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  
  if (contentType) {
    request.content_type = contentType;
  }
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
