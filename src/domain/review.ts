import { activeYellowCards } from './clock';
import { POINTS, SCORE_LABEL } from './rules';
import { findPlayer } from './roster';
import type { AppState, Submission, SubmissionItem, SubmissionKind } from './types';

export const SUBMISSION_LABEL: Record<SubmissionKind, string> = {
  ...SCORE_LABEL,
  yellow: 'Žlutá karta',
  red: 'Červená karta',
};

/** Pořadí a popisky voleb u hráče na hřišti. Trestné položení je týmová akce. */
export const PLAYER_KINDS: SubmissionKind[] = ['try', 'conversion', 'penalty', 'dropgoal', 'yellow', 'red'];

export function pointsOf(kind: SubmissionKind): number {
  return kind === 'yellow' || kind === 'red' ? 0 : POINTS[kind];
}

export function itemLabel(state: AppState, it: SubmissionItem): string {
  const p = findPlayer(state.setup, it.side, it.playerId);
  const who = p ? `#${p.number} ${p.name}` : state.setup[it.side].name;
  const pts = pointsOf(it.kind);
  return `${SUBMISSION_LABEL[it.kind]}${pts ? ` +${pts}` : ''} · ${who}`;
}

export type Severity = 'warn' | 'block';
export interface ReviewFlag {
  severity: Severity;
  text: string;
}

/**
 * Automatická kontrola smysluplnosti hlášení vůči aktuálnímu stavu zápasu.
 * „block“ = do zápasu to zapsat nejde, „warn“ = jde, ale je dobré to ověřit.
 */
export function reviewFlags(state: AppState, s: Submission, now = Date.now()): ReviewFlag[] {
  const flags: ReviewFlag[] = [];
  const { live, setup } = state;
  const p = findPlayer(setup, s.side, s.playerId);

  if (live.period === 'ft') flags.push({ severity: 'block', text: 'Zápas už skončil.' });
  else if (live.period === 'pre') flags.push({ severity: 'warn', text: 'Zápas ještě nezačal.' });
  else if (live.period === 'ht') flags.push({ severity: 'warn', text: 'Je poločasová přestávka.' });

  if (s.playerId && !p) flags.push({ severity: 'warn', text: 'Hráč už není na soupisce.' });

  if (p) {
    if (live.sentOff[s.side].includes(p.id)) {
      flags.push({ severity: 'warn', text: 'Hráč už byl vyloučen červenou kartou.' });
    } else if (!live.onField[s.side].includes(p.id)) {
      flags.push({ severity: 'warn', text: 'Hráč podle zápisu není na hřišti (je na lavičce).' });
    }
    const onYellow = activeYellowCards(state, now).some((y) => y.card.side === s.side && y.card.playerId === p.id);
    if (onYellow) {
      flags.push({
        severity: 'warn',
        text: s.kind === 'yellow' ? 'Hráč už má aktivní žlutou kartu – nemá jít o červenou?' : 'Hráč je právě mimo hru na žluté kartě.',
      });
    }
  }

  if (s.kind === 'conversion') {
    const st = live.stats[s.side];
    if (st.conversions >= st.tries) {
      flags.push({ severity: 'warn', text: 'Tým nemá zapsané položení, ke kterému by kop patřil.' });
    }
  }

  // Možný duplikát: stejný hráč a stejná akce v posledních 2 minutách (čeká nebo už je schválené).
  const dup = (state.submissions ?? []).some(
    (o) =>
      o.id !== s.id &&
      o.status !== 'rejected' &&
      o.side === s.side &&
      o.playerId === s.playerId &&
      o.kind === s.kind &&
      Math.abs(o.ts - s.ts) < 120_000,
  );
  if (dup) flags.push({ severity: 'warn', text: 'Možný duplikát – stejné hlášení přišlo před chvílí.' });

  return flags;
}
