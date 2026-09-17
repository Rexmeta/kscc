const isExplicitlyEnabled = (value: string | undefined) => value?.trim().toLowerCase() === "true";

export type MemberServiceFlags = {
  enabled: boolean;
  directory: boolean;
  recommendation: boolean;
  connections: boolean;
  opportunities: boolean;
  operator: boolean;
};

export function getMemberServiceFlags(environment: NodeJS.ProcessEnv = process.env): MemberServiceFlags {
  const enabled = environment.MEMBER_SERVICE_ENABLED === undefined
    ? environment.NODE_ENV !== "production"
    : isExplicitlyEnabled(environment.MEMBER_SERVICE_ENABLED);

  return {
    enabled,
    directory: enabled && (
      isExplicitlyEnabled(environment.MEMBER_SERVICE_DIRECTORY_ENABLED)
      || environment.MEMBER_SERVICE_DIRECTORY_ENABLED === undefined
    ),
    recommendation: enabled && isExplicitlyEnabled(environment.MEMBER_SERVICE_RECOMMENDATION_ENABLED),
    connections: enabled && isExplicitlyEnabled(environment.MEMBER_SERVICE_CONNECTIONS_ENABLED),
    opportunities: enabled && isExplicitlyEnabled(environment.MEMBER_SERVICE_OPPORTUNITIES_ENABLED),
    operator: enabled && isExplicitlyEnabled(environment.MEMBER_SERVICE_OPERATOR_ENABLED),
  };
}

export function isMemberServiceDirectoryEnabled() {
  return getMemberServiceFlags().directory;
}