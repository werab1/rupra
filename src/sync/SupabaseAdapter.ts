import { createInitialState } from '../domain/reducer';
import type { Action, AppState } from '../domain/types';
import type { ClientRole, ConnectionInfo, SyncAdapter } from './SyncAdapter';

/**
 * Kostra adaptéru pro ostrý provoz přes Supabase (Postgres + Realtime).
 * Přepíná se v .env: VITE_SYNC_ADAPTER=supabase
 *
 * TODO – návrh implementace:
 *  1. Tabulka `matches` (id, state jsonb, rev int, updated_at) + tabulka `match_actions`
 *     (id uuid, match_id, action jsonb, ts timestamptz default now()).
 *  2. dispatch(): insert do `match_actions` (časové razítko doplní server → jednotný čas pro všechna zařízení),
 *     RPC/Edge funkce aplikuje sdílený reducer (src/domain/reducer.ts) a uloží nový `state` s rev+1.
 *     Alternativa pro gama provoz: optimistický update na klientovi + upsert s kontrolou `rev`.
 *  3. subscribe(): kanál Realtime `postgres_changes` na řádek `matches` (filter id=eq.<matchId>).
 *  4. Přítomnost klientů (indikátor připojení): Realtime Presence s rolí `zapis | panel | overlay`.
 *  5. Offline fronta pro /zapis: akce ukládat do IndexedDB a odeslat po obnovení spojení.
 *  6. Korekce hodin: při připojení změřit offset mezi Date.now() a časem serveru a použít ho v clock.ts.
 *  7. RLS: zapisovatel a režie zapisují (přihlášení / tajný odkaz), overlay jen čte.
 */
export class SupabaseAdapter implements SyncAdapter {
  private state: AppState = createInitialState();
  private readonly connection: ConnectionInfo = { status: 'offline', peers: { zapis: 0, panel: 0, overlay: 0 } };

  constructor(
    readonly url = import.meta.env.VITE_SUPABASE_URL,
    readonly anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY,
    readonly matchId = import.meta.env.VITE_MATCH_ID ?? 'demo',
  ) {
    // TODO: createClient(url, anonKey), načíst stav zápasu, otevřít Realtime kanál.
  }

  getState() {
    return this.state;
  }

  dispatch(_action: Action): void {
    // TODO: odeslat akci do Supabase (viz komentář výše).
    throw new Error('SupabaseAdapter zatím není implementovaný – použijte VITE_SYNC_ADAPTER=local.');
  }

  subscribe(_listener: (state: AppState) => void) {
    // TODO: Realtime odběr změn.
    return () => {};
  }

  getConnection() {
    return this.connection;
  }

  subscribeConnection(_listener: (info: ConnectionInfo) => void) {
    return () => {};
  }

  setRole(_role: ClientRole): void {
    // TODO: Realtime Presence track({ role })
  }

  destroy(): void {
    // TODO: odhlásit kanály
  }
}
