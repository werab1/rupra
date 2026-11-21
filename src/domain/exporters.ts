import { activeYellowCards, displayMs, formatClock, formatShort, PERIOD_LABEL } from './clock';
import { findPlayer, SIDES } from './roster';
import type { AppState } from './types';

/** Plochý snímek stavu – vhodný pro vMix Data Sources (JSON i XML). */
export function snapshot(state: AppState, now = Date.now()) {
  const { setup, live } = state;
  const yellows = activeYellowCards(state, now);
  const team = (side: 'home' | 'away') => ({
    name: setup[side].name,
    short: setup[side].short,
    color: setup[side].color,
    score: live.score[side],
    tries: live.stats[side].tries,
    yellowCards: yellows
      .filter((y) => y.card.side === side)
      .map((y) => {
        const p = findPlayer(setup, side, y.card.playerId);
        return { number: p?.number ?? null, name: p?.name ?? '', remaining: formatShort(y.remaining) };
      }),
    redCards: live.cards
      .filter((c) => c.side === side && c.kind === 'red')
      .map((c) => {
        const p = findPlayer(setup, side, c.playerId);
        return { number: p?.number ?? null, name: p?.name ?? '' };
      }),
  });

  return {
    generatedAt: new Date(now).toISOString(),
    competition: setup.competition,
    venue: setup.venue,
    variant: setup.variant,
    period: live.period,
    periodLabel: PERIOD_LABEL[live.period],
    clock: formatClock(displayMs(live, setup.variant, now)),
    clockRunning: live.clock.running,
    home: team('home'),
    away: team('away'),
    halftime: live.halftimeScore,
    events: live.log.map((l) => ({
      minute: l.minute,
      team: l.side ? setup[l.side].short : '',
      title: l.title,
      detail: l.detail,
      points: l.points ?? 0,
    })),
  };
}

export function toJSON(state: AppState, now = Date.now()): string {
  return JSON.stringify(snapshot(state, now), null, 2);
}

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** XML s plochými poli na první úrovni (HomeScore, AwayScore, Clock…) – snadné mapování ve vMixu. */
export function toXML(state: AppState, now = Date.now()): string {
  const s = snapshot(state, now);
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<rupra>', '  <match>'];
  const field = (k: string, v: unknown) => lines.push(`    <${k}>${esc(v)}</${k}>`);
  field('Competition', s.competition);
  field('Venue', s.venue);
  field('Period', s.periodLabel);
  field('Clock', s.clock);
  field('ClockRunning', s.clockRunning ? 'true' : 'false');
  for (const side of SIDES) {
    const t = s[side];
    const P = side === 'home' ? 'Home' : 'Away';
    field(`${P}Name`, t.name);
    field(`${P}Short`, t.short);
    field(`${P}Color`, t.color);
    field(`${P}Score`, t.score);
    field(`${P}Tries`, t.tries);
    field(`${P}YellowCards`, t.yellowCards.length);
    field(`${P}RedCards`, t.redCards.length);
  }
  field('HalftimeHome', s.halftime?.home ?? '');
  field('HalftimeAway', s.halftime?.away ?? '');
  lines.push('  </match>', '  <events>');
  for (const e of s.events) {
    lines.push(
      `    <event minute="${esc(e.minute)}" team="${esc(e.team)}" points="${e.points}"><title>${esc(e.title)}</title><detail>${esc(e.detail)}</detail></event>`,
    );
  }
  lines.push('  </events>', '</rupra>');
  return lines.join('\n');
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
