import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Drží prvek v DOM i během odjezdové animace.
 * Stav „skryto“ = výchozí CSS třída, „zobrazeno“ = .is-in → animuje se jen transform/opacity.
 */
export function Presence({
  show,
  children,
  className = '',
  exitMs = 600,
  style,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
  exitMs?: number;
  style?: React.CSSProperties;
}) {
  const [mounted, setMounted] = useState(show);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (show) {
      setMounted(true);
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    setEntered(false);
    const t = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(t);
  }, [show, exitMs]);

  if (!mounted) return null;
  return (
    <div className={`fx ${className} ${entered ? 'is-in' : ''}`} style={style}>
      {children}
    </div>
  );
}

/** Zapamatuje si poslední ne-null hodnotu (aby obsah při odjezdu nezmizel). */
export function useLatest<T>(value: T | null | undefined): T | null {
  const ref = useRef<T | null>(value ?? null);
  if (value != null) ref.current = value;
  return ref.current;
}
