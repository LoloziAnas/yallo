import { strings } from '@/data/strings';

const placeholders = (s: string) => (s.match(/%[ns]|\[[^\]]+\]/g) ?? []).map((p) => p[0]).sort();

describe('strings', () => {
  const en = strings.en as Record<string, unknown>;

  it.each(['fr', 'ar'] as const)('%s has every English key', (lang) => {
    expect(Object.keys(strings[lang]).sort()).toEqual(Object.keys(en).sort());
  });

  it.each(['fr', 'ar'] as const)('%s keeps the same placeholders', (lang) => {
    const tr = strings[lang] as Record<string, unknown>;
    for (const [k, v] of Object.entries(en)) {
      if (typeof v !== 'string') continue;
      expect([k, placeholders(tr[k] as string)]).toEqual([k, placeholders(v)]);
    }
  });
});
