import 'server-only';
import { createAuthServer } from '@neondatabase/auth/next/server';

type AuthServer = ReturnType<typeof createAuthServer>;

let instance: AuthServer | null = null;

const getAuthServer = (): AuthServer => {
  if (!instance) instance = createAuthServer();
  return instance;
};

export const authServer = new Proxy({} as AuthServer, {
  get(_target, prop) {
    const server = getAuthServer() as unknown as Record<PropertyKey, unknown>;
    return server[prop];
  }
});
