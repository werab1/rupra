import { createInitialState, reducer } from '../domain/reducer';
import type { Action, AppState } from '../domain/types';
import { EMPTY_PEERS, stampAction, type ClientRole, type ConnectionInfo, type SyncAdapter } from './SyncAdapter';

const STORAGE_KEY = 'rupra:state:v1';
const CHANNEL = 'rupra-sync-v1';
const HEARTBEAT_MS = 1500;
const PEER_TIMEOUT_MS = 5000;

type Message =
  | { kind: 'state'; state: AppState; from: string }
  | { kind: 'ping'; role: ClientRole | null; from: string }
  | { kind: 'hello'; role: ClientRole | null; from: string };

function load(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || parsed.schema !== 1) return null;
    return { ...parsed, submissions: parsed.submissions ?? [] };
  } catch {
    return null;
  }
}

function save(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* plné úložiště / privátní režim – stav zůstane v paměti */
  }
}

/** Novější stav vyhrává: vyšší revize, při shodě pozdější updatedAt. */
function isNewer(a: AppState, b: AppState) {
  return a.rev > b.rev || (a.rev === b.rev && a.updatedAt > b.updatedAt);
}

/**
 * Lokální synchronizace pro testování na jednom počítači:
 * BroadcastChannel rozesílá změny mezi záložkami, localStorage drží stav přes refresh
 * (a slouží jako záložní kanál přes událost `storage`).
 */
export class LocalAdapter implements SyncAdapter {
  private state: AppState;
  private listeners = new Set<(s: AppState) => void>();
  private connListeners = new Set<(c: ConnectionInfo) => void>();
  private channel: BroadcastChannel | null = null;
  private readonly tabId = Math.random().toString(36).slice(2, 10);
  private role: ClientRole | null = null;
  private peers = new Map<string, { role: ClientRole | null; seen: number }>();
  private connection: ConnectionInfo = { status: 'degraded', peers: { ...EMPTY_PEERS } };
  private timer: number | undefined;

  /** @param seed počáteční stav, pokud v úložišti nic není (např. ukázkový zápas v demu) */
  constructor(seed: () => AppState = () => createInitialState()) {
    const stored = load();
    this.state = stored ?? seed();
    if (!stored) save(this.state);

    try {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (e: MessageEvent<Message>) => this.onMessage(e.data);
    } catch {
      this.channel = null;
    }
    window.addEventListener('storage', this.onStorage);
    window.addEventListener('online', this.refreshConnection);
    window.addEventListener('offline', this.refreshConnection);

    this.post({ kind: 'hello', role: this.role, from: this.tabId });
    this.timer = window.setInterval(() => {
      this.post({ kind: 'ping', role: this.role, from: this.tabId });
      this.refreshConnection();
    }, HEARTBEAT_MS);
    this.refreshConnection();
  }

  getState = () => this.state;

  dispatch = (action: Action) => {
    // Vždy navazujeme na nejnovější uložený stav (jiná záložka mohla mezitím zapsat).
    const stored = load();
    const base = stored && isNewer(stored, this.state) ? stored : this.state;
    const next = reducer(base, stampAction(action));
    if (next === base) {
      if (base !== this.state) this.setState(base);
      return;
    }
    save(next);
    this.setState(next);
    this.post({ kind: 'state', state: next, from: this.tabId });
  };

  subscribe = (listener: (s: AppState) => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getConnection = () => this.connection;

  subscribeConnection = (listener: (c: ConnectionInfo) => void) => {
    this.connListeners.add(listener);
    return () => this.connListeners.delete(listener);
  };

  setRole(role: ClientRole) {
    this.role = role;
    this.post({ kind: 'hello', role, from: this.tabId });
  }

  destroy() {
    window.clearInterval(this.timer);
    window.removeEventListener('storage', this.onStorage);
    window.removeEventListener('online', this.refreshConnection);
    window.removeEventListener('offline', this.refreshConnection);
    this.channel?.close();
  }

  // ───────────── interní ─────────────

  private setState(next: AppState) {
    this.state = next;
    for (const l of this.listeners) l(next);
  }

  private post(msg: Message) {
    try {
      this.channel?.postMessage(msg);
    } catch {
      /* kanál zavřený */
    }
  }

  private onMessage(msg: Message) {
    if (!msg || msg.from === this.tabId) return;
    const known = this.peers.has(msg.from);
    this.peers.set(msg.from, { role: (msg as { role?: ClientRole | null }).role ?? this.peers.get(msg.from)?.role ?? null, seen: Date.now() });
    if (msg.kind === 'state') {
      if (isNewer(msg.state, this.state)) this.setState(msg.state);
    } else if (msg.kind === 'hello' && !known) {
      // Odpověz, ať se nový klient hned dozví o nás.
      this.post({ kind: 'ping', role: this.role, from: this.tabId });
    }
    this.refreshConnection();
  }

  private onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const s = JSON.parse(e.newValue) as AppState;
      if (isNewer(s, this.state)) this.setState(s);
    } catch {
      /* ignorovat */
    }
  };

  private refreshConnection = () => {
    const now = Date.now();
    const peers = { ...EMPTY_PEERS };
    for (const [id, p] of this.peers) {
      if (now - p.seen > PEER_TIMEOUT_MS) {
        this.peers.delete(id);
        continue;
      }
      if (p.role) peers[p.role]++;
    }
    const anyPeer = this.peers.size > 0;
    const status: ConnectionInfo['status'] =
      !this.channel || (typeof navigator !== 'undefined' && navigator.onLine === false && !anyPeer)
        ? 'offline'
        : anyPeer
          ? 'online'
          : 'degraded';
    const prev = this.connection;
    if (
      prev.status !== status ||
      (Object.keys(peers) as ClientRole[]).some((r) => prev.peers[r] !== peers[r])
    ) {
      this.connection = { status, peers };
      for (const l of this.connListeners) l(this.connection);
    }
  };
}
