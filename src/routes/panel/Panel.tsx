import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { teamVars } from '../../components/color';
import { Icon } from '../../components/Icon';
import { activeYellowCards, displayMs, formatClock, formatShort, PERIOD_LABEL } from '../../domain/clock';
import { download, toJSON, toXML } from '../../domain/exporters';
import { VARIANTS } from '../../domain/rules';
import { findPlayer, matchSquad, SIDES } from '../../domain/roster';
import type { Action, AppState, AutoKind, GraphicId, Side } from '../../domain/types';
import { useMatch, useNow } from '../../hooks/useMatch';
import type { ConnectionInfo } from '../../sync';
import './panel.css';

interface TileDef {
  key: string;
  id: GraphicId | 'replay';
  title: (s: AppState) => string;
  hint: string;
}

const TILES: TileDef[] = [
  { key: '1', id: 'scorebug', title: () => 'Scorebug', hint: 'Skóre a čas vlevo nahoře' },
  { key: '2', id: 'intro', title: () => 'Úvodní karta', hint: 'Týmy, soutěž a místo' },
  { key: '3', id: 'rosterHome', title: (s) => `Soupiska ${s.setup.home.short}`, hint: 'Domácí – sestava a náhradníci' },
  { key: '4', id: 'rosterAway', title: (s) => `Soupiska ${s.setup.away.short}`, hint: 'Hosté – sestava a náhradníci' },
  { key: '5', id: 'lowerPlayer', title: () => 'Titulek hráče', hint: 'Spodní titulek – vyberte hráče' },
  { key: '6', id: 'lowerOfficial', title: () => 'Titulek rozhodčího', hint: 'Spodní titulek – rozhodčí' },
  { key: '7', id: 'halftime', title: () => 'Skóre o poločase', hint: 'Výsledek a body 1. poločasu' },
  { key: '8', id: 'fulltime', title: () => 'Konečné skóre', hint: 'Výsledek a autoři bodů' },
  { key: '9', id: 'replay', title: () => 'Zopakovat oznámení', hint: 'Poslední body / karta / střídání' },
];

const AUTO_LABEL: Record<AutoKind, string> = { score: 'Body', sub: 'Střídání', card: 'Karty' };

