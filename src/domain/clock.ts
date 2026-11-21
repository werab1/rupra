import type { AppState, CardRecord, ClockState, LiveState, Period, Variant } from './types';
import { VARIANTS } from './rules';

/** Čas uplynulý v aktuálním poločase – počítá se z razítek, ne z intervalu. */
export function halfElapsedMs(clock: ClockState, now: number): number {
  const running = clock.running && clock.startedAt != null ? Math.max(0, now - clock.startedAt) : 0;
  return clock.halfAccMs + running;
}

/** Celkový čistý hrací čas (pro odpočet žlutých karet). */
export function runMs(clock: ClockState, now: number): number {
  return clock.prevHalvesMs + halfElapsedMs(clock, now);
}

/** Herní čas zobrazovaný divákům – ve 2. poločase navazuje (40:00 → 80:00). */
export function displayMs(live: LiveState, variant: Variant, now: number): number {
  const halfLen = VARIANTS[variant].halfMin * 60_000;
  const elapsed = halfElapsedMs(live.clock, now);
  switch (live.period) {
    case 'pre':
    case 'h1':
      return elapsed;
    case 'ht':
      return halfLen;
    case 'h2':
      return halfLen + elapsed;
    case 'ft':
      return halfLen * 2;
  }
}

export function formatClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatShort(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const PERIOD_LABEL: Record<Period, string> = {
  pre: 'Před zápasem',
  h1: '1. poločas',
  ht: 'Poločas',
  h2: '2. poločas',
  ft: 'Konec',
};

export const PERIOD_SHORT: Record<Period, string> = {
  pre: 'START',
  h1: '1. POL',
  ht: 'POLOČAS',
  h2: '2. POL',
  ft: 'KONEC',
};

/** Zbývající čas žluté karty (null = neaktivní). Odpočet běží jen při běžícím čase. */
export function cardRemainingMs(card: CardRecord, clock: ClockState, now: number): number | null {
  if (card.kind !== 'yellow') return null;
  const left = card.durationMs - (runMs(clock, now) - card.issuedRunMs);
  return left > 0 ? left : null;
}

export function activeYellowCards(state: AppState, now: number) {
  return state.live.cards
    .map((c) => ({ card: c, remaining: cardRemainingMs(c, state.live.clock, now) }))
    .filter((x): x is { card: CardRecord; remaining: number } => x.remaining != null);
}

export function minuteLabel(ms: number): string {
  return `${Math.floor(ms / 60_000) + 1}'`;
}
