import { useCallback, useEffect, useRef, useState } from 'react';
import { teamVars } from '../../components/color';
import { Icon } from '../../components/Icon';
import { activeYellowCards, displayMs, formatClock, formatShort, PERIOD_LABEL, PERIOD_SHORT } from '../../domain/clock';
import { POINTS, SCORE_LABEL, SCORE_ORDER } from '../../domain/rules';
import { findPlayer, matchSquad, SIDES } from '../../domain/roster';
import type { Action, AppState, CardKind, Player, ScoreKind, Side } from '../../domain/types';
import { useArmed } from '../../hooks/useArmed';
import { useMatch, useNow } from '../../hooks/useMatch';
import type { ConnectionInfo } from '../../sync';
import { Setup } from './Setup';
import './zapis.css';

type Sheet =
  | { kind: 'score'; side: Side; score: ScoreKind }
  | { kind: 'card'; side: Side; card: CardKind }
  | { kind: 'subOut'; side: Side }
  | { kind: 'subIn'; side: Side; outId: string };

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'warn' | 'undo';
}

const ASK_KEY = 'rupra:zapis:askPlayer';

function haptic(pattern: number | number[] = 25) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* nepodporováno */
  }
}

export default function Zapis() {
  const { state, dispatch, connection } = useMatch('zapis');
  const now = useNow(250);
  const [view, setView] = useState<'main' | 'setup'>('main');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [askPlayer, setAskPlayer] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ASK_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const toastTimer = useRef<number>();

  const notify = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const act = useCallback(
    (action: Action, text: string, tone: Toast['tone'] = 'ok') => {
      dispatch(action);
      haptic(tone === 'undo' ? [20, 40, 20] : 25);
      notify(text, tone);
    },
    [dispatch, notify],
  );

  const toggleAsk = () => {
    const v = !askPlayer;
    setAskPlayer(v);
    try {
      localStorage.setItem(ASK_KEY, v ? '1' : '0');
    } catch {
      /* ignorovat */
    }
  };

  const doScore = (side: Side, score: ScoreKind, player?: Player) => {
    const t = state.setup[side];
    act(
      { type: 'SCORE', side, kind: score, playerId: player?.id ?? null },
      `${SCORE_LABEL[score]} +${POINTS[score]} · ${t.short}${player ? ` · ${player.number} ${player.name}` : ''}`,
    );
  };

  const doCard = (side: Side, card: CardKind, player?: Player) => {
    const t = state.setup[side];
    act(
      { type: 'CARD', side, card, playerId: player?.id ?? null },
      `${card === 'yellow' ? 'Žlutá' : 'Červená'} karta · ${t.short}${player ? ` · ${player.number} ${player.name}` : ''}`,
      'warn',
    );
  };

  const onScoreTap = (side: Side, score: ScoreKind) => {
    if (askPlayer && score !== 'penaltytry') setSheet({ kind: 'score', side, score });
    else doScore(side, score);
  };

  const last = state.live.log[state.live.log.length - 1];

  if (view === 'setup') {
    return (
      <Setup
        state={state}
        onClose={() => setView('main')}
        onSave={(setup) => {
          dispatch({ type: 'SET_SETUP', setup });
          haptic();
          notify('Nastavení zápasu uloženo');
          setView('main');
        }}
        onReset={() => {
          dispatch({ type: 'RESET_MATCH' });
          haptic([20, 40, 20]);
          notify('Nový zápas – skóre a události vymazány', 'warn');
          setView('main');
        }}
      />
    );
  }

  return (
    <div className="zp">
      <StickyBar state={state} now={now} connection={connection} onSettings={() => setView('setup')} />

      {toast && (
        <div key={toast.id} className={`zp-toast is-${toast.tone}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      )}

      <main className="zp-main">
        {/* ── Body ── */}
        <section className="zp-sec">
          <div className="zp-sec-head">
            <h2>Body</h2>
            <button className={`zp-chip ${askPlayer ? 'is-on' : ''}`} onClick={toggleAsk} aria-pressed={askPlayer}>
              Výběr hráče: {askPlayer ? 'ANO' : 'NE'}
            </button>
          </div>
          <div className="zp-score-grid">
            {SIDES.map((side) => (
              <div key={side} className="zp-score-col" style={teamVars(state.setup[side].color)}>
                <div className="zp-col-head">{state.setup[side].short}</div>
                {SCORE_ORDER.map((k) => (
                  <button
                    key={k}
                    className={`zp-score-btn ${k === 'try' ? 'is-primary' : ''}`}
                    onClick={() => onScoreTap(side, k)}
                    disabled={state.live.period === 'ft'}
                  >
                    <span className="zp-score-pts">+{POINTS[k]}</span>
                    <span className="zp-score-lbl">{SCORE_LABEL[k]}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── Čas ── */}
        <section className="zp-sec">
          <div className="zp-sec-head">
            <h2>Čas</h2>
            <span className="zp-sec-meta">{PERIOD_LABEL[state.live.period]}</span>
          </div>
          <ClockControls state={state} act={act} />
        </section>

        {/* ── Akce ── */}
        <section className="zp-sec">
          <div className="zp-sec-head">
            <h2>Akce</h2>
          </div>
          <div className="zp-actions">
            {SIDES.map((side) => (
              <div key={side} className="zp-actions-col" style={teamVars(state.setup[side].color)}>
                <div className="zp-col-head">{state.setup[side].short}</div>
                <button className="zp-act-btn" onClick={() => setSheet({ kind: 'subOut', side })}>
                  <Icon name="sub" className="zp-act-ico" /> Střídání
                </button>
                <button className="zp-act-btn" onClick={() => setSheet({ kind: 'card', side, card: 'yellow' })}>
                  <i className="card-chip yellow" /> Žlutá karta
                </button>
                <button className="zp-act-btn" onClick={() => setSheet({ kind: 'card', side, card: 'red' })}>
                  <i className="card-chip red" /> Červená karta
                </button>
              </div>
            ))}
          </div>
          <ActiveCards state={state} now={now} />
        </section>

        {/* ── Časová osa ── */}
        <section className="zp-sec">
          <div className="zp-sec-head">
            <h2>Časová osa</h2>
            <span className="zp-sec-meta">{state.live.log.length} událostí</span>
          </div>
          <Timeline state={state} />
        </section>
      </main>

      {/* ── Spodní lišta: ZPĚT ── */}
      <div className="zp-bottom">
        <button
          className="zp-undo"
          disabled={!last}
          onClick={() => {
            if (!last) return;
            act({ type: 'UNDO' }, `Vráceno: ${last.title}${last.side ? ` · ${state.setup[last.side].short}` : ''}`, 'undo');
          }}
        >
          <Icon name="undo" className="zp-undo-ico" />
          <span className="zp-undo-txt">
            <b>ZPĚT</b>
            <span>{last ? `${last.minute} ${last.title}${last.side ? ` · ${state.setup[last.side].short}` : ''}` : 'Žádná akce'}</span>
          </span>
        </button>
      </div>

      {sheet && (
        <PlayerSheet
          sheet={sheet}
          state={state}
          onClose={() => setSheet(null)}
          onPick={(player) => {
            const s = sheet;
            if (s.kind === 'score') {
              doScore(s.side, s.score, player ?? undefined);
              setSheet(null);
            } else if (s.kind === 'card') {
              doCard(s.side, s.card, player ?? undefined);
              setSheet(null);
            } else if (s.kind === 'subOut' && player) {
              haptic(15);
              setSheet({ kind: 'subIn', side: s.side, outId: player.id });
            } else if (s.kind === 'subIn' && player) {
              const out = findPlayer(state.setup, s.side, s.outId);
              act(
                { type: 'SUB', side: s.side, outId: s.outId, inId: player.id },
                `Střídání ${state.setup[s.side].short}: ▲ ${player.number} za ▼ ${out?.number ?? '?'}`,
              );
              setSheet(null);
            }
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────── Horní lišta ─────────────────────────────

const CONN_LABEL = { online: 'Online', degraded: 'Bez spojení s režií', offline: 'Offline' } as const;

function StickyBar({
  state,
  now,
  connection,
  onSettings,
}: {
  state: AppState;
  now: number;
  connection: ConnectionInfo;
  onSettings: () => void;
}) {
  const { setup, live } = state;
  return (
    <header className="zp-bar">
      <div className="zp-bar-team" style={teamVars(setup.home.color)}>
        <span className="zp-bar-short">{setup.home.short}</span>
        <span className="zp-bar-score tabular">{live.score.home}</span>
      </div>
      <div className="zp-bar-mid">
        <span className={`zp-bar-time tabular ${live.clock.running ? 'is-running' : ''}`}>
          {formatClock(displayMs(live, setup.variant, now))}
        </span>
        <span className="zp-bar-period">
          <span className={`conn-dot ${connection.status}`} title={CONN_LABEL[connection.status]} />
          {PERIOD_SHORT[live.period]}
        </span>
      </div>
      <div className="zp-bar-team is-away" style={teamVars(setup.away.color)}>
        <span className="zp-bar-score tabular">{live.score.away}</span>
        <span className="zp-bar-short">{setup.away.short}</span>
      </div>
      <button className="zp-bar-gear" onClick={onSettings} aria-label="Nastavení zápasu">
        <Icon name="gear" />
      </button>
      <span className="sr-only" aria-live="polite">
        Stav připojení: {CONN_LABEL[connection.status]}
      </span>
    </header>
  );
}

// ───────────────────────────── Časomíra ─────────────────────────────

function ClockControls({ state, act }: { state: AppState; act: (a: Action, t: string, tone?: Toast['tone']) => void }) {
  const { live } = state;
  const running = live.clock.running;
  const nextLabel =
    live.period === 'pre'
      ? 'Připravit 1. poločas'
      : live.period === 'h1'
        ? 'Konec 1. poločasu'
        : live.period === 'ht'
          ? 'Zahájit 2. poločas'
          : live.period === 'h2'
            ? 'Konec zápasu'
            : 'Zápas skončil';
  const startLabel = live.period === 'pre' ? 'VÝKOP' : live.period === 'ht' ? 'START 2. POL.' : 'START';
  const { armed, guard } = useArmed();
  const needsConfirm = live.period === 'h1' || live.period === 'h2';

  return (
    <div className="zp-clock">
      <button
        className={`zp-clock-main ${running ? 'is-stop' : 'is-start'}`}
        disabled={live.period === 'ft'}
        onClick={() =>
          running
            ? act({ type: 'CLOCK_STOP' }, 'Čas zastaven', 'warn')
            : act({ type: 'CLOCK_START' }, live.period === 'pre' ? 'Výkop – čas běží' : 'Čas spuštěn')
        }
      >
        <Icon name={running ? 'pause' : 'play'} className="zp-clock-ico" />
        {running ? 'STOP' : startLabel}
      </button>
      <button
        className={`zp-clock-next ${armed === 'next' ? 'is-armed' : ''}`}
        disabled={live.period === 'ft'}
        onClick={() => {
          const run = () => act({ type: 'NEXT_HALF' }, nextLabel);
          if (needsConfirm) guard('next', run);
          else run();
        }}
      >
        <Icon name="next" /> {armed === 'next' ? `Opravdu? Klepněte znovu – ${nextLabel.toLowerCase()}` : nextLabel}
      </button>
    </div>
  );
}

// ───────────────────────────── Karty ─────────────────────────────

function ActiveCards({ state, now }: { state: AppState; now: number }) {
  const ys = activeYellowCards(state, now);
  const reds = state.live.cards.filter((c) => c.kind === 'red');
  if (!ys.length && !reds.length) return null;
  return (
    <ul className="zp-cards">
      {ys.map(({ card, remaining }) => {
        const p = findPlayer(state.setup, card.side, card.playerId);
        return (
          <li key={card.id} style={teamVars(state.setup[card.side].color)}>
            <i className="card-chip yellow" />
            <b>{state.setup[card.side].short}</b>
            <span>{p ? `${p.number} ${p.name}` : 'Hráč neurčen'}</span>
            <span className="zp-cards-time tabular">{formatShort(remaining)}</span>
          </li>
        );
      })}
      {reds.map((card) => {
        const p = findPlayer(state.setup, card.side, card.playerId);
        return (
          <li key={card.id} style={teamVars(state.setup[card.side].color)}>
            <i className="card-chip red" />
            <b>{state.setup[card.side].short}</b>
            <span>{p ? `${p.number} ${p.name}` : 'Hráč neurčen'}</span>
            <span className="zp-cards-time is-red">mimo</span>
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────────── Časová osa ─────────────────────────────

function Timeline({ state }: { state: AppState }) {
  const items = [...state.live.log].reverse();
  if (!items.length) return <p className="zp-empty">Zatím žádné události. Začněte tlačítkem VÝKOP.</p>;
  return (
    <ol className="zp-timeline">
      {items.map((l, i) => (
        <li key={l.eventId} className={i === 0 ? 'is-last' : ''} style={l.side ? teamVars(state.setup[l.side].color) : undefined}>
          <span className="zp-tl-min tabular">{l.minute}</span>
          <span className={`zp-tl-ico ${l.side ? 'has-team' : ''}`}>
            <Icon name={l.icon} />
          </span>
          <span className="zp-tl-text">
            <b>
              {l.title}
              {l.points ? <em> +{l.points}</em> : null}
              {l.side && <span className="zp-tl-team"> · {state.setup[l.side].short}</span>}
            </b>
            {l.detail && <span>{l.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ───────────────────────────── Výběr hráče ─────────────────────────────

function PlayerSheet({
  sheet,
  state,
  onClose,
  onPick,
}: {
  sheet: Sheet;
  state: AppState;
  onClose: () => void;
  onPick: (p: Player | null) => void;
}) {
  const { setup, live } = state;
  const team = setup[sheet.side];
  const squad = matchSquad(team, setup);
  const onField = new Set(live.onField[sheet.side]);
  const sentOff = new Set(live.sentOff[sheet.side]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  let title = '';
  let subtitle = '';
  let players: Player[] = [];
  let allowNone = true;
  switch (sheet.kind) {
    case 'score':
      title = `${SCORE_LABEL[sheet.score]} +${POINTS[sheet.score]}`;
      subtitle = 'Kdo skóroval?';
      players = squad.filter((p) => onField.has(p.id));
      break;
    case 'card':
      title = sheet.card === 'yellow' ? 'Žlutá karta' : 'Červená karta';
      subtitle = 'Komu?';
      players = squad.filter((p) => onField.has(p.id));
      break;
    case 'subOut':
      title = 'Střídání';
      subtitle = '1/2 · Kdo jde VEN?';
      players = squad.filter((p) => onField.has(p.id));
      allowNone = false;
      break;
    case 'subIn': {
      const out = findPlayer(setup, sheet.side, sheet.outId);
      title = `Střídání · ▼ ${out?.number ?? ''} ${out?.name ?? ''}`;
      subtitle = '2/2 · Kdo jde DOVNITŘ?';
      players = squad.filter((p) => !onField.has(p.id) && !sentOff.has(p.id));
      allowNone = false;
      break;
    }
  }

  const yellowIds = new Set(
    activeYellowCards(state, Date.now())
      .filter((y) => y.card.side === sheet.side)
      .map((y) => y.card.playerId),
  );

  return (
    <div className="zp-sheet-backdrop" onClick={onClose}>
      <div
        className="zp-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={teamVars(team.color)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="zp-sheet-head">
          <div>
            <div className="zp-sheet-team">{team.name}</div>
            <div className="zp-sheet-title">{title}</div>
            <div className="zp-sheet-sub">{subtitle}</div>
          </div>
          <button className="zp-sheet-close" onClick={onClose} aria-label="Zavřít">
            <Icon name="close" />
          </button>
        </div>
        <div className="zp-jerseys">
          {players.map((p) => (
            <button key={p.id} className={`zp-jersey ${yellowIds.has(p.id) ? 'has-yellow' : ''}`} onClick={() => onPick(p)}>
              <span className="zp-jersey-num tabular">{p.number}</span>
              <span className="zp-jersey-name">{p.name.split(' ').slice(-1)[0]}</span>
            </button>
          ))}
          {players.length === 0 && <p className="zp-empty">Žádní dostupní hráči.</p>}
        </div>
        <div className="zp-sheet-foot">
          {allowNone && (
            <button className="zp-sheet-none" onClick={() => onPick(null)}>
              Bez hráče
            </button>
          )}
          <button className="zp-sheet-cancel" onClick={onClose}>
            Zrušit
          </button>
        </div>
      </div>
    </div>
  );
}
