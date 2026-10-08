import { useState } from 'react';

import { errorText } from '@/api/client';
import { LANGS } from '@/i18n/strings';
import { unlockAlarm } from '@/lib/alarm';
import { BUILD_LABEL } from '@/lib/build';
import { requestCode, validPhone, verifyCode } from '@/store/session';
import { useStore, useT } from '@/store/store';

/** Phone, then the one-time code. The tap on "Sign in" also unlocks the order alarm's sound. */
export function SignIn() {
  const tr = useT();
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const [local, setLocal] = useState('');
  const [sent, setSent] = useState<{ phone: string; fixedCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [waking, setWaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockAlarm();
    if (!validPhone(local)) return setError('Enter a valid phone number');
    setBusy(true);
    setError(null);
    try {
      setSent(await requestCode(local, () => setWaking(true)));
      setCode('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      setWaking(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockAlarm();
    if (!sent || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(sent.phone, code, () => setWaking(true));
    } catch (err) {
      setError(errorText(err));
      setCode('');
    } finally {
      setBusy(false);
      setWaking(false);
    }
  };

  return (
    <main className="signin">
      <div className="signin-card">
        <div className="wordmark">
          <span className="name">YALLO</span>
          <span className="tag tag-accent">Merchant</span>
        </div>
        {!sent ? (
          <form onSubmit={send} noValidate>
            <h1>{tr('Yallo for stores')}</h1>
            <p className="muted">{tr('Take orders, set prep times and hand them to couriers.')}</p>
            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="phone">{tr('Store phone number')}</label>
              <div className="phone-row">
                <span className="dial">+212</span>
                <input
                  id="phone"
                  className="input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="6 12 34 56 78"
                  value={local}
                  onChange={(e) => {
                    setLocal(e.target.value);
                    setError(null);
                  }}
                />
              </div>
            </div>
            {error && <div className="form-error" role="alert">{tr(error)}</div>}
            <Waking show={waking} />
            <button type="submit" className="btn btn-primary" disabled={busy || local.replace(/\D/g, '').length < 9}>
              {busy ? tr('Connecting…') : tr('Send code')}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} noValidate>
            <h1>{tr('Enter the code')}</h1>
            <p className="muted">{tr('Sent by SMS to {phone}', { phone: sent.phone })}</p>
            <input
              className="input code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={tr('Enter the code')}
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
            />
            {sent.fixedCode && <div className="hint">{tr('Demo code: {code}', { code: sent.fixedCode })}</div>}
            {error && <div className="form-error" role="alert">{tr(error)}</div>}
            <Waking show={waking} />
            <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>
              {busy ? tr('Connecting…') : tr('Sign in')}
            </button>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 8, width: '100%' }} onClick={() => setSent(null)}>
              {tr('Use another number')}
            </button>
          </form>
        )}
        <div className="langs">
          {LANGS.map((l) => (
            <button key={l.key} type="button" className={`btn ${lang === l.key ? 'btn-secondary' : 'btn-ghost'}`} aria-pressed={lang === l.key} onClick={() => setLang(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="build">Yallo Merchant {BUILD_LABEL}</div>
      </div>
    </main>
  );
}

function Waking({ show }: { show: boolean }) {
  const tr = useT();
  if (!show) return null;
  return (
    <div className="hint" style={{ display: 'flex', gap: 10, alignItems: 'center' }} role="status">
      <span className="spinner" />
      {tr('Connecting to Yallo…')}
    </div>
  );
}
