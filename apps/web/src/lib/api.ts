import 'server-only';

import { cookies } from 'next/headers';

const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

/** Server-side fetch to the API, forwarding the visitor's cookies. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookieHeader = (await cookies()).toString();
  if (cookieHeader) headers.set('cookie', cookieHeader);

  return fetch(`${apiUrl}${path}`, { ...init, cache: 'no-store', headers });
}
