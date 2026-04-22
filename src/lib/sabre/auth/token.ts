import { createHash } from 'node:crypto';
import { restBaseUrl } from '../config';
import { SabreAuthError } from '../errors';
import type { SabreCredentials, SabreTokenResponse } from '../types';

interface CacheEntry {
  token: string;
  expiresAt: number;
}

const REFRESH_SAFETY_MS = 5 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

const cacheKey = (creds: SabreCredentials): string =>
  createHash('sha256').update(`${creds.clientId}:${creds.env}`).digest('hex');

const fetchToken = async (creds: SabreCredentials): Promise<CacheEntry> => {
  const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
  const res = await fetch(`${restBaseUrl(creds.env)}/v3/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new SabreAuthError(
      `Token request failed (${res.status}): ${body.slice(0, 200)}`,
      res.status
    );
  }
  const data = (await res.json()) as SabreTokenResponse;
  return {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - REFRESH_SAFETY_MS
  };
};

export const getBearerToken = async (
  creds: SabreCredentials,
  { forceRefresh = false }: { forceRefresh?: boolean } = {}
): Promise<string> => {
  const key = cacheKey(creds);
  const existing = cache.get(key);
  if (!forceRefresh && existing && existing.expiresAt > Date.now()) {
    return existing.token;
  }
  const entry = await fetchToken(creds);
  cache.set(key, entry);
  return entry.token;
};

export const invalidateToken = (creds: SabreCredentials): void => {
  cache.delete(cacheKey(creds));
};

export const _resetTokenCacheForTest = (): void => {
  cache.clear();
};
