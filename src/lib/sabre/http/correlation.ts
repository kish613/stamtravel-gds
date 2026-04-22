import { randomUUID } from 'node:crypto';

export const newCorrelationId = (): string => `stg-${randomUUID()}`;
