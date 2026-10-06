import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/zanqa.css';
import './styles/app.css';

// The design file exposed these as editor props; here they come from the URL, e.g.
// ?theme=Saffron&networkError=1&index=0&screen=cart&bare=1
const q = new URLSearchParams(location.search);
const flag = (k, d) => (q.has(k) ? !['0', 'false'].includes(q.get(k)) : d);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App
      theme={q.get('theme') || 'Paprika'}
      networkError={flag('networkError', false)}
      showScreenIndex={flag('index', true)}
      startScreen={q.get('screen')}
      bare={flag('bare', false)}
    />
  </StrictMode>,
);
