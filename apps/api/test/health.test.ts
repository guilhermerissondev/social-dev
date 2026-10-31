import { afterAll, describe, expect, inject, it } from 'vitest';

import { buildTestApp } from './helpers.ts';

describe('GET /health', () => {
  const healthy = buildTestApp(inject('databaseUrl'));
  const broken = buildTestApp('postgres://nobody:nothing@127.0.0.1:1/missing');

  afterAll(async () => {
    await Promise.all([healthy.close(), broken.close()]);
  });

  it('reports ok when the database is reachable', async () => {
    const res = await healthy.app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', checks: { database: 'up' } });
  });

  it('reports degraded when the database is unreachable', async () => {
    const res = await broken.app.request('/health');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'degraded', checks: { database: 'down' } });
  });
});

describe('API conventions', () => {
  const { app, close } = buildTestApp(inject('databaseUrl'));

  afterAll(close);

  it('returns a JSON error for unknown routes', async () => {
    const res = await app.request('/does-not-exist');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: 'not_found', message: 'Route not found' } });
  });

  it('attaches a request id to every response', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('publishes an OpenAPI document', async () => {
    const res = await app.request('/openapi.json');
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.paths).toHaveProperty('/health');
  });
});
