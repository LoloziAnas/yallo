import { useState } from 'react';
import { DEV_OTP_CODE } from '@yallo/shared';
import { api, saveToken } from '../api.js';

/** Ops staff sign in with their phone number and a one-time code. */
export default function SignIn({ onSignedIn }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = fn => async e => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const sendCode = run(async () => {
    const r = await api.requestOtp(phone, 'ops');
    setSent(r.phone);
  });
  const signIn = run(async () => {
    const { token, user } = await api.verifyOtp(sent, code);
    saveToken(token);
    onSignedIn(user);
  });

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--color-bg)' }}>
      <div className="card" style={{ width: 380, maxWidth: '100%', padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 26, letterSpacing: '.06em' }}>YALLO</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999, background: 'var(--color-accent)', color: '#fff' }}>Ops</span>
        </div>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>Sign in</h1>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {sent ? `Enter the code sent to ${sent}.` : 'Use the phone number on the ops staff list.'}
          </div>
        </div>
        {!sent ? (
          <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input id="phone" className="input" type="tel" autoComplete="tel" placeholder="+212 6…" value={phone} onChange={e => setPhone(e.target.value)} autoFocus />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !phone.trim()}>{busy ? 'Sending…' : 'Send code'}</button>
          </form>
        ) : (
          <form onSubmit={signIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label htmlFor="code">6-digit code</label>
              <input id="code" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} autoFocus
                style={{ letterSpacing: '.3em', fontSize: 18, fontWeight: 600 }} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setSent(null); setCode(''); setError(null); }}>Use another number</button>
          </form>
        )}
        {error && <div role="alert" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent-700)' }}>{error}</div>}
        {import.meta.env.DEV && <div className="faint" style={{ fontSize: 12 }}>Development: the code is always {DEV_OTP_CODE}.</div>}
      </div>
    </div>
  );
}
