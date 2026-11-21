import { displayMs, minuteLabel, runMs } from './clock';
import { CARD_LABEL, POINTS, SCORE_LABEL, VARIANTS } from './rules';
import { findPlayer, starters } from './roster';
import { sampleSetup } from './sampleData';
import type {
  AppState,
  AutoKind,
  GraphicId,
  GraphicsState,
  LiveState,
  LogItem,
  MatchAction,
  MatchSetup,
  Notification,
  Side,
  Stamped,
  Action,
  TeamStats,
} from './types';

export const NOTIFICATION_MS = 6000;

const MATCH_TYPES = new Set<MatchAction['type']>(['SCORE', 'CLOCK_START', 'CLOCK_STOP', 'NEXT_HALF', 'SUB', 'CARD']);

export function isMatchAction(a: Action): a is MatchAction {
  return MATCH_TYPES.has(a.type as MatchAction['type']);
}

const emptyStats = (): TeamStats => ({ tries: 0, conversions: 0, penalties: 0, dropGoals: 0, penaltyTries: 0 });

export function initialLive(setup: MatchSetup): LiveState {
  return {
    score: { home: 0, away: 0 },
    period: 'pre',
    clock: { running: false, startedAt: null, halfAccMs: 0, prevHalvesMs: 0 },
    onField: {
      home: starters(setup.home, setup).map((p) => p.id),
      away: starters(setup.away, setup).map((p) => p.id),
    },
    sentOff: { home: [], away: [] },
    cards: [],
    stats: { home: emptyStats(), away: emptyStats() },
    halftimeScore: null,
    log: [],
  };
}

const GRAPHIC_IDS: GraphicId[] = [
  'scorebug', 'intro', 'rosterHome', 'rosterAway', 'lowerPlayer', 'lowerOfficial', 'halftime', 'fulltime',
];

function initialGraphics(): GraphicsState {
  const on = Object.fromEntries(GRAPHIC_IDS.map((g) => [g, false])) as Record<GraphicId, boolean>;
  return { on, lowerPlayer: null, officialIndex: 0 };
}

export function createInitialState(setup: MatchSetup = sampleSetup()): AppState {
  return {
    schema: 1,
    rev: 0,
    updatedAt: Date.now(),
    setup,
    events: [],
    live: initialLive(setup),
    graphics: initialGraphics(),
    auto: { score: true, sub: true, card: true },
    notification: null,
  };
}

// ───────────────────── Přehrání událostí (event sourcing) ─────────────────────

function stopClock(live: LiveState, ts: number): LiveState['clock'] {
  const c = live.clock;
  if (!c.running || c.startedAt == null) return c;
  return { ...c, running: false, startedAt: null, halfAccMs: c.halfAccMs + Math.max(0, ts - c.startedAt) };
}

interface Applied {
  live: LiveState;
  log: LogItem | null;
}

