export interface SabreConfig {
  endpoint: string;
  username: string;
  password: string;
  pcc: string;
  domain: string;
}

export function getSabreConfig(): SabreConfig {
  const endpoint = process.env.SABRE_SOAP_ENDPOINT;
  const username = process.env.SABRE_USERNAME;
  const password = process.env.SABRE_PASSWORD;
  const pcc = process.env.SABRE_PCC;
  const domain = process.env.SABRE_DOMAIN || 'DEFAULT';

  if (!endpoint || !username || !password || !pcc) {
    throw new Error(
      'Missing Sabre config. Set SABRE_SOAP_ENDPOINT, SABRE_USERNAME, SABRE_PASSWORD, and SABRE_PCC in .env.local'
    );
  }

  return { endpoint, username, password, pcc, domain };
}

export function isLiveMode(): boolean {
  return process.env.API_MODE === 'live';
}
