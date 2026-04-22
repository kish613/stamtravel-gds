import type { SabreOp } from './types';

export class SabreError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
    readonly correlationId?: string
  ) {
    super(message);
    this.name = 'SabreError';
  }
}

export class SabreAuthError extends SabreError {
  constructor(message: string, status?: number, correlationId?: string) {
    super(message, 'SABRE_AUTH', status, correlationId);
    this.name = 'SabreAuthError';
  }
}

export class CredentialMissingError extends SabreError {
  constructor(readonly op: SabreOp) {
    super(
      `Agency credentials required for operation '${op}'. Connect your Sabre account in Settings.`,
      'CRED_MISSING'
    );
    this.name = 'CredentialMissingError';
  }
}

export class SabreBookingError extends SabreError {
  constructor(message: string, status?: number, correlationId?: string) {
    super(message, 'SABRE_BOOKING', status, correlationId);
    this.name = 'SabreBookingError';
  }
}
