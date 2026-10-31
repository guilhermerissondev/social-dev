import { usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/** Browser auth client. Requests go to /api/auth on the web origin, which proxies to the API. */
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});
