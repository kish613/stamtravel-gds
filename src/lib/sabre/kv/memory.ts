import type { EncryptedBlob } from '../crypto';
import type { KVAdapter } from '../credentials-store';

export const createMemoryKV = (): KVAdapter => {
  const store = new Map<string, EncryptedBlob>();
  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async del(key) {
      store.delete(key);
    }
  };
};
