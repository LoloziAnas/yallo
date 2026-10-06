// Markup mirrors 'Yallo App.dc.html' (design/). Data comes in via the view model `v` built in App.jsx.

export default function AuthScreen({ v }) {
  return (
    <div style={{ position: 'absolute', inset: '0', display: 'flex', flexDirection: 'column', padding: '4px 20px 34px' }}>
      <button
        className="btn btn-ghost btn-icon"
        onClick={v.authBack}
        style={{ width: '44px', height: '44px', color: 'var(--color-text)', marginInlineStart: '-10px' }}
      >
        {v.ic.back}
      </button>
      {v.authPhone && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1' }}>
          <h1 style={{ fontSize: '38px', margin: '16px 0 6px', textWrap: 'balance' }}>{v.t.signIn}</h1>
          <p style={{ color: 'var(--color-neutral-700)', margin: '0 0 24px', fontSize: '15px' }}>{v.t.phoneHint}</p>
          <div className="field">
            <label>{v.t.phone}</label>
            <div dir="ltr" style={{ display: 'flex', gap: '8px' }}>
              <div
                className="input"
                style={{
                  width: '84px',
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '52px',
                  fontSize: '17px',
                  fontWeight: '500',
                }}
              >
                +212
              </div>
              <input
                className="input"
                inputMode="numeric"
                placeholder="6 61 23 45 67"
                value={v.phoneNum}
                onChange={v.onPhone}
                style={{ minHeight: '52px', fontSize: '18px', letterSpacing: '.04em' }}
              />
            </div>
          </div>
          <button
            className="btn btn-primary"
            disabled={v.phoneInvalid}
            onClick={v.sendOtp}
            style={{ height: '54px', fontSize: '18px', marginTop: '16px', width: '100%' }}
          >
            {v.t.continue}
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '22px 0',
              color: 'var(--color-neutral-600)',
              fontSize: '13px',
            }}
          >
            <span style={{ flex: '1', height: '1px', background: 'var(--color-divider)' }} />
            {v.t.or}
            <span style={{ flex: '1', height: '1px', background: 'var(--color-divider)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={v.socialLogin} style={{ height: '52px', fontSize: '16px' }}>
              {v.t.google}
            </button>
            <button className="btn btn-secondary" onClick={v.socialLogin} style={{ height: '52px', fontSize: '16px' }}>
              {v.t.apple}
            </button>
          </div>
          <div style={{ flex: '1' }} />
          <button className="btn btn-ghost" onClick={v.guest} style={{ height: '48px', fontSize: '16px', alignSelf: 'center' }}>
            {v.t.guest}
          </button>
          <p style={{ fontSize: '12px', color: 'var(--color-neutral-600)', textAlign: 'center', margin: '8px 0 0' }}>{v.t.terms}</p>
        </div>
      )}
      {v.authOtp && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: '1' }}>
          <h1 style={{ fontSize: '38px', margin: '16px 0 6px' }}>{v.t.otpT}</h1>
          <p style={{ color: 'var(--color-neutral-700)', margin: '0 0 28px', fontSize: '15px' }}>
            {v.t.otpSent}{' '}
            <span dir="ltr" style={{ fontWeight: '600', color: 'var(--color-text)' }}>
              {v.phoneFmt}
            </span>
          </p>
          <input
            className="input"
            dir="ltr"
            autoFocus
            inputMode="numeric"
            maxLength="4"
            placeholder="• • • •"
            value={v.otp}
            onChange={v.onOtp}
            style={{ minHeight: '72px', fontFamily: 'var(--font-heading)', fontSize: '40px', letterSpacing: '.6em', textAlign: 'center' }}
          />
          <button className="btn btn-ghost" onClick={v.resend} style={{ alignSelf: 'flex-start', marginTop: '14px', fontSize: '15px' }}>
            {v.t.resend}
          </button>
        </div>
      )}
    </div>
  );
}
