import { expect, type APIRequestContext } from '@playwright/test';

const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

interface SearchResult {
  messages: { ID: string }[];
}

/** Waits for the latest email sent to `to` and returns the first link in its text body. */
export async function latestLinkSentTo(request: APIRequestContext, to: string): Promise<string> {
  let messageId: string | undefined;

  await expect
    .poll(async () => {
      const res = await request.get(`${MAILPIT_URL}/api/v1/search`, {
        params: { query: `to:"${to}"` },
      });
      messageId = ((await res.json()) as SearchResult).messages[0]?.ID;
      return messageId;
    })
    .toBeTruthy();

  const res = await request.get(`${MAILPIT_URL}/api/v1/message/${messageId ?? ''}`);
  const { Text } = (await res.json()) as { Text: string };
  const link = /https?:\/\/\S+/.exec(Text)?.[0];
  if (!link) throw new Error(`No link found in email to ${to}`);
  return link;
}