export default function Panel() {
  const { state, dispatch, connection } = useMatch('panel');
  const now = useNow(200);

  // Klávesové zkratky 1–9, Esc = skrýt vše
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        dispatch({ type: 'HIDE_ALL' });
        e.preventDefault();
        return;
      }
      const tile = TILES.find((t) => t.key === e.key);
      if (tile) {
        e.preventDefault();
        triggerTile(tile, state, dispatch);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, dispatch]);

  return (
    <div className="pn">
      <Header state={state} connection={connection} now={now} dispatch={dispatch} />
      <main className="pn-main">
        <aside className="pn-left">
          <LiveBlock state={state} now={now} />
          <CardsBlock state={state} now={now} />
          <EventsBlock state={state} />
        </aside>
        <section className="pn-center">
          <Preview />
          <AutoBlock state={state} now={now} dispatch={dispatch} />
        </section>
        <aside className="pn-right">
          <div className="pn-right-head">
            <h2 className="pn-h">Grafiky</h2>
            <button className="pn-btn pn-btn-ghost" onClick={() => dispatch({ type: 'HIDE_ALL' })} title="Esc">
              Skrýt vše <kbd>Esc</kbd>
            </button>
          </div>
          <div className="pn-tiles">
            {TILES.map((t) => (
              <Tile key={t.id} tile={t} state={state} dispatch={dispatch} />
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

function triggerTile(tile: TileDef, state: AppState, dispatch: (a: Action) => void) {
  if (tile.id === 'replay') {
    dispatch({ type: 'REPLAY_NOTIFICATION' });
    return;
  }
  const on = state.graphics.on[tile.id];
  if (on) {
    dispatch({ type: 'HIDE_GRAPHIC', graphic: tile.id });
    return;
  }
  if (tile.id === 'lowerPlayer' && !state.graphics.lowerPlayer) {
    const first = matchSquad(state.setup.home, state.setup)[0];
    if (!first) return;
    dispatch({ type: 'SHOW_GRAPHIC', graphic: 'lowerPlayer', lowerPlayer: { side: 'home', playerId: first.id } });
    return;
  }
  dispatch({ type: 'SHOW_GRAPHIC', graphic: tile.id });
}

// ───────────────────────────── Hlavička ─────────────────────────────

function Header({
  state,
  connection,
  now,
  dispatch,
}: {
  state: AppState;
  connection: ConnectionInfo;
  now: number;
  dispatch: (a: Action) => void;
}) {
  const stamp = new Date(now).toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const anyOn = Object.values(state.graphics.on).some(Boolean);
  return (
    <header className="pn-header">
      <div className="pn-brand">
        <span className="pn-logo">
          <svg viewBox="0 0 64 64" aria-hidden>
            <path d="M14 50 26 14h12l-4 12h16L38 50H26l4-12H18z" fill="currentColor" />
          </svg>
          RUPRA
        </span>
        <span className="pn-badge">GAMA</span>
      </div>
      <div className="pn-match">
        <span className="pn-match-teams">
          <i style={{ background: state.setup.home.color }} />
          {state.setup.home.name}
          <span className="pn-match-vs">vs</span>
          {state.setup.away.name}
          <i style={{ background: state.setup.away.color }} />
        </span>
        <span className="pn-match-meta">
          {state.setup.competition} · {VARIANTS[state.setup.variant].label}
        </span>
      </div>
      <div className={`pn-onair ${anyOn ? 'is-on' : ''}`}>
        <i /> {anyOn ? 'ON AIR' : 'ČISTÝ VÝSTUP'}
      </div>
      <div className="pn-conn">
        <span className="pn-conn-item" title="Zapisovatel na stadionu">
          <span className={`conn-dot ${connection.peers.zapis > 0 ? 'online' : 'offline'}`} />
          Zápis
        </span>
        <span className="pn-conn-item" title="Otevřené výstupy /overlay (včetně náhledu)">
          <span className={`conn-dot ${connection.peers.overlay > 0 ? 'online' : 'degraded'}`} />
          Overlay {connection.peers.overlay > 0 && <b>{connection.peers.overlay}</b>}
        </span>
      </div>
      <div className="pn-actions">
        <button className="pn-btn" onClick={() => download(`rupra-${stamp}.json`, toJSON(state), 'application/json')}>
          <Icon name="download" /> Stáhnout JSON
        </button>
        <button className="pn-btn" onClick={() => download(`rupra-${stamp}.xml`, toXML(state), 'application/xml')}>
          <Icon name="download" /> Stáhnout XML
        </button>
        <a className="pn-btn pn-btn-ghost" href="/overlay" target="_blank" rel="noreferrer">
          <Icon name="external" /> Overlay
        </a>
        <a className="pn-btn pn-btn-ghost" href="/zapis" target="_blank" rel="noreferrer">
          <Icon name="external" /> Zápis
        </a>
        <button
          className="pn-btn pn-btn-ghost"
          title="Vymaže události a skóre (soupisky zůstanou)"
          onClick={() => {
            if (confirm('Opravdu začít nový zápas? Skóre i události se vymažou.')) dispatch({ type: 'RESET_MATCH' });
          }}
        >
          Nový zápas
        </button>
      </div>
    </header>
  );
}

// ───────────────────────────── Levý sloupec ─────────────────────────────

function LiveBlock({ state, now }: { state: AppState; now: number }) {
  const { setup, live } = state;
  return (
    <section className="pn-block">
      <h2 className="pn-h">Živá data</h2>
      <div className="pn-score">
        {SIDES.map((side) => (
          <div key={side} className="pn-score-team" style={teamVars(setup[side].color)}>
            <span className="pn-score-short">{setup[side].short}</span>
            <span className="pn-score-num tabular">{live.score[side]}</span>
            <span className="pn-score-name">{setup[side].name}</span>
            <span className="pn-score-tries">Položení: {live.stats[side].tries}</span>
          </div>
        ))}
      </div>
      <div className="pn-clock">
        <span className={`pn-clock-time tabular ${live.clock.running ? 'is-running' : ''}`}>
          {formatClock(displayMs(live, setup.variant, now))}
        </span>
        <span className="pn-clock-meta">
          <span className={`pn-run ${live.clock.running ? 'is-running' : ''}`}>
            <i /> {live.clock.running ? 'Čas běží' : 'Čas stojí'}
          </span>
          <span>{PERIOD_LABEL[live.period]}</span>
        </span>
      </div>
      {live.halftimeScore && (
        <div className="pn-ht">
          Poločas {live.halftimeScore.home}:{live.halftimeScore.away}
        </div>
      )}
    </section>
  );
}

function CardsBlock({ state, now }: { state: AppState; now: number }) {
  const yellows = activeYellowCards(state, now);
  const reds = state.live.cards.filter((c) => c.kind === 'red');
  return (
    <section className="pn-block">
      <h2 className="pn-h">Karty</h2>
      {yellows.length === 0 && reds.length === 0 && <p className="pn-empty">Žádné aktivní karty</p>}
      <ul className="pn-cards">
        {yellows.map(({ card, remaining }) => {
          const p = findPlayer(state.setup, card.side, card.playerId);
          return (
            <li key={card.id}>
              <i className="card-chip yellow" />
              <span className="pn-cards-team" style={{ color: state.setup[card.side].color }}>
                {state.setup[card.side].short}
              </span>
              <span className="pn-cards-name">{p ? `${p.number} ${p.name}` : 'Hráč neurčen'}</span>
              <span className="pn-cards-time tabular">{formatShort(remaining)}</span>
            </li>
          );
        })}
        {reds.map((card) => {
          const p = findPlayer(state.setup, card.side, card.playerId);
          return (
            <li key={card.id}>
              <i className="card-chip red" />
              <span className="pn-cards-team" style={{ color: state.setup[card.side].color }}>
                {state.setup[card.side].short}
              </span>
              <span className="pn-cards-name">{p ? `${p.number} ${p.name}` : 'Hráč neurčen'}</span>
              <span className="pn-cards-time">vyloučen</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EventsBlock({ state }: { state: AppState }) {
  const items = state.live.log.slice(-10).reverse();
  return (
    <section className="pn-block pn-block-grow">
      <h2 className="pn-h">
        Posledních 10 událostí <span className="pn-h-count">{state.live.log.length}</span>
      </h2>
      {items.length === 0 && <p className="pn-empty">Zatím žádné události</p>}
      <ol className="pn-events">
        {items.map((l) => (
          <li key={l.eventId} style={l.side ? teamVars(state.setup[l.side].color) : undefined} className={l.side ? 'has-team' : ''}>
            <span className="pn-ev-min tabular">{l.minute}</span>
            <Icon name={l.icon} className="pn-ev-ico" />
            <span className="pn-ev-text">
              <b>
                {l.title}
                {l.points ? ` +${l.points}` : ''}
              </b>
              {l.detail && <span>{l.detail}</span>}
            </span>
            {l.side && <span className="pn-ev-team">{state.setup[l.side].short}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ───────────────────────────── Střed ─────────────────────────────

function Preview() {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    ro.observe(el);
    setScale(el.clientWidth / 1920);
    return () => ro.disconnect();
  }, []);
  return (
    <section className="pn-block pn-preview-block">
      <h2 className="pn-h">
        Náhled výstupu <span className="pn-h-meta">1920 × 1080 · průhledné pozadí</span>
      </h2>
      <div className="pn-preview" ref={box}>
        <iframe
          title="Náhled overlaye"
          src="/overlay"
          width={1920}
          height={1080}
          style={{ transform: `scale(${scale})` }}
          tabIndex={-1}
        />
        <div className="pn-safe" aria-hidden />
      </div>
    </section>
  );
}

function AutoBlock({ state, now, dispatch }: { state: AppState; now: number; dispatch: (a: Action) => void }) {
  const n = state.notification && now < state.notification.until ? state.notification : null;
  const left = n ? Math.ceil((n.until - now) / 1000) : 0;
  return (
    <section className="pn-block pn-auto">
      <div className="pn-auto-left">
        <h2 className="pn-h">Automatická oznámení</h2>
        <div className="pn-auto-toggles">
          {(Object.keys(AUTO_LABEL) as AutoKind[]).map((k) => (
            <label key={k} className={`pn-switch ${state.auto[k] ? 'is-on' : ''}`}>
              <input
                type="checkbox"
                checked={state.auto[k]}
                onChange={(e) => dispatch({ type: 'SET_AUTO', kind: k, value: e.target.checked })}
              />
              <span className="pn-switch-track">
                <span className="pn-switch-thumb" />
              </span>
              <span>Auto · {AUTO_LABEL[k]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={`pn-notif ${n ? 'is-on' : ''}`}>
        {n ? (
          <>
            <span className="pn-notif-tag">ON AIR · {left} s</span>
            <span className="pn-notif-text">
              <b>{n.title}</b> {n.line}
            </span>
            <button className="pn-btn pn-btn-sm" onClick={() => dispatch({ type: 'HIDE_NOTIFICATION' })}>
              Skrýt
            </button>
          </>
        ) : (
          <span className="pn-notif-idle">Oznámení se zobrazí na 6 s po zápisu bodů, střídání nebo karty.</span>
        )}
      </div>
    </section>
  );
}

// ───────────────────────────── Dlaždice ─────────────────────────────

function Tile({ tile, state, dispatch }: { tile: TileDef; state: AppState; dispatch: (a: Action) => void }) {
  const isReplay = tile.id === 'replay';
  const on = !isReplay && state.graphics.on[tile.id as GraphicId];
  const canReplay = state.live.log.some((l) => l.type === 'SCORE' || l.type === 'SUB' || l.type === 'CARD');

  return (
    <div className={`pn-tile ${on ? 'is-on' : ''}`}>
      <div className="pn-tile-head">
        <kbd className="pn-tile-key">{tile.key}</kbd>
        <div className="pn-tile-title">
          <b>{tile.title(state)}</b>
          <span>{tile.hint}</span>
        </div>
        {on && <span className="pn-tile-live">ON AIR</span>}
      </div>

      {tile.id === 'lowerPlayer' && <PlayerPicker state={state} dispatch={dispatch} />}
      {tile.id === 'lowerOfficial' && (
        <select
          className="pn-select"
          value={state.graphics.officialIndex}
          onChange={(e) => dispatch({ type: 'SELECT_OFFICIAL', index: Number(e.target.value) })}
        >
          {state.setup.officials.map((o, i) => (
            <option key={i} value={i}>
              {o.name} – {o.role}
            </option>
          ))}
        </select>
      )}

      <button
        className={`pn-tile-btn ${on ? 'is-on' : ''}`}
        disabled={isReplay && !canReplay}
        onClick={() => triggerTile(tile, state, dispatch)}
      >
        {isReplay ? 'ZOPAKOVAT' : on ? 'SKRÝT' : 'ZOBRAZIT'}
      </button>
    </div>
  );
}

function PlayerPicker({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const sel = state.graphics.lowerPlayer;
  const side: Side = sel?.side ?? 'home';
  const squad = matchSquad(state.setup[side], state.setup);
  return (
    <div className="pn-picker">
      <div className="pn-seg">
        {SIDES.map((s) => (
          <button
            key={s}
            className={side === s ? 'is-active' : ''}
            style={teamVars(state.setup[s].color)}
            onClick={() => {
              const first = matchSquad(state.setup[s], state.setup)[0];
              if (first) dispatch({ type: 'SELECT_LOWER_PLAYER', side: s, playerId: first.id });
            }}
          >
            {state.setup[s].short}
          </button>
        ))}
      </div>
      <select
        className="pn-select"
        value={sel?.playerId ?? ''}
        onChange={(e) => dispatch({ type: 'SELECT_LOWER_PLAYER', side, playerId: e.target.value })}
      >
        {!sel && <option value="">— vyberte hráče —</option>}
        {squad.map((p) => (
          <option key={p.id} value={p.id}>
            {p.number}. {p.name} ({p.position})
          </option>
        ))}
      </select>
    </div>
  );
}
