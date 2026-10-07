import { fullPhone } from '@/api/session';

describe('phone numbers', () => {
  it('turns what couriers type into the international format', () => {
    expect(fullPhone('6 61 23 45 78')).toBe('+212661234578');
    expect(fullPhone('0661234578')).toBe('+212661234578');
    expect(fullPhone('+212 661-23-45-78')).toBe('+212661234578');
    expect(fullPhone('212661234578')).toBe('+212661234578');
  });
});
