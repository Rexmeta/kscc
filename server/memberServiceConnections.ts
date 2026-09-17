import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  memberServiceAttachments,
  memberServiceAuditLogs,
  memberServiceConnectionMessages,
  memberServiceConnectionRequests,
  memberServiceOrganizations,
  memberServiceConsentSchema,
  memberServiceConnectionDraftSchema,
  memberServiceConnectionMessageSchema,
  memberServiceDisclosureScopeSchema,
  type MemberServiceConnectionDraftInput,
  type MemberServiceConnectionMessageInput,
  type MemberServiceDisclosureScope,
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { PUBLIC_VERIFICATION_STATUSES } from "./memberServiceDirectory";

export const CONNECTION_OPERATOR_READ_PERMISSION = "member_service.connection.read";
export const CONNECTION_OPERATOR_MANAGE_PERMISSION = "member_service.connection.manage";

export type ConnectionStatus =
  | "draft"
  | "submitted"
  | "reviewing"
  | "assigned"
  | "in_progress"
  | "completed"
  | "closed"
  | "cancelled"
  | "rejected";

export class ConnectionNotFoundError extends Error {
  constructor() {
    super("Connection request not found");
    this.name = "ConnectionNotFoundError";
  }
}

export class ConnectionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConnectionConflictError";
  }
}

const DEFAULT_DISCLOSURE_SCOPE: MemberServiceDisclosureScope = {
  kscc: true,
  targetOrganization: false,
  contactDetails: false,
};

