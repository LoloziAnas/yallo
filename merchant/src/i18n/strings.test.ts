import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { REJECT_REASONS } from '@/api/types';

import { STRINGS, translate } from './strings';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(f) && !f.endsWith('.test.ts') ? [p] : [];
  });
}

describe('strings', () => {
  it('has French and Arabic for every text the screens show', () => {
    const src = sources(join(__dirname, '..'));
    const keys = new Set<string>(REJECT_REASONS);
    for (const file of src) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\btr?\(\s*'((?:[^'\\]|\\.)+)'/g)) keys.add(m[1].replace(/\\'/g, "'"));
      for (const m of text.matchAll(/\btr?\(\s*"([^"]+)"/g)) keys.add(m[1]);
    }
    const missing = [...keys].filter((k) => !STRINGS[k]);
    expect(missing).toEqual([]);
    expect(keys.size).toBeGreaterThan(40);
  });

  it('fills placeholders', () => {
    expect(translate('fr', 'Ready in {min} min', { min: 7 })).toBe('Prête dans 7 min');
    expect(translate('ar', 'Order {id}', { id: '#48301' })).toBe('الطلب #48301');
    expect(translate('en', 'Not translated')).toBe('Not translated');
  });
});
