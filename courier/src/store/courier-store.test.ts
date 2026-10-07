import { DEMO_ORDER } from '@/data/order-view';
import { arrive, availability, orderStatus, totals, useCourier } from '@/store/courier-store';

const s = () => useCourier.getState();

beforeEach(() => useCourier.setState(useCourier.getInitialState(), true));

describe('shared status mapping', () => {
  it('maps UI phases to the shared order lifecycle', () => {
    expect(orderStatus('request')).toBeNull();
    expect(orderStatus('toPickup')).toBe('picking');
    expect(orderStatus('atPickup')).toBe('picking');
    expect(orderStatus('toCustomer')).toBe('delivering');
    expect(orderStatus('confirm')).toBe('delivering');
    expect(orderStatus('done')).toBe('delivered');
  });

  it('maps availability', () => {
    expect(availability(false, null)).toBe('off');
    expect(availability(true, null)).toBe('idle');
    expect(availability(true, 'atCustomer')).toBe('busy');
  });
});

describe('demo dispatch', () => {
  it('offers a request a few seconds after going online, then lets it expire', () => {
    useCourier.setState({ signedIn: true, online: true, requestSeconds: 5 });
    for (let i = 0; i < 36; i++) s().tick();
    expect(s().phase).toBe('request');
    // The request appears on tick 35 (3.5 s), so one countdown step has already run.
    expect(s().count).toBeGreaterThan(4.8);
    expect(s().countTotal).toBe(5);
    for (let i = 0; i < 51; i++) s().tick();
    expect(s().phase).toBeNull();
    expect(s().toast?.text).toBe('Request expired');
  });

  it('holds requests while a bottom sheet is open', () => {
    useCourier.setState({ signedIn: true, online: true, sheetOpen: true });
    for (let i = 0; i < 50; i++) s().tick();
    expect(s().phase).toBeNull();
  });

  it('accepts into the store leg', () => {
    useCourier.setState({ phase: 'request' });
    s().accept();
    expect(s().phase).toBe('toPickup');
  });
});

describe('earnings', () => {
  it('completing a delivery adds pay, tip, a history entry and challenge progress', () => {
    const before = s();
    useCourier.setState({ phase: 'confirm', order: DEMO_ORDER });
    s().complete();
    expect(s().phase).toBe('done');
    expect(s().balance).toBe(before.balance + DEMO_ORDER.earn);
    expect(s().today.dels).toBe(before.today.dels + 1);
    expect(s().today.tips).toBe(before.today.tips + DEMO_ORDER.tip);
    expect(s().challenge).toBe(before.challenge + 1);
    expect(s().history[0].id).toBe(DEMO_ORDER.id);
  });

  it('an order ended early credits the compensation and leaves the job', () => {
    const before = s().balance;
    useCourier.setState({ phase: 'atPickup' });
    s().endOrder(10, '+10 DH trip compensation added', 'Restaurant closed on arrival');
    expect(s().phase).toBeNull();
    expect(s().balance).toBe(before + 10);
    expect(s().today.adj).toBe(10);
  });

  it('totals include the daily bonus and adjustments', () => {
    const t = totals({ earn: 0, dels: 7, fees: 180, tips: 5.5, adj: 10 });
    expect(t.today).toBe(220.5);
    expect(t.week).toBe(1174 + 220.5);
  });
});

describe('arrival', () => {
  it('arrives at the store, then at the customer', () => {
    expect(arrive({ phase: 'toPickup', order: DEMO_ORDER }).phase).toBe('atPickup');
    expect(arrive({ phase: 'toCustomer', order: DEMO_ORDER }).phase).toBe('atCustomer');
  });
});
