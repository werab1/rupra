import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import { App } from './App';

// Nastavit routu ještě před prvním vykreslením (overlay musí být průhledný od prvního snímku).
const path = window.location.pathname.replace(/\/+$/, '');
document.documentElement.dataset.route = path === '/overlay' ? 'overlay' : path.slice(1) || 'home';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
