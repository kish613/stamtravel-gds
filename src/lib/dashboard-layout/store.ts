import 'server-only';
import { kv } from '@vercel/kv';
import { LAYOUT_VERSION, mergeWithDefaults, type Layouts, type PersistedLayout } from './index';

const kvKey = (userId: string): string => `user:dashboard-layout:${userId}`;

interface KVLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

let backend: KVLike | null = null;

const memoryBackend = (): KVLike => {
  const store = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return (store.get(key) as T | undefined) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async del(key) {
      store.delete(key);
    }
  };
};

const getBackend = (): KVLike => {
  if (backend) return backend;
  const hasVercelKv =
    typeof process !== 'undefined' &&
    Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  backend = hasVercelKv ? (kv as unknown as KVLike) : memoryBackend();
  return backend;
};

export const getDashboardLayout = async (userId: string): Promise<PersistedLayout | null> => {
  const raw = await getBackend().get<PersistedLayout>(kvKey(userId));
  if (!raw) return null;
  return {
    version: LAYOUT_VERSION,
    layouts: mergeWithDefaults(raw.layouts)
  };
};

export const putDashboardLayout = async (userId: string, layouts: Layouts): Promise<void> => {
  const value: PersistedLayout = { version: LAYOUT_VERSION, layouts };
  await getBackend().set(kvKey(userId), value);
};

export const deleteDashboardLayout = async (userId: string): Promise<void> => {
  await getBackend().del(kvKey(userId));
};
