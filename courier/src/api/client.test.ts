import { isUnreachable, whileWaking, within } from '@/api/client';

const unreachable = () => Promise.reject(new Error('Cannot reach the Yallo API'));

describe('a sleeping API', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('treats a request held past the deadline as unreachable', async () => {
    const held = within(new Promise(() => {}), 8000);
    jest.advanceTimersByTime(8000);
    await held.catch((e) => expect(isUnreachable(e)).toBe(true));
  });

  it('keeps trying while the host wakes, and says so once', async () => {
    let tries = 0;
    const onWaiting = jest.fn();
    const call = whileWaking(() => (++tries < 3 ? unreachable() : Promise.resolve('ok')), onWaiting);
    await jest.advanceTimersByTimeAsync(7000);
    await expect(call).resolves.toBe('ok');
    expect(tries).toBe(3);
    expect(onWaiting).toHaveBeenCalled();
  });

  it('passes refusals straight through', async () => {
    let tries = 0;
    const call = whileWaking(() => {
      tries++;
      return Promise.reject(new Error('Wrong code'));
    });
    await expect(call).rejects.toThrow('Wrong code');
    expect(tries).toBe(1);
  });

  it('gives up after the waiting window', async () => {
    const call = whileWaking(unreachable, undefined, 5000);
    const caught = call.catch((e) => e);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(isUnreachable(await caught)).toBe(true);
  });
});
