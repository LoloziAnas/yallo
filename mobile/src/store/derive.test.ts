import { type LiveState, MERCHANTS } from '@yallo/shared';

import { lineKey } from '@/data/catalog';
import { customerStep, fmt, riderNames, storeState, totals } from '@/store/derive';

const line = (pid: string, unit: number, qty: number) => ({
  key: lineKey(pid, {}),
  pid,
  sel: {},
  qty,
  unit,
});

describe('fmt', () => {
  it('prints whole dirhams plainly and cents with a comma', () => {
    expect(fmt(85)).toBe('85 DH');
    expect(fmt(19.6)).toBe('19,60 DH');
  });
});

describe('totals', () => {
  const cart = { storeId: 'm1', lines: [line('p1-1', 85, 2)] };

  it('adds the store fee and the service fee', () => {
    const tt = totals(cart, null);
    expect(tt.sub).toBe(170);
    expect(tt.count).toBe(2);
    expect(tt.total).toBe(tt.sub + tt.fee + tt.service);
    expect(tt.service).toBeGreaterThan(0);
  });

  it('MARHABA takes 30 % off the items, at most 40 DH', () => {
    expect(totals(cart, 'MARHABA').disc).toBe(40);
    const small = { storeId: 'm1', lines: [line('p1-1', 50, 1)] };
    expect(totals(small, 'MARHABA').disc).toBe(15);
  });

  it('LIVRAISON makes delivery free', () => {
    expect(totals(cart, 'LIVRAISON').fee).toBe(0);
  });

  it('is empty for an empty cart', () => {
    expect(totals({ storeId: null, lines: [] }, null).total).toBe(0);
  });
});

describe('customerStep', () => {
  it('maps API statuses to the five tracking steps', () => {
    expect(customerStep('pending')).toBe(0);
    expect(customerStep('preparing')).toBe(1);
    expect(customerStep('ready')).toBe(1);
    expect(customerStep('picking')).toBe(1);
    expect(customerStep('delivering')).toBe(3);
    expect(customerStep('delivered')).toBe(4);
    expect(customerStep('cancelled')).toBe(-1);
  });
});

describe('riderNames', () => {
  it('shortens to first name and last initial', () => {
    expect(riderNames('Hamza Rami')).toEqual({ first: 'Hamza', short: 'Hamza R.', initials: 'HR' });
    expect(riderNames('Hamza')).toEqual({ first: 'Hamza', short: 'Hamza', initials: 'H' });
  });
});

describe('storeState', () => {
  const live = (open: boolean) =>
    ({ t: 0, merchants: MERCHANTS.map((m) => ({ ...m, open })) }) as unknown as LiveState;

  it('treats stores as open before live data arrives', () => {
    expect(storeState('m1', null)).toBe('open');
  });

  it('reports stores paused by ops', () => {
    expect(storeState('m1', live(false))).toBe('paused');
  });
});
