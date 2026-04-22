export type SabreEnv = 'CERT' | 'PROD';

export type CredentialPool = 'dev' | 'agency';

export type SabreOp =
  | 'shop'
  | 'lookup'
  | 'priceCheck'
  | 'seatMapByOffer'
  | 'retrievePnr'
  | 'queueRead'
  | 'queueWrite'
  | 'bookAtpco'
  | 'bookNdc'
  | 'ticket'
  | 'void'
  | 'cancel'
  | 'sabreCommand'
  | 'seatMapByPnr';

export interface SabreCredentials {
  env: SabreEnv;
  clientId: string;
  clientSecret: string;
  pcc: string;
  epr?: string;
  iata?: string;
  arc?: string;
  ndcCarriers?: string[];
}

export interface AgencyCredentialsPublic {
  env: SabreEnv;
  pcc: string;
  iata?: string;
  arc?: string;
  hasPassword: boolean;
  ndcCarriers: string[];
  verifiedAt?: string;
}

export interface ResolvedCredentials {
  pool: CredentialPool;
  creds: SabreCredentials;
  bearerToken: string;
}

export interface SabreTokenResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}