/** Aplikuje jednu zápasovou událost. Neplatné události vrací stav beze změny (log = null). */
function applyEvent(setup: MatchSetup, live: LiveState, ev: Stamped<MatchAction>): Applied {
  const rules = VARIANTS[setup.variant];
  const minute = minuteLabel(displayMs(live, setup.variant, ev.ts));
  const base = { eventId: ev.id, ts: ev.ts, minute, type: ev.type } as const;

  switch (ev.type) {
    case 'SCORE': {
      if (live.period === 'ft') return { live, log: null };
      const pts = POINTS[ev.kind];
      const stats = { ...live.stats[ev.side] };
      if (ev.kind === 'try') stats.tries++;
      if (ev.kind === 'conversion') stats.conversions++;
      if (ev.kind === 'penalty') stats.penalties++;
      if (ev.kind === 'dropgoal') stats.dropGoals++;
      if (ev.kind === 'penaltytry') stats.penaltyTries++;
      const p = findPlayer(setup, ev.side, ev.playerId);
      return {
        live: {
          ...live,
          score: { ...live.score, [ev.side]: live.score[ev.side] + pts },
          stats: { ...live.stats, [ev.side]: stats },
        },
        log: {
          ...base,
          side: ev.side,
          icon: ev.kind === 'try' || ev.kind === 'penaltytry' ? 'try' : 'kick',
          title: SCORE_LABEL[ev.kind],
          detail: p ? `${p.number} ${p.name}` : setup[ev.side].name,
          points: pts,
        },
      };
    }

    case 'CLOCK_START': {
      if (live.clock.running || live.period === 'ft') return { live, log: null };
      const period = live.period === 'pre' ? 'h1' : live.period === 'ht' ? 'h2' : live.period;
      return {
        live: { ...live, period, clock: { ...live.clock, running: true, startedAt: ev.ts } },
        log: { ...base, side: null, icon: 'clock', title: 'Čas spuštěn', detail: '' },
      };
    }

    case 'CLOCK_STOP': {
      if (!live.clock.running) return { live, log: null };
      return {
        live: { ...live, clock: stopClock(live, ev.ts) },
        log: { ...base, side: null, icon: 'clock', title: 'Čas zastaven', detail: '' },
      };
    }

    case 'NEXT_HALF': {
      const stopped = stopClock(live, ev.ts);
      switch (live.period) {
        case 'pre':
          return {
            live: { ...live, period: 'h1', clock: stopped },
            log: { ...base, side: null, icon: 'period', title: '1. poločas', detail: 'Připraveno k výkopu' },
          };
        case 'h1':
          return {
            live: {
              ...live,
              period: 'ht',
              halftimeScore: { ...live.score },
              clock: { running: false, startedAt: null, halfAccMs: 0, prevHalvesMs: stopped.prevHalvesMs + stopped.halfAccMs },
            },
            log: { ...base, side: null, icon: 'period', title: 'Konec 1. poločasu', detail: `${live.score.home}:${live.score.away}` },
          };
        case 'ht':
          return {
            live: { ...live, period: 'h2', clock: stopped },
            log: { ...base, side: null, icon: 'period', title: '2. poločas', detail: 'Připraveno k výkopu' },
          };
        case 'h2':
          return {
            live: { ...live, period: 'ft', clock: stopped },
            log: { ...base, side: null, icon: 'period', title: 'Konec zápasu', detail: `${live.score.home}:${live.score.away}` },
          };
        default:
          return { live, log: null };
      }
    }

    case 'SUB': {
      const field = live.onField[ev.side];
      if (!field.includes(ev.outId) || field.includes(ev.inId) || live.sentOff[ev.side].includes(ev.inId)) {
        return { live, log: null };
      }
      const out = findPlayer(setup, ev.side, ev.outId);
      const inn = findPlayer(setup, ev.side, ev.inId);
      return {
        live: { ...live, onField: { ...live.onField, [ev.side]: field.map((id) => (id === ev.outId ? ev.inId : id)) } },
        log: {
          ...base,
          side: ev.side,
          icon: 'sub',
          title: 'Střídání',
          detail: `${inn ? `${inn.number} ${inn.name}` : '?'} ↔ ${out ? `${out.number} ${out.name}` : '?'}`,
        },
      };
    }

    case 'CARD': {
      const p = findPlayer(setup, ev.side, ev.playerId);
      const durationMs = ev.card === 'yellow' ? rules.yellowMin * 60_000 : 0;
      const sentOff =
        ev.card === 'red' && ev.playerId
          ? { ...live.sentOff, [ev.side]: [...live.sentOff[ev.side], ev.playerId] }
          : live.sentOff;
      const onField =
        ev.card === 'red' && ev.playerId
          ? { ...live.onField, [ev.side]: live.onField[ev.side].filter((id) => id !== ev.playerId) }
          : live.onField;
      return {
        live: {
          ...live,
          sentOff,
          onField,
          cards: [
            ...live.cards,
            {
              id: ev.id,
              side: ev.side,
              kind: ev.card,
              playerId: ev.playerId ?? null,
              issuedRunMs: runMs(live.clock, ev.ts),
              durationMs,
              ts: ev.ts,
            },
          ],
        },
        log: {
          ...base,
          side: ev.side,
          icon: ev.card === 'yellow' ? 'card-yellow' : 'card-red',
          title: CARD_LABEL[ev.card],
          detail: p ? `${p.number} ${p.name}` : setup[ev.side].name,
        },
      };
    }
  }
}

export function replay(setup: MatchSetup, events: Stamped<MatchAction>[]): { live: LiveState; accepted: Stamped<MatchAction>[] } {
  let live = initialLive(setup);
  const accepted: Stamped<MatchAction>[] = [];
  const log: LogItem[] = [];
  for (const ev of events) {
    const r = applyEvent(setup, live, ev);
    if (r.log) {
      live = r.live;
      log.push(r.log);
      accepted.push(ev);
    }
  }
  return { live: { ...live, log }, accepted };
}

// ───────────────────── Automatická oznámení ─────────────────────

function autoKindOf(ev: MatchAction): AutoKind | null {
  if (ev.type === 'SCORE') return 'score';
  if (ev.type === 'SUB') return 'sub';
  if (ev.type === 'CARD') return 'card';
  return null;
}

function notificationFor(state: AppState, ev: Stamped<MatchAction>, item: LogItem): Notification | null {
  const kind = autoKindOf(ev);
  if (!kind) return null;
  const side = item.side;
  let line = item.detail;
  let sub = '';
  if (ev.type === 'SCORE') {
    const p = findPlayer(state.setup, ev.side, ev.playerId);
    line = p ? p.name : state.setup[ev.side].name;
    sub = p ? `#${p.number} · ${state.setup[ev.side].short} · +${item.points}` : `${state.setup[ev.side].short} · +${item.points}`;
  } else if (ev.type === 'CARD') {
    const p = findPlayer(state.setup, ev.side, ev.playerId);
    line = p ? p.name : state.setup[ev.side].name;
    sub = ev.card === 'yellow'
      ? `${p ? `#${p.number} · ` : ''}${state.setup[ev.side].short} · ${VARIANTS[state.setup.variant].yellowMin} min mimo hru`
      : `${p ? `#${p.number} · ` : ''}${state.setup[ev.side].short} · vyloučen`;
  } else if (ev.type === 'SUB') {
    const out = findPlayer(state.setup, ev.side, ev.outId);
    const inn = findPlayer(state.setup, ev.side, ev.inId);
    line = inn ? `▲ ${inn.number} ${inn.name}` : '';
    sub = out ? `▼ ${out.number} ${out.name}` : '';
  }
  return {
    id: ev.id,
    eventId: ev.id,
    kind,
    side,
    title: item.title.toUpperCase(),
    line,
    sub,
    icon: item.icon,
    shownAt: ev.ts,
    until: ev.ts + NOTIFICATION_MS,
  };
}

