// Push notifications through the Expo push service. Off by default: in 'log' mode messages are only logged, so
// tests and shared dev servers never call out. Every failure is logged and swallowed.

export type PushMessage = { to: string; title: string; body: string; data?: Record<string, unknown> };
export type PushSender = (messages: PushMessage[]) => Promise<void>;

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * @param mode 'expo' sends for real (PUSH=expo); 'log' prints what would be sent.
 * @param accessToken optional Expo access token (EXPO_ACCESS_TOKEN), for projects with enhanced push security.
 */
export function createPush(mode: 'log' | 'expo' = 'log', accessToken?: string): PushSender {
  if (mode !== 'expo') {
    return async messages => {
      for (const m of messages) console.log(`[push] (log only) to ${m.to.slice(0, 26)}…: ${m.title} · ${m.body}`);
    };
  }
  return async messages => {
    if (!messages.length) return;
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', ...(accessToken ? { authorization: 'Bearer ' + accessToken } : {}) },
        body: JSON.stringify(messages),
      });
      if (!res.ok) console.warn(`[push] Expo answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    } catch (e) {
      console.warn('[push] could not reach the Expo push service:', (e as Error).message);
    }
  };
}
