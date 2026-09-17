import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canReadConnection,
  isValidConnectionStatusTransition,
  toConnectionDto,
} from "./memberServiceConnections";
import {
  memberServiceConnectionDraftSchema,
  memberServiceDisclosureScopeSchema,
} from "@shared/schema";

const request = {
  requesterId: "requester",
  assignedOperatorId: "operator",
  assignedOrganizationUserId: "organization-user",
};

test("connection requests only expose access to the requester, assigned users, or authorized operators", () => {
  assert.equal(canReadConnection(request, "requester", false), true);
  assert.equal(canReadConnection(request, "operator", false), true);
  assert.equal(canReadConnection(request, "organization-user", false), true);
  assert.equal(canReadConnection(request, "other-member", false), false);
  assert.equal(canReadConnection(request, "other-member", true), true);
});

test("connection lifecycle only permits the server-defined state transitions", () => {
  assert.equal(isValidConnectionStatusTransition("draft", "submitted"), false);
  assert.equal(isValidConnectionStatusTransition("submitted", "reviewing"), true);
  assert.equal(isValidConnectionStatusTransition("reviewing", "assigned"), true);
  assert.equal(isValidConnectionStatusTransition("assigned", "in_progress"), true);
  assert.equal(isValidConnectionStatusTransition("in_progress", "completed"), true);
  assert.equal(isValidConnectionStatusTransition("completed", "closed"), true);
  assert.equal(isValidConnectionStatusTransition("closed", "submitted"), false);
});

test("organization participants only receive messages within the selected disclosure scope", () => {
  const value = {
    request: {
      id: "request-id",
      organizationId: "organization-id",
      requesterId: "requester",
      requestType: "directory_connection",
      purpose: "private purpose",
      background: "private background",
      industry: null,
      item: null,
      regions: [],
      desiredDate: null,
      language: "ko",
      disclosureScope: { kscc: true, targetOrganization: true, contactDetails: false },
      status: "submitted",
      assignedOperatorId: null,
      assignedOrganizationUserId: "organization-user",
      submittedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    messages: [
      {
        id: "private-message",
        authorId: "requester",
        body: "private details",
        disclosureScope: { kscc: true, targetOrganization: false, contactDetails: false },
        createdAt: new Date(),
      },
      {
        id: "shared-message",
        authorId: "requester",
        body: "shared details",
        disclosureScope: { kscc: true, targetOrganization: true, contactDetails: false },
        createdAt: new Date(),
      },
    ],
    attachments: [],
  } as any;

  const participantView = toConnectionDto(value, {
    ...request,
    requesterId: "requester",
    assignedOperatorId: null,
    assignedOrganizationUserId: "organization-user",
    userId: "organization-user",
    isAuthorizedOperator: false,
  });
  assert.deepEqual(participantView?.messages.map((message) => message.id), ["shared-message"]);
  assert.equal(participantView?.messages[0]?.body, "shared details");
});

test("connection input requires a public disclosure contract and consent is explicit", () => {
  assert.throws(() => memberServiceDisclosureScopeSchema.parse({
    kscc: false,
    targetOrganization: true,
  }));
  assert.throws(() => memberServiceConnectionDraftSchema.parse({
    organizationId: "not-a-uuid",
    requestType: "directory_connection",
  }));
});