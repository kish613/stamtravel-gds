import 'server-only';
import { authServer } from './server';

export class NotAuthenticatedError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'NotAuthenticatedError';
  }
}

export class NoOrganizationError extends Error {
  constructor() {
    super('User has no organization. Create or accept an invitation first.');
    this.name = 'NoOrganizationError';
  }
}

export const requireUserId = async (): Promise<string> => {
  const { data: session } = await authServer.getSession();
  if (!session?.user?.id) throw new NotAuthenticatedError();
  return session.user.id;
};

export const getActiveOrgId = async (): Promise<string | null> => {
  const { data: org } = await authServer.organization.getFullOrganization();
  if (org?.id) return org.id;
  const { data: list } = await authServer.organization.list();
  return list?.[0]?.id ?? null;
};

export const requireActiveOrgId = async (): Promise<string> => {
  await requireUserId();
  const orgId = await getActiveOrgId();
  if (!orgId) throw new NoOrganizationError();
  return orgId;
};

export const requireOrgAdmin = async (): Promise<string> => {
  const orgId = await requireActiveOrgId();
  const { data: role } = await authServer.organization.getActiveMemberRole();
  const roleStr = typeof role === 'string' ? role : (role as { role?: string } | null)?.role;
  if (roleStr !== 'admin' && roleStr !== 'owner') {
    throw new Error('Org admin role required for this action');
  }
  return orgId;
};