const VALID_STATUS_TRANSITIONS: Record<ConnectionStatus, ConnectionStatus[]> = {
  draft: [],
  submitted: ["reviewing", "cancelled", "rejected"],
  reviewing: ["assigned", "cancelled", "rejected"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["closed"],
  closed: [],
  cancelled: [],
  rejected: [],
};

export function isValidConnectionStatusTransition(
  from: ConnectionStatus,
  to: ConnectionStatus,
) {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

function publicOrganizationCondition(organizationId: string) {
  return and(
    eq(memberServiceOrganizations.id, organizationId),
    eq(memberServiceOrganizations.isActive, true),
    eq(memberServiceOrganizations.publicApproved, true),
    inArray(memberServiceOrganizations.verificationStatus, [...PUBLIC_VERIFICATION_STATUSES]),
  );
}

function redactedState(status: string, disclosureScope: unknown) {
  return {
    status,
    disclosureScope: memberServiceDisclosureScopeSchema.parse(disclosureScope),
  };
}

async function writeAudit(
  tx: any,
  values: {
    actorId: string;
    action: string;
    entityId: string;
    correlationId: string;
    before?: { status: string; disclosureScope: unknown };
    after?: { status: string; disclosureScope: unknown };
  },
) {
  await tx.insert(memberServiceAuditLogs).values({
    actorId: values.actorId,
    action: values.action,
    entityType: "connection_request",
    entityId: values.entityId,
    before: values.before ? redactedState(values.before.status, values.before.disclosureScope) : null,
    after: values.after ? redactedState(values.after.status, values.after.disclosureScope) : null,
    correlationId: values.correlationId,
  });
}

function normalizeDraftInput(input: MemberServiceConnectionDraftInput) {
  return {
    requestType: input.requestType,
    purpose: input.purpose || null,
    background: input.background || null,
    industry: input.industry || null,
    item: input.item || null,
    regions: input.regions || [],
    desiredDate: input.desiredDate || null,
    language: input.language,
    disclosureScope: input.disclosureScope || DEFAULT_DISCLOSURE_SCOPE,
    consentPolicyVersion: input.consent?.policyVersion || null,
    consentedAt: input.consent?.accepted ? new Date() : null,
  };
}

export async function createConnectionDraft(
  requesterId: string,
  rawInput: unknown,
  correlationId: string,
) {
  const input = memberServiceConnectionDraftSchema.parse(rawInput);
  const normalized = normalizeDraftInput(input);

  return db.transaction(async (tx) => {
    const [organization] = await tx
      .select({ id: memberServiceOrganizations.id })
      .from(memberServiceOrganizations)
      .where(publicOrganizationCondition(input.organizationId))
      .limit(1);
    if (!organization) throw new ConnectionNotFoundError();

    const [request] = await tx
      .insert(memberServiceConnectionRequests)
      .values({
        requesterId,
        organizationId: organization.id,
        ...normalized,
      })
      .returning();

    await writeAudit(tx, {
      actorId: requesterId,
      action: "connection.created",
      entityId: request.id,
      correlationId,
      after: { status: request.status, disclosureScope: request.disclosureScope },
    });
    return request;
  });
}

export async function listConnectionRequests(
  requesterId: string,
  filters: { limit?: number; offset?: number } = {},
) {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 50);
  const offset = Math.max(filters.offset ?? 0, 0);
  return db
    .select()
    .from(memberServiceConnectionRequests)
    .where(eq(memberServiceConnectionRequests.requesterId, requesterId))
    .orderBy(desc(memberServiceConnectionRequests.updatedAt), desc(memberServiceConnectionRequests.id))
    .limit(limit)
    .offset(offset);
}

export async function getConnectionRequest(id: string) {
  const [request] = await db
    .select()
    .from(memberServiceConnectionRequests)
    .where(eq(memberServiceConnectionRequests.id, id))
    .limit(1);
  if (!request) return undefined;

  const [messages, attachments] = await Promise.all([
    db
      .select({
        id: memberServiceConnectionMessages.id,
        authorId: memberServiceConnectionMessages.authorId,
        body: memberServiceConnectionMessages.body,
        disclosureScope: memberServiceConnectionMessages.disclosureScope,
        createdAt: memberServiceConnectionMessages.createdAt,
      })
      .from(memberServiceConnectionMessages)
      .where(eq(memberServiceConnectionMessages.requestId, id))
      .orderBy(asc(memberServiceConnectionMessages.createdAt), asc(memberServiceConnectionMessages.id)),
    db
      .select({
        id: memberServiceAttachments.id,
        messageId: memberServiceAttachments.messageId,
        fileName: memberServiceAttachments.fileName,
        contentType: memberServiceAttachments.contentType,
        sizeBytes: memberServiceAttachments.sizeBytes,
        disclosureScope: memberServiceAttachments.disclosureScope,
        createdAt: memberServiceAttachments.createdAt,
      })
      .from(memberServiceAttachments)
      .where(eq(memberServiceAttachments.requestId, id))
      .orderBy(asc(memberServiceAttachments.createdAt), asc(memberServiceAttachments.id)),
  ]);

  return { request, messages, attachments };
}

export async function recordConnectionView(
  id: string,
  actorId: string,
  correlationId: string,
) {
  const [request] = await db
    .select({
      status: memberServiceConnectionRequests.status,
      disclosureScope: memberServiceConnectionRequests.disclosureScope,
    })
    .from(memberServiceConnectionRequests)
    .where(eq(memberServiceConnectionRequests.id, id))
    .limit(1);
  if (!request) return;
  await db.insert(memberServiceAuditLogs).values({
    actorId,
    action: "connection.viewed",
    entityType: "connection_request",
    entityId: id,
    before: redactedState(request.status, request.disclosureScope),
    after: null,
    correlationId,
  });
}

export function canReadConnection(
  request: { requesterId: string; assignedOperatorId: string | null; assignedOrganizationUserId: string | null },
  userId: string,
  isAuthorizedOperator: boolean,
) {
  return isAuthorizedOperator
    || request.requesterId === userId
    || request.assignedOperatorId === userId
    || request.assignedOrganizationUserId === userId;
}

export async function updateConnectionDraft(
  id: string,
  requesterId: string,
  rawInput: unknown,
  correlationId: string,
) {
  const input = memberServiceConnectionDraftSchema.partial().omit({ organizationId: true }).parse(rawInput);
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(memberServiceConnectionRequests)
      .where(and(
        eq(memberServiceConnectionRequests.id, id),
        eq(memberServiceConnectionRequests.requesterId, requesterId),
      ))
      .limit(1);
    if (!existing) throw new ConnectionNotFoundError();
    if (existing.status !== "draft") {
      throw new ConnectionConflictError("Only draft connection requests can be edited");
    }

    const nextDisclosureScope = input.disclosureScope
      ?? memberServiceDisclosureScopeSchema.parse(existing.disclosureScope);
    const nextRegions = input.regions
      ?? (Array.isArray(existing.regions) ? existing.regions as string[] : []);
    const [updated] = await tx
      .update(memberServiceConnectionRequests)
      .set({
        requestType: input.requestType ?? existing.requestType,
        purpose: input.purpose === undefined ? existing.purpose : input.purpose || null,
        background: input.background === undefined ? existing.background : input.background || null,
        industry: input.industry === undefined ? existing.industry : input.industry || null,
        item: input.item === undefined ? existing.item : input.item || null,
        regions: nextRegions,
        desiredDate: input.desiredDate === undefined ? existing.desiredDate : input.desiredDate || null,
        language: input.language ?? existing.language,
        disclosureScope: nextDisclosureScope,
        consentPolicyVersion: input.consent
          ? input.consent.policyVersion
          : existing.consentPolicyVersion,
        consentedAt: input.consent?.accepted ? new Date() : existing.consentedAt,
        updatedAt: new Date(),
      })
      .where(eq(memberServiceConnectionRequests.id, id))
      .returning();

    await writeAudit(tx, {
      actorId: requesterId,
      action: "connection.updated",
      entityId: id,
      correlationId,
      before: { status: existing.status, disclosureScope: existing.disclosureScope },
      after: { status: updated.status, disclosureScope: updated.disclosureScope },
    });
    return updated;
  });
}

