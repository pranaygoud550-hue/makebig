export function isProjectOwner(userContact?: string, ownerContact?: string): boolean {
  if (!userContact || !ownerContact) return false;
  return userContact.trim().toLowerCase() === ownerContact.trim().toLowerCase();
}
