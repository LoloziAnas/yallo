import { strings } from '@/data/strings';
import { cancelledText } from '@/screens/tracking/order-text';

const t = strings.en;

describe('cancelledText', () => {
  it("gives the store's reason when it turned the order down", () => {
    expect(
      cancelledText(
        t,
        { cancelledBy: 'merchant', rejectReason: 'Out of chicken today.' },
        'Dar Zitoun',
      ),
    ).toBe('Dar Zitoun couldn’t take your order: Out of chicken today. You haven’t been charged.');
    expect(cancelledText(t, { cancelledBy: 'merchant' }, 'Dar Zitoun')).toBe(
      'Dar Zitoun couldn’t take your order. You haven’t been charged.',
    );
  });

  it('keeps the general message for other cancellations', () => {
    expect(cancelledText(t, { cancelledBy: 'ops' }, 'Dar Zitoun')).toBe(t.cancelledB);
    expect(cancelledText(t, undefined, 'Dar Zitoun')).toBe(t.cancelledB);
  });
});
