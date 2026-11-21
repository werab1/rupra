// ───────────────────────── Základní entity ─────────────────────────

export type Side = 'home' | 'away';
export type Variant = 'xv' | 'sevens';

export interface Player {
  id: string;
  number: number;
  name: string;
  position: string;
}

export interface TeamSetup {
  name: string;
  /** Zkratka – 3 písmena, verzálky */
  short: string;
  /** Barva týmu (#rrggbb) */
  color: string;
  /** Pořadí je důležité: prvních N = základ, dalších M = náhradníci (dle varianty) */
  roster: Player[];
}

export interface Official {
  name: string;
  role: string;
}

export interface MatchSetup {
  variant: Variant;
  competition: string;
  venue: string;
  home: TeamSetup;
  away: TeamSetup;
  officials: Official[];
}

// ───────────────────────── Akce ─────────────────────────

export type ScoreKind = 'try' | 'conversion' | 'penalty' | 'dropgoal' | 'penaltytry';
export type CardKind = 'yellow' | 'red';
export type Period = 'pre' | 'h1' | 'ht' | 'h2' | 'ft';

export type GraphicId =
  | 'scorebug'
  | 'intro'
  | 'rosterHome'
  | 'rosterAway'
  | 'lowerPlayer'
  | 'lowerOfficial'
  | 'halftime'
  | 'fulltime';

export type AutoKind = 'score' | 'sub' | 'card';

/** Akce měnící průběh zápasu – logují se a jdou vrátit přes UNDO. */
export type MatchAction =
  | { type: 'SCORE'; side: Side; kind: ScoreKind; playerId?: string | null }
  | { type: 'CLOCK_START' }
  | { type: 'CLOCK_STOP' }
  | { type: 'NEXT_HALF' }
  | { type: 'SUB'; side: Side; outId: string; inId: string }
  | { type: 'CARD'; side: Side; card: CardKind; playerId?: string | null };

/** Režijní a správní akce – nemění skóre, UNDO je nepřeskakuje do historie zápasu. */
export type ControlAction =
  | { type: 'UNDO' }
  | { type: 'SHOW_GRAPHIC'; graphic: GraphicId; lowerPlayer?: { side: Side; playerId: string }; officialIndex?: number }
  | { type: 'HIDE_GRAPHIC'; graphic: GraphicId }
  | { type: 'HIDE_ALL' }
  | { type: 'SET_AUTO'; kind: AutoKind; value: boolean }
  | { type: 'SELECT_LOWER_PLAYER'; side: Side; playerId: string }
  | { type: 'SELECT_OFFICIAL'; index: number }
  | { type: 'HIDE_NOTIFICATION' }
  | { type: 'REPLAY_NOTIFICATION' }
  | { type: 'SET_SETUP'; setup: MatchSetup }
  | { type: 'RESET_MATCH' };

export type Action = MatchAction | ControlAction;

/** Každá akce dostane při odeslání id a časové razítko (ms od epochy). */
export type Stamped<A extends Action = Action> = A & { id: string; ts: number };

// ───────────────────────── Odvozený živý stav ─────────────────────────

export interface ClockState {
  running: boolean;
  /** Razítko posledního spuštění (jen když running) */
  startedAt: number | null;
  /** Nashromážděný čas v aktuálním poločase (bez právě běžícího úseku) */
  halfAccMs: number;
  /** Součet čistého času předchozích poločasů – pro odpočet karet */
  prevHalvesMs: number;
}

export interface CardRecord {
  id: string;
  side: Side;
  kind: CardKind;
  playerId: string | null;
  /** Čistý hrací čas (runMs) v okamžiku udělení */
  issuedRunMs: number;
  /** Délka vyloučení v ms (0 = červená, trvale) */
  durationMs: number;
  ts: number;
}

export interface TeamStats {
  tries: number;
  conversions: number;
  penalties: number;
  dropGoals: number;
  penaltyTries: number;
}

export interface LogItem {
  eventId: string;
  ts: number;
  /** Herní minuta, např. "23'" */
  minute: string;
  type: MatchAction['type'];
  side: Side | null;
  icon: 'try' | 'kick' | 'card-yellow' | 'card-red' | 'sub' | 'clock' | 'period';
  title: string;
  detail: string;
  points?: number;
}

export interface LiveState {
  score: Record<Side, number>;
  period: Period;
  clock: ClockState;
  onField: Record<Side, string[]>;
  sentOff: Record<Side, string[]>;
  cards: CardRecord[];
  stats: Record<Side, TeamStats>;
  halftimeScore: Record<Side, number> | null;
  log: LogItem[];
}

export interface GraphicsState {
  on: Record<GraphicId, boolean>;
  lowerPlayer: { side: Side; playerId: string } | null;
  officialIndex: number;
}

export interface Notification {
  id: string;
  eventId: string | null;
  kind: AutoKind;
  side: Side | null;
  title: string;
  /** Hlavní řádek (jméno hráče nebo tým) */
  line: string;
  /** Doplňující řádek (např. "+5", "ven: …") */
  sub: string;
  icon: LogItem['icon'];
  shownAt: number;
  until: number;
}

export interface AppState {
  schema: 1;
  /** Monotónní revize – vyšší vyhrává při synchronizaci */
  rev: number;
  updatedAt: number;
  setup: MatchSetup;
  /** Log zápasových událostí (zdroj pravdy, živý stav se z něj přepočítává) */
  events: Stamped<MatchAction>[];
  live: LiveState;
  graphics: GraphicsState;
  auto: Record<AutoKind, boolean>;
  notification: Notification | null;
}
