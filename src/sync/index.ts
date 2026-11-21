import { LocalAdapter } from './LocalAdapter';
import { SupabaseAdapter } from './SupabaseAdapter';
import type { SyncAdapter } from './SyncAdapter';

export * from './SyncAdapter';

let instance: SyncAdapter | null = null;

/** Podstrčí vlastní adaptér (demo, testy). Volat před prvním vykreslením. */
export function setAdapter(adapter: SyncAdapter) {
  instance = adapter;
}

/** Jediný adaptér na stránku. Volba podle .env (VITE_SYNC_ADAPTER). */
export function getAdapter(): SyncAdapter {
  if (instance) return instance;
  const kind = import.meta.env.VITE_SYNC_ADAPTER ?? 'local';
  if (kind === 'supabase') {
    console.warn('[rupra] SupabaseAdapter je zatím jen kostra – používám LocalAdapter.');
    void SupabaseAdapter; // TODO: po implementaci: instance = new SupabaseAdapter();
  }
  instance = new LocalAdapter();
  return instance;
}
