import { getBearerToken, invalidateToken } from '../auth/token';
import { restBaseUrl } from '../config';
import { SabreAuthError, SabreError } from '../errors';
import { logSabreCall } from '../telemetry';
import type { ResolvedCredentials, SabreOp } from '../types';
import { newCorrelationId } from './correlation';

export interface SabreRestCall<Req> {
  op: SabreOp;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Req;
  query?: Record<string, string | number | undefined>;
  orgId?: string;
}

const buildUrl = (
  base: string,
  path: string,
  query?: Record<string, string | number | undefined>
): string => {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, base);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
};

const doFetch = async <Req>(
  resolved: ResolvedCredentials,
  call: SabreRestCall<Req>,
  bearer: string,
  correlationId: string
): Promise<Response> => {
  const { env } = resolved.creds;
  const url = buildUrl(restBaseUrl(env), call.path, call.query);
  return fetch(url, {
    method: call.method ?? (call.body ? 'POST' : 'GET'),
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Conversation-Id': correlationId
    },
    body: call.body ? JSON.stringify(call.body) : undefined
  });
};

export const sabreRestCall = async <Res, Req = unknown>(
  resolved: ResolvedCredentials,
  call: SabreRestCall<Req>
): Promise<Res> => {
  const correlationId = newCorrelationId();
  const startedAt = Date.now();
  let bearer = resolved.bearerToken;

  let res = await doFetch(resolved, call, bearer, correlationId);
  if (res.status === 401) {
    invalidateToken(resolved.creds);
    bearer = await getBearerToken(resolved.creds, { forceRefresh: true });
    res = await doFetch(resolved, call, bearer, correlationId);
  }

  const durationMs = Date.now() - startedAt;

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const sabreCorrelationId =
      res.headers.get('conversation-id') ?? correlationId;
    logSabreCall({
      orgId: call.orgId,
      op: call.op,
      pool: resolved.pool,
      env: resolved.creds.env,
      durationMs,
      sabreCorrelationId,
      status: 'error',
      errorCode: `HTTP_${res.status}`
    });
    if (res.status === 401 || res.status === 403) {
      throw new SabreAuthError(
        `Sabre ${call.op} auth failed (${res.status}): ${text.slice(0, 200)}`,
        res.status,
        sabreCorrelationId
      );
    }
    throw new SabreError(
      `Sabre ${call.op} failed (${res.status}): ${text.slice(0, 300)}`,
      `HTTP_${res.status}`,
      res.status,
      sabreCorrelationId
    );
  }

  logSabreCall({
    orgId: call.orgId,
    op: call.op,
    pool: resolved.pool,
    env: resolved.creds.env,
    durationMs,
    sabreCorrelationId: res.headers.get('conversation-id') ?? correlationId,
    status: 'ok'
  });

  return (await res.json()) as Res;
};