// ───────────────────── Kořenový reducer ─────────────────────

const CENTER_GROUP: GraphicId[] = ['intro', 'rosterHome', 'rosterAway', 'halftime', 'fulltime'];
const LOWER_GROUP: GraphicId[] = ['lowerPlayer', 'lowerOfficial'];

function bump(state: AppState, ts: number, patch: Partial<AppState>): AppState {
  return { ...state, ...patch, rev: state.rev + 1, updatedAt: ts };
}

export function reducer(state: AppState, action: Stamped): AppState {
  const ts = action.ts;

  if (isMatchAction(action)) {
    const ev = action as Stamped<MatchAction>;
    const events = [...state.events, ev];
    const { live, accepted } = replay(state.setup, events);
    if (accepted.length === state.events.length) return state; // neplatná akce – ignorovat
    const item = live.log[live.log.length - 1];
    let notification = state.notification;
    const kind = autoKindOf(ev);
    if (kind && state.auto[kind]) {
      notification = notificationFor({ ...state, live }, ev, item);
    }
    return bump(state, ts, { events: accepted, live, notification });
  }

  switch (action.type) {
    case 'UNDO': {
      if (state.events.length === 0) return state;
      const removed = state.events[state.events.length - 1];
      const events = state.events.slice(0, -1);
      const { live } = replay(state.setup, events);
      const notification = state.notification?.eventId === removed.id ? null : state.notification;
      return bump(state, ts, { events, live, notification });
    }

    case 'SHOW_GRAPHIC': {
      const on = { ...state.graphics.on };
      const group = CENTER_GROUP.includes(action.graphic) ? CENTER_GROUP : LOWER_GROUP.includes(action.graphic) ? LOWER_GROUP : [];
      for (const g of group) on[g] = false;
      on[action.graphic] = true;
      const graphics: GraphicsState = {
        ...state.graphics,
        on,
        lowerPlayer: action.lowerPlayer ?? state.graphics.lowerPlayer,
        officialIndex: action.officialIndex ?? state.graphics.officialIndex,
      };
      if (action.graphic === 'lowerPlayer' && !graphics.lowerPlayer) return state;
      return bump(state, ts, { graphics });
    }

    case 'HIDE_GRAPHIC':
      return bump(state, ts, { graphics: { ...state.graphics, on: { ...state.graphics.on, [action.graphic]: false } } });

    case 'HIDE_ALL':
      return bump(state, ts, { graphics: { ...state.graphics, on: initialGraphics().on }, notification: null });

    case 'SET_AUTO':
      return bump(state, ts, { auto: { ...state.auto, [action.kind]: action.value } });

    case 'SELECT_LOWER_PLAYER':
      return bump(state, ts, { graphics: { ...state.graphics, lowerPlayer: { side: action.side, playerId: action.playerId } } });

    case 'SELECT_OFFICIAL':
      return bump(state, ts, { graphics: { ...state.graphics, officialIndex: action.index } });

    case 'HIDE_NOTIFICATION':
      return state.notification ? bump(state, ts, { notification: null }) : state;

    case 'REPLAY_NOTIFICATION': {
      // Zopakuje poslední oznámitelnou událost (body, střídání, karta) bez ohledu na přepínače Auto.
      for (let i = state.events.length - 1; i >= 0; i--) {
        const ev = state.events[i];
        if (!autoKindOf(ev)) continue;
        const item = state.live.log.find((l) => l.eventId === ev.id);
        if (!item) continue;
        const n = notificationFor(state, ev, item);
        if (!n) return state;
        return bump(state, ts, { notification: { ...n, id: `${n.id}-r${ts}`, shownAt: ts, until: ts + NOTIFICATION_MS } });
      }
      return state;
    }

    case 'SET_SETUP': {
      const { live, accepted } = replay(action.setup, state.events);
      return bump(state, ts, { setup: action.setup, live, events: accepted });
    }

    case 'RESET_MATCH': {
      const fresh = createInitialState(state.setup);
      return bump(state, ts, { events: [], live: fresh.live, graphics: fresh.graphics, notification: null });
    }
  }
  return state;
}

export function lastUndoable(state: AppState): LogItem | null {
  return state.live.log[state.live.log.length - 1] ?? null;
}

export type { Side };
