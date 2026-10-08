// The new-order alarm: a loud two-tone chime and a vibration, repeated until every new order is
// accepted or turned down. Browsers only allow sound after the user has touched the page, so the app
// asks for one tap ("Turn on order alerts") and unlocks the audio then. Also keeps the screen awake while
// the store is open, so a tablet on the counter doesn't sleep through orders.

const REPEAT_MS = 2500;

let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let listeners = new Set<() => void>();

/** True once audio is unlocked (after a tap on the page). */
export function alarmReady() {
  return !!ctx && ctx.state === 'running';
}

/** Call from a click/tap handler. Returns whether sound is now available. */
export function unlockAlarm(): boolean {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume().then(notify);
    // A silent blip finishes unlocking on iOS.
    tone(ctx, 440, ctx.currentTime, 0.01, 0.0001);
    notify();
    return true;
  } catch {
    return false;
  }
}

export function onAlarmReady(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  for (const fn of listeners) fn();
}

function tone(c: AudioContext, freq: number, at: number, dur: number, peak = 0.9) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** One ring: "ding-dong" twice, plus a buzz on phones and tablets that vibrate. */
function ring() {
  if (ctx && ctx.state === 'running') {
    const t = ctx.currentTime;
    for (const [i, f] of [988, 784, 988, 784].entries()) tone(ctx, f, t + i * 0.22, 0.2);
  }
  // Browsers refuse (and log) vibration before the first tap on the page.
  const activated = (navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
  try {
    if (activated !== false) navigator.vibrate?.([300, 150, 300]);
  } catch {
    // Not supported.
  }
}

/** Starts or stops the repeating alarm. Idempotent. */
export function setAlarm(on: boolean) {
  if (on && !timer) {
    ring();
    timer = setInterval(ring, REPEAT_MS);
  } else if (!on && timer) {
    clearInterval(timer);
    timer = undefined;
    try {
      if ((navigator as unknown as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive !== false) navigator.vibrate?.(0);
    } catch {
      // Not supported.
    }
  }
}

/* ---------------- Screen wake lock ---------------- */

type WakeLock = { release(): Promise<void> };
let lock: WakeLock | null = null;
let wantAwake = false;

async function acquire() {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<WakeLock> } }).wakeLock;
    if (wl && !lock && document.visibilityState === 'visible') lock = await wl.request('screen');
  } catch {
    lock = null;
  }
}

if (typeof document !== 'undefined') {
  // The lock is dropped whenever the page is hidden; take it again when it comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wantAwake) {
      lock = null;
      void acquire();
    }
  });
}

export function keepAwake(on: boolean) {
  wantAwake = on;
  if (on) void acquire();
  else if (lock) {
    void lock.release().catch(() => {});
    lock = null;
  }
}

/** For tests. */
export function resetAlarmForTests() {
  setAlarm(false);
  ctx = null;
  listeners = new Set();
}
