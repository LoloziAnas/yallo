import { makeT } from '@/data/i18n';

describe('translation', () => {
  it('leaves English as is', () => {
    expect(makeT('EN')('Log in')).toBe('Log in');
  });

  it('translates exact phrases to French and Arabic', () => {
    expect(makeT('FR')('Log in')).toBe('Se connecter');
    expect(makeT('ع')('Log in')).toBe('تسجيل الدخول');
  });

  it('fills patterns and translates their parts', () => {
    expect(makeT('FR')('Order #1284')).toBe('Commande #1284');
    expect(makeT('FR')('12 DH base + 2.8 km × 3 DH')).toBe('12 DH de base + 2.8 km × 3 DH');
    expect(makeT('ع')('Scheduled for 19:30')).toBe('مجدولة لـ 19:30');
  });

  it('passes unknown text and numbers through', () => {
    expect(makeT('FR')('Tajine kefta')).toBe('Tajine kefta');
    expect(makeT('FR')('#48213')).toBe('#48213');
  });
});