export async function submitConnectionRequest(
  id: string,
  requesterId: string,
  rawInput: unknown,
  correlationId: string,
) {
  const input = zSubmitInput.parse(rawInput);
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(memberServiceConnectionRequests)
      .where(and(
        eq(memberServiceConnectionRequests.id, id),
        eq(memberServiceConnectionRequests.requesterId, requesterId),
      ))
      .limit(1);
    if (!existing) throw new ConnectionNotFoundError();

    if (existing.status === "submitted" && existing.idempotencyKey === input.idempotencyKey) {
      return existing;
    }
    if (existing.status !== "draft") {
      throw new ConnectionConflictError("Connection request has already been submitted");
    }

    const disclosureScope = input.disclosureScope
      ?? memberServiceDisclosureScopeSchema.parse(existing.disclosureScope);
    const policyVersion = input.consent?.policyVersion ?? existing.consentPolicyVersion;
    const consentedAt = input.consent?.accepted ? new Date() : existing.consentedAt;
    const purpose = existing.purpose?.trim();
    if (!purpose || !policyVersion || !consentedAt || !disclosureScope.targetOrganization) {
      throw new ConnectionConflictError(
        "A purpose, consent, and target organization disclosure are required before submission",
      );
    }

    const [organization] = await tx
      .select({ id: memberServiceOrganizations.id })
      .from(memberServiceOrganizations)
      .where(publicOrganizationCondition(existing.organizationId))
      .limit(1);
    if (!organization) throw new ConnectionNotFoundError();

    const [updated] = await tx
      .update(memberServiceConnectionRequests)
      .set({
        status: "submitted",
        idempotencyKey: input.idempotencyKey,
        disclosureScope,
        consentPolicyVersion: policyVersion,
        consentedAt,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(memberServiceConnectionRequests.id, id),
        eq(memberServiceConnectionRequests.requesterId, requesterId),
        eq(memberServiceConnectionRequests.status, "draft"),
      ))
      .returning();
    if (!updated) throw new ConnectionConflictError("Connection request has already been submitted");

    await writeAudit(tx, {
      actorId: requesterId,
      action: "connection.submitted",
      entityId: id,
      correlationId,
      before: { status: existing.status, disclosureScope: existing.disclosureScope },
      after: { status: updated.status, disclosureScope: updated.disclosureScope },
    });
    return updated;
  });
}

const zSubmitInput = z.object({
  idempotencyKey: z.string().trim().min(8).max(160),
  disclosureScope: memberServiceDisclosureScopeSchema.optional(),
  consent: memberServiceConsentSchema.optional(),
}).strict();

export async function transitionConnectionRequest(
  id: string,
  actorId: string,
  nextStatus: ConnectionStatus,
  correlationId: string,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(memberServiceConnectionRequests)
      .where(eq(memberServiceConnectionRequests.id, id))
      .limit(1);
    if (!existing) throw new ConnectionNotFoundError();

    if (!isValidConnectionStatusTransition(existing.status as ConnectionStatus, nextStatus)) {
      throw new ConnectionConflictError(
        `Cannot transition connection request from ${existing.status} to ${nextStatus}`,
      );
    }

    const [updated] = await tx
      .update(memberServiceConnectionRequests)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(and(
        eq(memberServiceConnectionRequests.id, id),
        eq(memberServiceConnectionRequests.status, existing.status),
      ))
      .returning();
    if (!updated) throw new ConnectionConflictError("Connection request changed concurrently");

    await writeAudit(tx, {
      actorId,
      action: "connection.status_changed",
      entityId: id,
      correlationId,
      before: { status: existing.status, disclosureScope: existing.disclosureScope },
      after: { status: updated.status, disclosureScope: updated.disclosureScope },
    });
    return updated;
  });
}

