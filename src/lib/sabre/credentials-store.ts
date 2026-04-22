import { decryptJson, encryptJson, type EncryptedBlob } from './crypto';
import type { AgencyCredentialsPublic, SabreCredentials, SabreEnv } from './types';

export interface StoredAgencyCredentials {
  env: SabreEnv;
  pcc: string;
  epr?: string;
  password?: string;
  clientId: string;
  clientSecret: string;
  iata?: string;
  arc?: string;
  ndcCarriers: string[];
  verifiedAt?: string;
}

export interface KVAdapter {
  get(key: string): Promise<EncryptedBlob | null>;
  set(key: string, value: EncryptedBlob): Promise<void>;
  del(key: string): Promise<void>;
}

const kvKey = (orgId: string): string => `sabre:creds:${orgId}`;

let adapter: KVAdapter | null = null;

export const configureKV = (impl: KVAdapter): void => {
  adapter = impl;
};

const requireAdapter = (): KVAdapter => {
  if (!adapter) {
    throw new Error(
      'KV adapter not configured. Call configureKV() at app boot with a Vercel KV (or equivalent) implementation.'
    );
  }
  return adapter;
};

export const getAgencyCredentials = async (
  orgId: string
): Promise<StoredAgencyCredentials | null> => {
  const blob = await requireAdapter().get(kvKey(orgId));
  if (!blob) return null;
  return decryptJson<StoredAgencyCredentials>(blob);
};

export const putAgencyCredentials = async (
  orgId: string,
  creds: StoredAgencyCredentials
): Promise<void> => {
  await requireAdapter().set(kvKey(orgId), encryptJson(creds));
};

export const deleteAgencyCredentials = async (orgId: string): Promise<void> => {
  await requireAdapter().del(kvKey(orgId));
};

export const getAgencyCredentialsPublic = async (
  orgId: string
): Promise<AgencyCredentialsPublic | null> => {
  const c = await getAgencyCredentials(orgId);
  if (!c) return null;
  return {
    env: c.env,
    pcc: c.pcc,
    iata: c.iata,
    arc: c.arc,
    hasPassword: Boolean(c.password) || Boolean(c.clientSecret),
    ndcCarriers: c.ndcCarriers,
    verifiedAt: c.verifiedAt
  };
};

export const toSabreCredentials = (stored: StoredAgencyCredentials): SabreCredentials => ({
  env: stored.env,
  clientId: stored.clientId,
  clientSecret: stored.clientSecret,
  pcc: stored.pcc,
  epr: stored.epr,
  iata: stored.iata,
  arc: stored.arc,
  ndcCarriers: stored.ndcCarriers
});
