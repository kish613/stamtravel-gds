import { getBearerToken } from './auth/token';
import { getDevCredentials } from './config';
import { getAgencyCredentials, toSabreCredentials } from './credentials-store';
import { CredentialMissingError } from './errors';
import type { ResolvedCredentials, SabreOp } from './types';

const AGENCY_ONLY: ReadonlySet<SabreOp> = new Set<SabreOp>([
  'retrievePnr',
  'queueRead',
  'queueWrite',
  'bookAtpco',
  'bookNdc',
  'ticket',
  'void',
  'cancel',
  'sabreCommand',
  'seatMapByPnr'
]);

const DEV_FALLBACK_OK: ReadonlySet<SabreOp> = new Set<SabreOp>([
  'shop',
  'lookup',
  'priceCheck',
  'seatMapByOffer'
]);

export interface ResolveInput {
  op: SabreOp;
  orgId?: string;
}

export const resolveCredentials = async ({
  op,
  orgId
}: ResolveInput): Promise<ResolvedCredentials> => {
  if (orgId) {
    const stored = await getAgencyCredentials(orgId);
    if (stored) {
      const creds = toSabreCredentials(stored);
      const bearerToken = await getBearerToken(creds);
      return { pool: 'agency', creds, bearerToken };
    }
  }

  if (AGENCY_ONLY.has(op)) {
    throw new CredentialMissingError(op);
  }

  if (!DEV_FALLBACK_OK.has(op)) {
    throw new CredentialMissingError(op);
  }

  const dev = getDevCredentials();
  if (!dev) {
    throw new CredentialMissingError(op);
  }
  const bearerToken = await getBearerToken(dev);
  return { pool: 'dev', creds: dev, bearerToken };
};
