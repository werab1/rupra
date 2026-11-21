import type { Action, AppState } from '../domain/types';

/** Role obrazovky – používá se pro indikaci, kdo je připojený. */
export type ClientRole = 'zapis' | 'panel' | 'overlay';

/**
 * online   = synchronizace funguje a vidíme další obrazovku
 * degraded = synchronizace funguje, ale žádná jiná obrazovka se neozývá
 * offline  = synchronizace nefunguje (zápis jen lokálně)
 */
export type ConnectionStatus = 'online' | 'degraded' | 'offline';

export interface ConnectionInfo {
  status: ConnectionStatus;
  /** Počet ostatních klientů dle role, kteří se ozvali v posledních ~5 s */
  peers: Record<ClientRole, number>;
}

/**
 * Jediné rozhraní, přes které aplikace mluví se synchronizací.
 * Komponenty nevědí, jestli pod ním je BroadcastChannel, nebo Supabase.
 */
export interface SyncAdapter {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: (state: AppState) => void): () => void;

  getConnection(): ConnectionInfo;
  subscribeConnection(listener: (info: ConnectionInfo) => void): () => void;

  /** Ohlásí roli této obrazovky ostatním klientům. */
  setRole(role: ClientRole): void;
  destroy(): void;
}

export function stampAction<A extends Action>(action: A) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return { ...action, id, ts: Date.now() };
}
