import assert from "node:assert/strict";
import { test } from "node:test";
import { toSafeUser } from "./auth";
import {
  toAdminEventRegistration,
  toAdminMember,
  toAdminOrganizationMember,
  toAdminUser,
  toOwnEventRegistration,
  toOwnMember,
  toPublicMember,
  toPublicOrganizationMember,
} from "./dtos";
import type {
  EventRegistration,
  Member,
  OrganizationMember,
  PostWithTranslations,
  User,
} from "@shared/schema";

const now = new Date("2026-01-02T03:04:05.000Z");

test("user DTOs exclude credentials and authorization internals", () => {
  const user = {
    id: "user-1",
    email: "person@example.com",
    name: "Person",
    role: "user",
    userType: "company",
    weixin: "wx-id",
    membershipTier: "premium",
    isActive: true,
    createdAt: now,
    password: "should-not-leak",
    sessionVersion: 42,
  } as unknown as User;

  assert.deepEqual(toSafeUser(user), {
    id: "user-1",
    email: "person@example.com",
    name: "Person",
    role: "user",
    userType: "company",
    weixin: "wx-id",
    createdAt: now,
  });
  assert.deepEqual(toAdminUser(user), {
    id: "user-1",
    email: "person@example.com",
    name: "Person",
    role: "user",
    userType: "company",
    membershipTier: "premium",
    isActive: true,
  });
});

test("member DTOs keep only the fields allowed by each audience", () => {
  const member = {
    id: "member-1",
    userId: "user-1",
    companyName: "Example Co",
    companyNameEn: "Example Co",
    companyNameZh: "示例公司",
    industry: "Technology",
    country: "KR",
    city: "Seoul",
    address: "private address",
    phone: "private phone",
    website: "https://example.com",
    description: "description",
    descriptionEn: "description",
    descriptionZh: "description",
    logo: null,
    membershipLevel: "premium",
    membershipStatus: "active",
    contactPerson: "Contact",
    contactEmail: "contact@example.com",
    contactPhone: "010-0000-0000",
    isPublic: true,
    createdAt: now,
    updatedAt: now,
  } as unknown as Member;

  assert.deepEqual(Object.keys(toPublicMember(member)).sort(), [
    "city", "companyName", "companyNameEn", "companyNameZh", "country",
    "createdAt", "description", "descriptionEn", "descriptionZh", "id",
    "industry", "isPublic", "logo", "membershipLevel", "website",
  ].sort());
  assert.deepEqual(Object.keys(toOwnMember(member)).sort(), [
    "companyName", "id", "industry", "membershipLevel", "membershipStatus",
  ].sort());
  assert.deepEqual(Object.keys(toAdminMember(member)).sort(), [
    "address", "city", "companyName", "companyNameEn", "companyNameZh",
    "contactEmail", "contactPerson", "contactPhone", "country", "description",
    "descriptionEn", "descriptionZh", "id", "industry", "isPublic", "logo",
    "membershipLevel", "membershipStatus", "phone", "website",
  ].sort());
});

test("registration and organization DTOs flatten private records", () => {
  const registration = {
    id: "registration-1",
    eventId: "event-1",
    userId: "user-1",
    attendeeName: "Attendee",
    attendeeEmail: "attendee@example.com",
    attendeePhone: "010-0000-0000",
    companyName: "Example Co",
    status: "registered",
    createdAt: now,
    updatedAt: now,
    event: {
      id: "event-1",
      slug: "event",
      translations: [{ locale: "ko", title: "행사" }],
      meta: [
        { key: "event.eventDate", valueTimestamp: now, valueText: null, value: null },
        { key: "event.location", valueTimestamp: null, valueText: "Seoul", value: null },
        { key: "private.note", valueTimestamp: null, valueText: "private", value: null },
      ],
    },
  } as unknown as EventRegistration & { event: PostWithTranslations };
  const ownRegistration = toOwnEventRegistration(registration);
  assert.deepEqual(Object.keys(ownRegistration).sort(), ["createdAt", "event", "eventId", "id", "status"]);
  assert.deepEqual(Object.keys(ownRegistration.event!).sort(), ["eventDate", "id", "location", "slug", "translations"]);
  assert.deepEqual(toAdminEventRegistration(registration), {
    id: "registration-1",
    attendeeName: "Attendee",
    attendeeEmail: "attendee@example.com",
    attendeePhone: "010-0000-0000",
    companyName: "Example Co",
    status: "registered",
    createdAt: now,
  });

  const organizationMember = {
    id: "org-1",
    name: "Leader",
    nameEn: "Leader",
    nameZh: "负责人",
    position: "대표",
    positionEn: "Director",
    positionZh: "主任",
    category: "executives",
    photo: null,
    description: "public",
    descriptionEn: null,
    descriptionZh: null,
    sortOrder: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as unknown as OrganizationMember;
  assert.deepEqual(Object.keys(toPublicOrganizationMember(organizationMember)).sort(), [
    "category", "description", "descriptionEn", "descriptionZh", "id", "name",
    "nameEn", "nameZh", "photo", "position", "positionEn", "positionZh", "sortOrder",
  ].sort());
  assert.deepEqual(Object.keys(toAdminOrganizationMember(organizationMember)).sort(), [
    "category", "description", "descriptionEn", "descriptionZh", "id", "isActive",
    "name", "nameEn", "nameZh", "photo", "position", "positionEn", "positionZh",
    "sortOrder",
  ].sort());
});