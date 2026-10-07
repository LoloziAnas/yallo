// Where the app finds the API: pinned (dev, e2e, :8090) or, for the public demo, from the address file that the
// shared client reads. The app's own part is remembering the last good address across launches.
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type ClientModule = typeof import('@/api/client');

const CONFIG = 'https://example.github.io/yallo/api.json';
const USER = { id: 'u1', role: 'customer', phone: '+212600000000' };

function load(env: Record<string, string>): ClientModule {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  let mod!: ClientModule;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@/api/client');
  });
  process.env = saved;
  return mod;
}

/** A fake network: the address file says `api`, and only `up` answers API calls. */
function network(opts: { api?: string; up?: string; fileDown?: boolean }) {
  const fetchMock = jest.fn((url: string) => {
    const json = (body: unknown, ok = true) =>
      Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) });
    if (url.startsWith(CONFIG))
      return opts.fileDown ? Promise.reject(new Error('offline')) : json({ api: opts.api });
    if (opts.up && url.startsWith(opts.up)) return json(USER);
    return Promise.reject(new Error('no route'));
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

beforeEach(() => AsyncStorage.clear());

describe('API address', () => {
  it('uses a pinned URL and never reads the address file', async () => {
    const fetchMock = network({ api: 'https://elsewhere.example', up: 'http://localhost:5190' });
    const c = load({
      EXPO_PUBLIC_API_URL: 'http://localhost:5190/',
      EXPO_PUBLIC_API_CONFIG_URL: CONFIG,
    });
    expect(c.getApiUrl()).toBe('http://localhost:5190');
    await c.api.me();
    expect(fetchMock.mock.calls.map((a) => a[0])).toEqual(['http://localhost:5190/api/auth/me']);
  });

  it('finds the demo API through the address file and remembers it', async () => {
    network({ api: 'https://abc.trycloudflare.com', up: 'https://abc.trycloudflare.com' });
    const c = load({ EXPO_PUBLIC_API_URL: '', EXPO_PUBLIC_API_CONFIG_URL: CONFIG });
    const seen: string[] = [];
    c.onApiUrlChange((u) => seen.push(u));
    await expect(c.api.me()).resolves.toEqual(USER);
    expect(c.getApiUrl()).toBe('https://abc.trycloudflare.com');
    expect(seen).toEqual(['https://abc.trycloudflare.com']);
    expect(await AsyncStorage.getItem('yallo-api-url')).toBe('https://abc.trycloudflare.com');
  });

  it('falls back to the last good address when the file is unreachable on a cold start', async () => {
    await AsyncStorage.setItem('yallo-api-url', 'https://cached.trycloudflare.com');
    network({ fileDown: true, up: 'https://cached.trycloudflare.com' });
    const c = load({ EXPO_PUBLIC_API_URL: '', EXPO_PUBLIC_API_CONFIG_URL: CONFIG });
    c.api.setToken('tok');
    await c.restoreApiUrl();
    expect(c.getApiUrl()).toBe('https://cached.trycloudflare.com');
    expect(c.api.token).toBe('tok');
    await expect(c.api.me()).resolves.toEqual(USER);
  });
});
