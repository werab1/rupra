import type { CSSProperties } from 'react';

/** Čitelná barva textu (černá/bílá) na podkladu barvy týmu. */
export function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  // Ve sportovní grafice preferujeme bílou – černou jen na opravdu světlých barvách.
  return 1.05 / (L + 0.05) >= 2.6 ? '#ffffff' : '#0a0c0f';
}

export function teamVars(color: string): CSSProperties {
  return { ['--tc' as string]: color, ['--tc-text' as string]: textOn(color) } as CSSProperties;
}