export async function createConnectionMessage(
  id: string,
  authorId: string,
  rawInput: unknown,
  correlationId: string,
) {
  const input: MemberServiceConnectionMessageInput = memberServiceConnectionMessageSchema.parse(rawInput);
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(memberServiceConnectionRequests)
      .where(eq(memberServiceConnectionRequests.id, id))
      .limit(1);
    if (!request) throw new ConnectionNotFoundError();
    if (["draft", "closed", "cancelled", "rejected"].includes(request.status)) {
      throw new ConnectionConflictError("Messages cannot be added to this connection request");
    }

    const disclosureScope = input.disclosureScope
      ?? memberServiceDisclosureScopeSchema.parse(request.disclosureScope);
    if (disclosureScope.targetOrganization
      && !memberServiceDisclosureScopeSchema.parse(request.disclosureScope).targetOrganization) {
      throw new ConnectionConflictError("The target organization is not included in the request disclosure");
    }

    const [message] = await tx
      .insert(memberServiceConnectionMessages)
      .values({
        requestId: id,
        authorId,
        body: input.body,
        disclosureScope,
      })
      .returning({
        id: memberServiceConnectionMessages.id,
        authorId: memberServiceConnectionMessages.authorId,
        body: memberServiceConnectionMessages.body,
        disclosureScope: memberServiceConnectionMessages.disclosureScope,
        createdAt: memberServiceConnectionMessages.createdAt,
      });

    await writeAudit(tx, {
      actorId: authorId,
      action: "connection.message_created",
      entityId: id,
      correlationId,
      before: { status: request.status, disclosureScope: request.disclosureScope },
      after: { status: request.status, disclosureScope: request.disclosureScope },
    });
    return message;
  });
}

export function toConnectionDto(
  value: Awaited<ReturnType<typeof getConnectionRequest>>,
  viewer?: {
    requesterId: string;
    assignedOperatorId: string | null;
    assignedOrganizationUserId: string | null;
    userId: string;
    isAuthorizedOperator: boolean;
  },
) {
  if (!value) return null;
  const isRequester = Boolean(viewer && viewer.requesterId === viewer.userId);
  const isAssignedOrganizationUser = Boolean(
    viewer && viewer.assignedOrganizationUserId === viewer.userId,
  );
  const canViewAll = !viewer
    || viewer.isAuthorizedOperator
    || viewer.assignedOperatorId === viewer.userId
    || isRequester;
  const messages = canViewAll
    ? value.messages
    : isAssignedOrganizationUser
      ? value.messages.filter((message) => {
        const scope = memberServiceDisclosureScopeSchema.parse(message.disclosureScope);
        return scope.targetOrganization;
      })
      : [];
  const attachments = canViewAll
    ? value.attachments
    : isAssignedOrganizationUser
      ? value.attachments.filter((attachment) => {
        const scope = memberServiceDisclosureScopeSchema.parse(attachment.disclosureScope);
        return scope.targetOrganization;
      })
      : [];
  return {
    id: value.request.id,
    organizationId: value.request.organizationId,
    requesterId: value.request.requesterId,
    requestType: value.request.requestType,
    purpose: value.request.purpose,
    background: value.request.background,
    industry: value.request.industry,
    item: value.request.item,
    regions: value.request.regions,
    desiredDate: value.request.desiredDate,
    language: value.request.language,
    disclosureScope: value.request.disclosureScope,
    status: value.request.status,
    assignedOperatorId: value.request.assignedOperatorId,
    assignedOrganizationUserId: value.request.assignedOrganizationUserId,
    submittedAt: value.request.submittedAt,
    createdAt: value.request.createdAt,
    updatedAt: value.request.updatedAt,
    messages,
    attachments,
  };
}

export function toConnectionSummary(
  request: Awaited<ReturnType<typeof listConnectionRequests>>[number],
) {
  return {
    id: request.id,
    organizationId: request.organizationId,
    requesterId: request.requesterId,
    requestType: request.requestType,
    purpose: request.purpose,
    status: request.status,
    disclosureScope: request.disclosureScope,
    submittedAt: request.submittedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}