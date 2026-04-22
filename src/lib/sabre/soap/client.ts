import { soapBaseUrl } from '../config';
import { SabreError } from '../errors';
import { logSabreCall } from '../telemetry';
import type { ResolvedCredentials, SabreOp } from '../types';
import { newCorrelationId } from '../http/correlation';

export interface SabreSoapCall {
  op: SabreOp;
  service: string;
  action: string;
  bodyXml: string;
  orgId?: string;
}

const xmlEscape = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) =>
    c === '<'
      ? '&lt;'
      : c === '>'
        ? '&gt;'
        : c === '&'
          ? '&amp;'
          : c === "'"
            ? '&apos;'
            : '&quot;'
  );

const buildEnvelope = (
  resolved: ResolvedCredentials,
  call: SabreSoapCall,
  correlationId: string
): string => {
  const { creds, bearerToken } = resolved;
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Header>
    <eb:MessageHeader xmlns:eb="http://www.ebxml.org/namespaces/messageHeader">
      <eb:ConversationId>${xmlEscape(correlationId)}</eb:ConversationId>
      <eb:Action>${xmlEscape(call.action)}</eb:Action>
      <eb:Service>${xmlEscape(call.service)}</eb:Service>
    </eb:MessageHeader>
    <wsse:Security xmlns:wsse="http://schemas.xmlsoap.org/ws/2002/12/secext">
      <wsse:BinarySecurityToken>${xmlEscape(bearerToken)}</wsse:BinarySecurityToken>
    </wsse:Security>
    <PCC xmlns="http://webservices.sabre.com/pnrbuilder/v1_19">${xmlEscape(creds.pcc)}</PCC>
  </soap-env:Header>
  <soap-env:Body>${call.bodyXml}</soap-env:Body>
</soap-env:Envelope>`;
};

export const sabreSoapCall = async (
  resolved: ResolvedCredentials,
  call: SabreSoapCall
): Promise<string> => {
  const correlationId = newCorrelationId();
  const startedAt = Date.now();
  const envelope = buildEnvelope(resolved, call, correlationId);

  const res = await fetch(soapBaseUrl(resolved.creds.env), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: call.action
    },
    body: envelope
  });

  const text = await res.text();
  const durationMs = Date.now() - startedAt;

  if (!res.ok) {
    logSabreCall({
      orgId: call.orgId,
      op: call.op,
      pool: resolved.pool,
      env: resolved.creds.env,
      durationMs,
      sabreCorrelationId: correlationId,
      status: 'error',
      errorCode: `SOAP_${res.status}`
    });
    throw new SabreError(
      `Sabre SOAP ${call.action} failed (${res.status}): ${text.slice(0, 300)}`,
      `SOAP_${res.status}`,
      res.status,
      correlationId
    );
  }

  logSabreCall({
    orgId: call.orgId,
    op: call.op,
    pool: resolved.pool,
    env: resolved.creds.env,
    durationMs,
    sabreCorrelationId: correlationId,
    status: 'ok'
  });

  return text;
};
