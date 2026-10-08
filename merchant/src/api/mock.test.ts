import { describe, expect, it } from 'vitest';

import { MockMerchantBackend } from './mock';

const seeded = () => {
  let n = 0;
  // A fixed sequence, so the simulated orders are the same every run.
  const backend = new MockMerchantBackend({ autoTick: false, firstOrderSec: 2, everySec: 60, random: () => ((n = (n * 9301 + 49297) % 233280) / 233280) });
  return backend;
};

describe('mock backend', () => {
  it('signs a store’s staff in to that store', async () => {
    const b = seeded();
    await expect(b.verifyOtp('+212600001102', '000000')).rejects.toThrow('Wrong code');
    const { user } = await b.verifyOtp('0600001102', '123456');
    expect(user).toMatchObject({ role: 'merchant', merchantId: 'm2' });
    expect(b.snapshot().merchants[0].id).toBe('m2');
  });

  it('brings new orders, and refuses what the API refuses', async () => {
    const b = seeded();
    b.tick(3);
    const fresh = b.snapshot().orders.find((o) => o.status === 'pending')!;
    expect(fresh).toBeTruthy();
    await expect(b.markReady(fresh.id)).rejects.toThrow();
    await expect(b.rejectOrder(fresh.id, '  ')).rejects.toThrow('Give a reason');
    const s = (await b.acceptOrder(fresh.id, 15)) as ReturnType<typeof b.snapshot>;
    const accepted = s.orders.find((o) => o.id === fresh.id)!;
    expect(accepted).toMatchObject({ status: 'preparing', prepMin: 15, readyBy: s.t + 900 });
    await expect(b.acceptOrder(fresh.id, 15)).rejects.toThrow('already handled');
  });

  it('sends a courier, who collects once the order is ready', async () => {
    const b = seeded();
    b.tick(3);
    const id = b.snapshot().orders.find((o) => o.status === 'pending')!.id;
    await b.acceptOrder(id, 10);
    b.tick(30);
    expect(b.snapshot().orders.find((o) => o.id === id)!.courierId).toBeTruthy();
    await b.markReady(id);
    expect(b.snapshot().orders.find((o) => o.id === id)!.status).toBe('picking');
    b.tick(600);
    expect(['delivering', 'delivered']).toContain(b.snapshot().orders.find((o) => o.id === id)!.status);
  });

  it('rejects with a reason, pauses, and switches stock', async () => {
    const b = seeded();
    b.tick(3);
    const id = b.snapshot().orders.find((o) => o.status === 'pending')!.id;
    await b.rejectOrder(id, 'Too busy right now');
    expect(b.snapshot().orders.find((o) => o.id === id)).toMatchObject({ status: 'cancelled', cancelledBy: 'merchant', rejectReason: 'Too busy right now' });
    await b.setMerchantOpen('m1', false);
    const before = b.snapshot().orders.length;
    b.tick(400);
    expect(b.snapshot().orders.length).toBe(before);
    await b.setProductAvailable('p1-1', false);
    expect(b.snapshot().catalog!.products.find((p) => p.id === 'p1-1')!.available).toBe(false);
    await expect(b.setProductAvailable('p2-1', false)).rejects.toThrow('Not on your menu');
  });
});
