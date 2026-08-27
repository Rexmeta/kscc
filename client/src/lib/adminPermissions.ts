export function enforceCreatePublishPermission(
  canPublish: boolean,
  requestedPublished: boolean,
): boolean {
  return canPublish && requestedPublished;
}