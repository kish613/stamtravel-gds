import type { SabreCredentials, SabreEnv } from './types';

const REST_URLS: Record<SabreEnv, string> = {
  CERT: 'https://api.cert.platform.sabre.com',
  PROD: 'https://api.platform.sabre.com'
};

const SOAP_URLS: Record<SabreEnv, string> = {
  CERT: 'https://webservices.cert.platform.sabre.com',
  PROD: 'https://webservices.platform.sabre.com'
};

export const restBaseUrl = (env: SabreEnv): string => REST_URLS[env];
export const soapBaseUrl = (env: SabreEnv): string => SOAP_URLS[env];

const requireEnv = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};

export const getEncryptionKey = (): Buffer => {
  const raw = requireEnv('CREDENTIAL_ENCRYPTION_KEY');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must decode to 32 bytes (base64)');
  }
  return key;
};

export const getDevCredentials = (): SabreCredentials | null => {
  const clientId = process.env.SABRE_DEV_CLIENT_ID;
  const clientSecret = process.env.SABRE_DEV_CLIENT_SECRET;
  const pcc = process.env.SABRE_DEV_PCC;
  const env = (process.env.SABRE_DEV_ENV as SabreEnv | undefined) ?? 'CERT';
  if (!clientId || !clientSecret || !pcc) return null;
  return { env, clientId, clientSecret, pcc };
};
