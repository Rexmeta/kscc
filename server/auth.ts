import jwt from "jsonwebtoken";
import { z } from "zod";
import type { User } from "@shared/schema";

export const AUTH_TOKEN_TTL = "7d";

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
    { expiresIn: AUTH_TOKEN_TTL },
  );
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

export function toSafeUser(user: User): Omit<User, "password"> {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "23505";
}