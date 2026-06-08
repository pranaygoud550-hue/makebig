import { normalizeContact } from "./helpers.js";

export function getViewerProjectRelation(viewerContact, project) {
  if (!viewerContact) return "none";
  const viewer = normalizeContact(viewerContact);
  if (viewer && project?.ownerContact && normalizeContact(project.ownerContact) === viewer) {
    return "owner";
  }

  for (const member of project?.teamMembers || []) {
    if (normalizeContact(member.contact) !== viewer) continue;
    if (member.status === "joined") return "joined";
    if (member.status === "pending") return "pending";
  }

  return "none";
}

export function shouldHideFromExploreFeed(relation) {
  return relation === "owner" || relation === "joined";
}
