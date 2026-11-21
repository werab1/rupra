import { useEffect, useRef, useState } from 'react';

/**
 * Číslo, které se při změně „přetočí“ – stará hodnota odjede nahoru, nová přijede zespodu.
 * Používá jen transform/opacity.
 */
export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const [prev, setPrev] = useState<number | null>(null);
  const last = useRef(value);
  const [dir, setDir] = useState<'up' | 'down'>('up');

  useEffect(() => {
    if (last.current !== value) {
      setDir(value > last.current ? 'up' : 'down');
      setPrev(last.current);
      last.current = value;
      const t = window.setTimeout(() => setPrev(null), 700);
      return () => window.clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`anum ${className} anum-${dir}`}>
      {prev != null && (
        <span key={`o${prev}-${value}`} className="anum-out" aria-hidden>
          {prev}
        </span>
      )}
      <span key={`i${value}`} className={prev != null ? 'anum-in' : undefined}>
        {value}
      </span>
    </span>
  );
}
