import type { PayMethod } from '@/data/catalog';
import type { Strings } from '@/data/strings';
import { clock, demoClock } from '@/store/derive';

/** Status names in timeline order (confirmed → delivered). */
export function statusLabels(t: Strings) {
  return [t.s0, t.s1, t.s2, t.s3, t.s4];
}

/** Label for a customer step; -1 is a cancelled order. */
export function stepLabel(step: number, t: Strings) {
  return step < 0 ? t.cancelledT : statusLabels(t)[step];
}

export function payLabel(pay: PayMethod, t: Strings) {
  return pay === 'cash' ? t.cash : 'Visa •••• 4821';
}

/** "Arrives around 18:52" on the shared demo clock (`nowT` = the API's state.t); device clock when offline. */
export function arriveAtText(etaMin: number, t: Strings, nowT?: number) {
  const at =
    nowT === undefined ? clock(Date.now() + etaMin * 60000) : demoClock(nowT + etaMin * 60);
  return `${t.arriveAround} ${at}`;
}
