import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { User, UserProfileDto } from "@shared/schema";

export const AUTH_TOKEN_TTL = "7d";
export const AUTH_TOKEN_ALGORITHM = "HS256" as const;

/**
 * Password hashes created by this application use bcrypt cost 12. Keeping the
 * policy here prevents individual registration, recovery, and profile paths
 * from silently drifting to weaker settings.
 */
export const BCRYPT_WORK_FACTOR = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_WORK_FACTOR);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function needsPasswordRehash(passwordHash: string): boolean {
  try {
    return bcrypt.getRounds(passwordHash) < BCRYPT_WORK_FACTOR;
  } catch {
    // bcrypt.compare remains the source of truth for malformed hashes. A
    // failed comparison must never trigger a replacement hash.
    return false;
  }
}

/**
 * Email identity policy: surrounding whitespace is ignored and matching is
 * case-insensitive. This is deliberately applied before every lookup/write,
 * not only by browser forms.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const normalizedEmailSchema = z
  .string()
  .trim()
  .max(254, "Email address must be 254 characters or fewer")
  .email("Invalid email address")
  .transform(normalizeEmail);

/**
 * Password policy is enforced at the server boundary. The upper bound keeps
 * bcrypt input within its supported 72-byte limit while avoiding password
 * content in validation errors.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be 72 characters or fewer");

export function issueAuthToken(user: Pick<User, "id" | "sessionVersion">, secret: string): string {
  return jwt.sign(
    { id: user.id, sv: user.sessionVersion ?? 0 },
    secret,
    { algorithm: AUTH_TOKEN_ALGORITHM, expiresIn: AUTH_TOKEN_TTL },
  );
}

/**
 * Account tokens have a single accepted signing algorithm and a stable
 * payload shape. Tokens from before sessionVersion was introduced are the
 * only exception: their missing `sv` claim is interpreted as version zero by
 * getTokenSessionVersion below. Such tokens are revoked as soon as the
 * account's session version changes.
 */
export function verifyAuthToken(token: string, secret: string): jwt.JwtPayload {
  const payload = jwt.verify(token, secret, {
    algorithms: [AUTH_TOKEN_ALGORITHM],
  });

  if (
    typeof payload === "string"
    || typeof payload.id !== "string"
    || payload.id.length === 0
    || typeof payload.iat !== "number"
    || !Number.isSafeInteger(payload.iat)
    || typeof payload.exp !== "number"
    || !Number.isSafeInteger(payload.exp)
  ) {
    throw new Error("Invalid account token payload");
  }

  if (
    payload.sv !== undefined
    && (typeof payload.sv !== "number"
      || !Number.isSafeInteger(payload.sv)
      || payload.sv < 0)
  ) {
    throw new Error("Invalid account token session version");
  }

  return payload;
}

/**
 * Tokens issued before sessionVersion was introduced remain valid at version
 * zero. Once any security-sensitive change occurs, the incremented version
 * revokes those legacy tokens too.
 */
export function getTokenSessionVersion(payload: jwt.JwtPayload): number | undefined {
  if (payload.sv === undefined) return 0;
  return typeof payload.sv === "number" && Number.isSafeInteger(payload.sv) && payload.sv >= 0
    ? payload.sv
    : undefined;
}

export function toSafeUser(user: User): UserProfileDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    userType: user.userType,
    weixin: user.weixin,
    createdAt: user.createdAt,
  };
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "23505";
}