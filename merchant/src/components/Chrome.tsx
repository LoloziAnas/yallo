// The frame around every screen: header (store, open/paused, navigation, clock, language), the
// new-order alarm banner, connection and pause banners, the alerts unlock prompt, and toasts.
import { clockAt, type Merchant } from '@yallo/shared';
import { useEffect, useState } from 'react';

import type { MerchantOrder } from '@/api/types';
import { LANGS, type Lang } from '@/i18n/strings';
import { alarmReady, onAlarmReady, unlockAlarm } from '@/lib/alarm';
import { initials } from '@/lib/format';
import { signOut } from '@/store/session';
import { useStore, useT, type Screen } from '@/store/store';

import { Icon } from './Icon';

export function Header({ store, newCount, outOfStock }: { store: Merchant | undefined; newCount: number; outOfStock: number }) {
  const tr = useT();
  const screen = useStore((s) => s.screen);
  const set = useStore((s) => s.set);
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const t = useStore((s) => s.live?.t);
  const [askPause, setAskPause] = useState(false);
  const setOpen = useStore((s) => s.setOpen);
  const busy = useStore((s) => !!s.busy.store);
  const connected = useStore((s) => s.connected);
  const open = store?.open !== false;

  const tabs: { key: Screen; label: string; icon: 'list' | 'chart' | 'store'; badge?: number }[] = [
    { key: 'orders', label: tr('Orders'), icon: 'list', badge: newCount },
    { key: 'today', label: tr('Today'), icon: 'chart' },
    { key: 'menu', label: tr('Menu'), icon: 'store', badge: outOfStock || undefined },
  ];

  return (
    <header className="header">
      <div className="brand">
        <div className="avatar" aria-hidden="true">
          {initials(store?.name ?? 'Yallo')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="brand-name">{store?.name ?? '…'}</div>
          <button
            type="button"
            className={`store-state ${open ? '' : 'paused'}`}
            disabled={busy || !connected || !store}
            onClick={() => (open ? setAskPause(true) : void setOpen(true))}
            title={tr(open ? 'Pause orders' : 'Resume orders')}>
            <span className="dot" />
            {tr(open ? 'Open · taking orders' : 'Paused · no new orders')}
            <Icon name={open ? 'pause' : 'play'} size={14} />
          </button>
        </div>
      </div>

      <nav className="nav seg" aria-label="Sections">
        {tabs.map((tab) => (
          <label key={tab.key} className="seg-opt">
            <input type="radio" name="screen" checked={screen === tab.key} onChange={() => set({ screen: tab.key })} />
            <Icon name={tab.icon} size={16} />
            {tab.label}
            {tab.badge ? <span className="badge num">{tab.badge}</span> : null}
          </label>
        ))}
      </nav>

      <div className="header-tools">
        {t != null && <span className="clock num">{clockAt(t)}</span>}
        <select
          className="input lang-select"
          aria-label={tr('Language')}
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGS.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </select>
        <button type="button" className="icon-btn" aria-label={tr('Sign out')} title={tr('Sign out')} onClick={() => void signOut()}>
          <Icon name="logout" />
        </button>
      </div>

      {askPause && (
        <>
          <div className="scrim" onClick={() => setAskPause(false)} />
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pause-title">
            <h3 id="pause-title">{tr('Pause new orders?')}</h3>
            <p className="muted">{tr('Customers will see the store as closed. Orders in progress are not affected.')}</p>
            <div className="btns">
              <button type="button" className="btn btn-secondary" onClick={() => setAskPause(false)}>
                {tr('Cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setAskPause(false);
                  void setOpen(false);
                }}>
                <Icon name="pause" size={16} /> {tr('Pause')}
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

/** The loud part: shown (with sound, vibration and a flashing frame) while any order is new. */
export function NewOrderAlert({ waiting, onOpen }: { waiting: MerchantOrder[]; onOpen: (id: string) => void }) {
  const tr = useT();
  if (!waiting.length) return null;
  const first = waiting[0];
  return (
    <>
      <div className="flash-frame" aria-hidden="true" />
      <button type="button" className="new-alert" role="alert" onClick={() => onOpen(first.id)}>
        <span className="bell">
          <Icon name="bell" size={24} />
        </span>
        <span className="grow">
          <span className="title">
            {waiting.length === 1 ? tr('New order · {id}', { id: first.id }) : tr('{n} new orders', { n: waiting.length })}
          </span>
          <br />
          <span>{tr('Tap to open')}</span>
        </span>
        <Icon name="chevron" size={28} />
      </button>
    </>
  );
}

/** Until the page has been touched, browsers block sound: ask for one tap. */
export function AlertsUnlock() {
  const tr = useT();
  const [ready, setReady] = useState(alarmReady());
  useEffect(() => onAlarmReady(() => setReady(alarmReady())), []);
  if (ready) return null;
  return (
    <div className="banner banner-alerts">
      <Icon name="bellOff" />
      <span className="grow">{tr('Tap once so the tablet can ring for new orders.')}</span>
      <button type="button" className="btn btn-primary" onClick={() => setReady(unlockAlarm() && alarmReady())}>
        <Icon name="bell" size={16} /> {tr('Turn on order alerts')}
      </button>
    </div>
  );
}

export function ConnectionBanner() {
  const tr = useT();
  const connected = useStore((s) => s.connected);
  const ever = useStore((s) => s.everConnected);
  if (connected) return null;
  return (
    <div className="banner banner-offline" role="status">
      {ever ? <Icon name="wifiOff" /> : <span className="spinner" />}
      <span className="grow">{tr(ever ? 'Reconnecting…' : 'Connecting to Yallo…')}</span>
    </div>
  );
}

export function PausedBanner({ store }: { store: Merchant | undefined }) {
  const tr = useT();
  const setOpen = useStore((s) => s.setOpen);
  const connected = useStore((s) => s.connected);
  if (!store || store.open !== false) return null;
  return (
    <div className="banner banner-paused">
      <Icon name="pause" />
      <span className="grow">{tr('The store is paused. Resume to receive orders.')}</span>
      <button type="button" className="btn btn-primary" disabled={!connected} onClick={() => void setOpen(true)}>
        <Icon name="play" size={16} /> {tr('Resume orders')}
      </button>
    </div>
  );
}

export function ToastView() {
  const toast = useStore((s) => s.toast);
  const set = useStore((s) => s.set);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => set({ toast: null }), 3200);
    return () => clearTimeout(id);
  }, [toast, set]);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.tone === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
      {toast.text}
    </div>
  );
}
