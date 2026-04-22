import type { EncryptedBlob } from '../crypto';
import type { KVAdapter } from '../credentials-store';

// Wire once @vercel/kv is installed:
//   import { kv } from '@vercel/kv';
//   configureKV(createVercelKV(kv));
// The adapter assumes the imported `kv` object exposes get/set/del
// matching @vercel/kv's signature.
interface VercelKVLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export const createVercelKV = (kv: VercelKVLike): KVAdapter => ({
  async get(key) {
    return kv.get<EncryptedBlob>(key);
  },
  async set(key, value) {
    await kv.set(key, value);
  },
  async del(key) {
    await kv.del(key);
  }
});
