import { useEffect, useState, useSyncExternalStore } from 'react';
import { getAdapter, type ClientRole } from '../sync';

export function useMatch(role: ClientRole) {
  const adapter = getAdapter();
  useEffect(() => adapter.setRole(role), [adapter, role]);
  const state = useSyncExternalStore(adapter.subscribe, adapter.getState);
  const connection = useSyncExternalStore(adapter.subscribeConnection, adapter.getConnection);
  return { state, dispatch: adapter.dispatch, connection };
}

/**
 * Hodiny pro překreslování. Čas se vždy počítá z razítek – tento tik jen říká,
 * kdy znovu vykreslit, takže všechny obrazovky ukazují totéž.
 */
export function useNow(intervalMs = 200) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
