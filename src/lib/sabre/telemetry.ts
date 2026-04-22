import type { CredentialPool, SabreEnv, SabreOp } from './types';

export interface SabreLogEvent {
  orgId?: string;
  op: SabreOp;
  pool: CredentialPool;
  env: SabreEnv;
  durationMs: number;
  sabreCorrelationId?: string;
  status: 'ok' | 'error';
  errorCode?: string;
}

export const logSabreCall = (event: SabreLogEvent): void => {
  console.log(
    JSON.stringify({
      tag: 'sabre',
      ...event,
      at: new Date().toISOString()
    })
  );
};
