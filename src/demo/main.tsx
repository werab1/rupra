import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/tokens.css';
import { setAdapter, type ConnectionInfo, type SyncAdapter } from '../sync';
import { LocalAdapter } from '../sync/LocalAdapter';
import { Demo } from './Demo';
import { seedDemoState } from './seed';
import './demo.css';

document.documentElement.dataset.route = 'demo';

// Všechny tři pohledy běží v jedné stránce nad jedním adaptérem.
// Indikátory připojení proto hlásí „vše připojeno“.
const base = new LocalAdapter(() => seedDemoState());
// Uložený stav starší než 3 h (čas by mezitím „utekl“) nahradíme čerstvým ukázkovým zápasem.
if (Date.now() - base.getState().updatedAt > 3 * 60 * 60 * 1000) {
  base.dispatch({ type: 'REPLACE_STATE', state: seedDemoState() });
}
const connected: ConnectionInfo = { status: 'online', peers: { zapis: 1, panel: 1, overlay: 1 } };
const adapter: SyncAdapter = {
  getState: base.getState,
  dispatch: base.dispatch,
  subscribe: base.subscribe,
  getConnection: () => connected,
  subscribeConnection: () => () => {},
  setRole: () => {},
  destroy: () => base.destroy(),
};
setAdapter(adapter);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo onRestart={() => adapter.dispatch({ type: 'REPLACE_STATE', state: seedDemoState() })} />
  </StrictMode>,
);
