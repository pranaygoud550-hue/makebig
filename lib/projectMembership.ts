import { isProjectOwner } from './projectOwnership';

export type ViewerProjectRelation = 'owner' | 'joined' | 'pending' | 'none';

export function normalizeMembershipContact(contact?: string): string {
  return (contact || '').trim().toLowerCase();
}

type MembershipProject = {
  ownerContact?: string;
  teamMembers?: { contact?: string; status?: string }[];
};

export function getViewerProjectRelation(
  viewerContact: string | undefined,
  project: MembershipProject
): ViewerProjectRelation {
  if (!viewerContact) return 'none';
  if (isProjectOwner(viewerContact, project.ownerContact)) return 'owner';

  const viewer = normalizeMembershipContact(viewerContact);
  for (const member of project.teamMembers || []) {
    if (normalizeMembershipContact(member.contact) !== viewer) continue;
    if (member.status === 'joined') return 'joined';
    if (member.status === 'pending') return 'pending';
  }

  return 'none';
}

/** Hide from discover feeds — user already owns or is on the team. */
export function shouldHideFromExploreFeed(relation: ViewerProjectRelation): boolean {
  return relation === 'owner' || relation === 'joined';
}
