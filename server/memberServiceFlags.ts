const isExplicitlyEnabled = (value: string | undefined) => value?.trim().toLowerCase() === "true";

export type MemberServiceFlags = {
  enabled: boolean;
  directory: boolean;
  recommendation: boolean;
  connections: boolean;
  opportunities: boolean;
  operator: boolean;
};

export function getMemberServiceFlags(): MemberServiceFlags {
  const enabled = isExplicitlyEnabled(process.env.MEMBER_SERVICE_ENABLED)
    || process.env.NODE_ENV !== "production";

  return {
    enabled,
    directory: enabled && (
      isExplicitlyEnabled(process.env.MEMBER_SERVICE_DIRECTORY_ENABLED)
      || process.env.MEMBER_SERVICE_DIRECTORY_ENABLED === undefined
    ),
    recommendation: enabled && isExplicitlyEnabled(process.env.MEMBER_SERVICE_RECOMMENDATION_ENABLED),
    connections: enabled && isExplicitlyEnabled(process.env.MEMBER_SERVICE_CONNECTIONS_ENABLED),
    opportunities: enabled && isExplicitlyEnabled(process.env.MEMBER_SERVICE_OPPORTUNITIES_ENABLED),
    operator: enabled && isExplicitlyEnabled(process.env.MEMBER_SERVICE_OPERATOR_ENABLED),
  };
}

export function isMemberServiceDirectoryEnabled() {
  return getMemberServiceFlags().directory;
}