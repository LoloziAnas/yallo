import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/zanqa.css';
import './styles/app.css';

// ?page=overview|live|orders|couriers|merchants|support|payouts opens a specific screen.
const PAGES = ['overview', 'live', 'orders', 'couriers', 'merchants', 'support', 'payouts'];
const requested = new URLSearchParams(location.search).get('page');
const startPage = PAGES.includes(requested) ? requested : undefined;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App startPage={startPage} />
  </StrictMode>
);
