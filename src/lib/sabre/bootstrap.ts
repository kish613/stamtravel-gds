import 'server-only';
import { kv } from '@vercel/kv';
import { configureKV } from './credentials-store';
import { createVercelKV } from './kv/vercel';

let configured = false;

export const ensureSabreBootstrapped = (): void => {
  if (configured) return;
  configureKV(createVercelKV(kv));
  configured = true;
};
