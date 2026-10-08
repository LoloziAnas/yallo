import './restore-path';
import './styles/zanqa.css';
import './styles/app.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { unlockAlarm } from './lib/alarm';

// Any tap on the page lets the order alarm make sound (browsers block audio until then).
document.addEventListener('pointerdown', () => unlockAlarm(), { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Installable, and opens without a connection (the live view comes back when the network does).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
