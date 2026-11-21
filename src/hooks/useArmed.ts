import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Potvrzení druhým klepnutím (místo window.confirm, které v některých prostředích
 * – vMix, vložené stránky – nefunguje). První klepnutí tlačítko „natáhne“,
 * druhé do 3 s akci provede.
 */
export function useArmed(timeoutMs = 3000) {
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const guard = useCallback(
    (key: string, run: () => void) => {
      if (armed === key) {
        window.clearTimeout(timer.current);
        setArmed(null);
        run();
        return;
      }
      setArmed(key);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setArmed(null), timeoutMs);
    },
    [armed, timeoutMs],
  );

  return { armed, guard };
}
