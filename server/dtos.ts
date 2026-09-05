import type {
  AdminEventRegistrationDto,
  AdminMemberDto,
  AdminMembershipDto,
  AdminUserDto,
  AdminOrganizationMemberDto,
  EventRegistration,
  Inquiry,
  InquiryReply,
  Member,
  OwnEventRegistrationDto,
  OwnMemberDto,
  PostWithTranslations,
  PublicMemberDto,
  PublicOrganizationMemberDto,
  User,
  OrganizationMember,
} from "@shared/schema";

export function toAdminUser(user: User): AdminUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    userType: user.userType,
    membershipTier: user.membershipTier,
    isActive: user.isActive,
  };
}

export function toAdminMembership(
  membership: {
    tierCode: string;
    tierName: string;
    isActive: boolean;
  } | null,
): AdminMembershipDto | null {
  if (!membership) return null;
  return {
    tierCode: membership.tierCode,
    tierName: membership.tierName,
    isActive: membership.isActive,
  };
}

export function toPublicMember(member: Member): PublicMemberDto {
  return {
    id: member.id,
    companyName: member.companyName,
    companyNameEn: member.companyNameEn,
    companyNameZh: member.companyNameZh,
    industry: member.industry,
    country: member.country,
    city: member.city,
    website: member.website,
    description: member.description,
    descriptionEn: member.descriptionEn,
    descriptionZh: member.descriptionZh,
    logo: member.logo,
    membershipLevel: member.membershipLevel,
    isPublic: member.isPublic,
    createdAt: member.createdAt,
  };
}

export function toOwnMember(member: Member): OwnMemberDto {
  return {
    id: member.id,
    companyName: member.companyName,
    industry: member.industry,
    membershipLevel: member.membershipLevel,
    membershipStatus: member.membershipStatus,
  };
}

export function toAdminMember(member: Member): AdminMemberDto {
  return {
    id: member.id,
    companyName: member.companyName,
    companyNameEn: member.companyNameEn,
    companyNameZh: member.companyNameZh,
    industry: member.industry,
    country: member.country,
    city: member.city,
    address: member.address,
    phone: member.phone,
    website: member.website,
    description: member.description,
    descriptionEn: member.descriptionEn,
    descriptionZh: member.descriptionZh,
    logo: member.logo,
    membershipLevel: member.membershipLevel,
    membershipStatus: member.membershipStatus,
    contactPerson: member.contactPerson,
    contactEmail: member.contactEmail,
    contactPhone: member.contactPhone,
    isPublic: member.isPublic,
  };
}

export function toPublicOrganizationMember(
  member: OrganizationMember,
): PublicOrganizationMemberDto {
  return {
    id: member.id,
    name: member.name,
    nameEn: member.nameEn,
    nameZh: member.nameZh,
    position: member.position,
    positionEn: member.positionEn,
    positionZh: member.positionZh,
    category: member.category,
    photo: member.photo,
    description: member.description,
    descriptionEn: member.descriptionEn,
    descriptionZh: member.descriptionZh,
    sortOrder: member.sortOrder,
  };
}

export function toAdminOrganizationMember(
  member: OrganizationMember,
): AdminOrganizationMemberDto {
  return {
    ...toPublicOrganizationMember(member),
    isActive: member.isActive,
  };
}

function getMetaValue(post: PostWithTranslations, keys: string[]): string | Date | null {
  const meta = post.meta.find((item) => keys.includes(item.key));
  if (!meta) return null;
  if (meta.valueTimestamp !== null) return meta.valueTimestamp;
  if (meta.valueText !== null) return meta.valueText;
  return typeof meta.value === "string" ? meta.value : null;
}

export function toOwnEventRegistration(
  registration: EventRegistration & { event?: PostWithTranslations | null },
): OwnEventRegistrationDto {
  const event = registration.event;
  return {
    id: registration.id,
    eventId: registration.eventId,
    status: registration.status,
    createdAt: registration.createdAt,
    event: event
      ? {
          id: event.id,
          slug: event.slug,
          translations: event.translations.map(({ locale, title }) => ({ locale, title })),
          eventDate: getMetaValue(event, ["event.eventDate", "event.date"]),
          location: (() => {
            const value = getMetaValue(event, ["event.location"]);
            return typeof value === "string" ? value : null;
          })(),
        }
      : null,
  };
}

export function toAdminEventRegistration(
  registration: EventRegistration,
): AdminEventRegistrationDto {
  return {
    id: registration.id,
    attendeeName: registration.attendeeName,
    attendeeEmail: registration.attendeeEmail,
    attendeePhone: registration.attendeePhone,
    companyName: registration.companyName,
    status: registration.status,
    createdAt: registration.createdAt,
  };
}

export function toAdminInquiry(inquiry: Inquiry) {
  return {
    id: inquiry.id,
    category: inquiry.category,
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    companyName: inquiry.companyName,
    subject: inquiry.subject,
    message: inquiry.message,
    status: inquiry.status,
    createdAt: inquiry.createdAt,
  };
}

export function toAdminInquiryWithReplies(
  inquiry: Inquiry & {
    replies: Array<InquiryReply & { responder: { id: string; name: string } | null }>;
  },
) {
  return {
    ...toAdminInquiry(inquiry),
    replies: inquiry.replies.map((reply) => ({
      id: reply.id,
      inquiryId: reply.inquiryId,
      message: reply.message,
      emailSent: reply.emailSent,
      emailSentAt: reply.emailSentAt,
      createdAt: reply.createdAt,
      responder: reply.responder,
    })),
  };
}