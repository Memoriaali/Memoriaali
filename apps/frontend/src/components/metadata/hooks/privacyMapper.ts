export function mapPrivacy(
  publicChecked: boolean | undefined,
  group: boolean | undefined,
  restricted: boolean | undefined,
): 'PUBLIC' | 'PRIVATE' | 'GROUP' | 'RESEARCH_ONLY' {
  if (publicChecked) {
    return 'PUBLIC';
  }
  if (group) {
    return 'GROUP';
  }
  if (restricted) {
    return 'PRIVATE';
  }
  return 'PRIVATE';
}
