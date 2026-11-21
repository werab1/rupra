import { useEffect, useRef, useState } from 'react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { teamVars } from '../../components/color';
import { Icon } from '../../components/Icon';
import { Presence, useLatest } from '../../components/Presence';
import { activeYellowCards, displayMs, formatClock, formatShort, PERIOD_SHORT } from '../../domain/clock';
import { VARIANTS } from '../../domain/rules';
import { bench, findPlayer, starters, surname } from '../../domain/roster';
import type { AppState, LogItem, Notification, Side } from '../../domain/types';
import { useMatch, useNow } from '../../hooks/useMatch';
import './overlay.css';

export default function Overlay() {
  const { state } = useMatch('overlay');
  const now = useNow(200);
  const g = state.graphics.on;
  const notifActive = state.notification && now < state.notification.until ? state.notification : null;

  return (
    <div className="ov-root">
      {/* Levý horní roh: scorebug a pod ním oznámení (skládají se pod sebe) */}
      <div className="ov-topleft">
        <Presence show={g.scorebug} className="ov-sb-wrap" exitMs={600}>
          <Scorebug state={state} now={now} />
        </Presence>
        <NotificationBanner n={notifActive} state={state} />
      </div>

      <Presence show={g.intro} className="ov-center" exitMs={650}>
        <IntroCard state={state} />
      </Presence>

      <Presence show={g.rosterHome} className="ov-center" exitMs={650}>
        <Roster state={state} side="home" />
      </Presence>
      <Presence show={g.rosterAway} className="ov-center" exitMs={650}>
        <Roster state={state} side="away" />
      </Presence>

      <Presence show={g.halftime} className="ov-center" exitMs={650}>
        <ScoreSummary state={state} kind="halftime" />
      </Presence>
      <Presence show={g.fulltime} className="ov-center" exitMs={650}>
        <ScoreSummary state={state} kind="fulltime" />
      </Presence>

      <LowerThirdPlayer state={state} show={g.lowerPlayer} />
      <LowerThirdOfficial state={state} show={g.lowerOfficial} />
    </div>
  );
}

// ───────────────────────────── Scorebug ─────────────────────────────

function useFlash(value: number) {
  const [k, setK] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setK((x) => x + 1);
    }
  }, [value]);
  return k;
}

function ScoreCell({ side, state }: { side: Side; state: AppState }) {
  const score = state.live.score[side];
  const flash = useFlash(score);
  return (
    <div className="sb-score tabular">
      {flash > 0 && <span key={flash} className="sb-flash" />}
      <AnimatedNumber value={score} />
    </div>
  );
}

function Scorebug({ state, now }: { state: AppState; now: number }) {
  const { setup, live } = state;
  const clock = displayMs(live, setup.variant, now);
  const yellows = activeYellowCards(state, now);
  const reds = live.cards.filter((c) => c.kind === 'red');
  const showTime = live.period === 'h1' || live.period === 'h2' || live.period === 'pre';

  const team = (side: Side) => {
    const t = setup[side];
    return (
      <div className={`sb-team sb-${side}`} style={teamVars(t.color)}>
        <i className="sb-bar" />
        <span className="sb-abbr">{t.short}</span>
      </div>
    );
  };

  const cardRow = (side: Side) => {
    const ys = yellows.filter((y) => y.card.side === side);
    const rs = reds.filter((c) => c.side === side);
    if (!ys.length && !rs.length) return <div className={`sb-cards sb-cards-${side}`} />;
    return (
      <div className={`sb-cards sb-cards-${side}`}>
        {ys.map((y) => {
          const p = findPlayer(setup, side, y.card.playerId);
          return (
            <span key={y.card.id} className="sb-card">
              <i className="card-chip yellow" />
              {p && <b>{p.number}</b>}
              <span className="tabular">{formatShort(y.remaining)}</span>
            </span>
          );
        })}
        {rs.map((c) => {
          const p = findPlayer(setup, side, c.playerId);
          return (
            <span key={c.id} className="sb-card">
              <i className="card-chip red" />
              {p && <b>{p.number}</b>}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="sb">
      <div className="sb-main">
        {team('home')}
        <ScoreCell side="home" state={state} />
        <ScoreCell side="away" state={state} />
        <div className="sb-team-r">{team('away')}</div>
        <div className={`sb-clock ${live.clock.running ? 'is-running' : ''}`}>
          {showTime ? (
            <>
              <span className="sb-time tabular">{formatClock(clock)}</span>
              <span className="sb-period">{PERIOD_SHORT[live.period]}</span>
            </>
          ) : (
            <span className="sb-time sb-time-label">{PERIOD_SHORT[live.period]}</span>
          )}
        </div>
      </div>
      <div className="sb-cards-row">
        {cardRow('home')}
        {cardRow('away')}
      </div>
    </div>
  );
}

// ───────────────────────────── Oznámení ─────────────────────────────

function NotificationBanner({ n, state }: { n: Notification | null; state: AppState }) {
  const last = useLatest(n);
  // Změna oznámení během zobrazení → krátce skrýt a znovu zobrazit (čistý přechod).
  const [shownId, setShownId] = useState<string | null>(n?.id ?? null);
  useEffect(() => {
    if (!n) {
      setShownId(null);
      return;
    }
    if (shownId && shownId !== n.id) {
      setShownId(null);
      const t = window.setTimeout(() => setShownId(n.id), 450);
      return () => window.clearTimeout(t);
    }
    setShownId(n.id);
  }, [n?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!last) return null;
  const t = last.side ? state.setup[last.side] : null;
  const iconCls = last.icon === 'card-yellow' ? 'is-yellow' : last.icon === 'card-red' ? 'is-red' : '';
  return (
    <Presence
      show={!!n && shownId === n.id}
      className="ov-notif"
      exitMs={500}
      style={t ? teamVars(t.color) : undefined}
    >
      <div className="nt">
        <div className={`nt-icon ${iconCls}`}>
          <Icon name={last.icon} className="nt-ico" />
        </div>
        <div className="nt-body">
          <div className="nt-title">
            {last.title}
            {t && <span className="nt-team">{t.short}</span>}
          </div>
          <div className="nt-line">{last.line}</div>
          {last.sub && <div className="nt-sub">{last.sub}</div>}
        </div>
      </div>
    </Presence>
  );
}

// ───────────────────────────── Úvodní karta ─────────────────────────────

function IntroCard({ state }: { state: AppState }) {
  const { setup } = state;
  const date = new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
  const team = (side: Side) => {
    const t = setup[side];
    return (
      <div className={`in-team in-${side}`} style={teamVars(t.color)}>
        <div className="in-badge">
          <span>{t.short}</span>
        </div>
        <div className="in-name">{t.name}</div>
      </div>
    );
  };
  return (
    <div className="in">
      <div className="in-top">
        <span className="in-comp">{setup.competition}</span>
      </div>
      <div className="in-row">
        {team('home')}
        <div className="in-vs">VS</div>
        {team('away')}
      </div>
      <div className="in-bottom">
        <span>{setup.venue}</span>
        <i />
        <span>{date}</span>
        <i />
        <span>{VARIANTS[setup.variant].label}</span>
      </div>
    </div>
  );
}

// ───────────────────────────── Soupiska ─────────────────────────────

function Roster({ state, side }: { state: AppState; side: Side }) {
  const { setup } = state;
  const t = setup[side];
  const xi = starters(t, setup);
  const subs = bench(t, setup);
  const row = (p: (typeof xi)[number], i: number) => {
    const parts = p.name.trim().split(/\s+/);
    const last = parts.pop() ?? '';
    return (
      <li key={p.id} className="ro-row" style={{ ['--i' as string]: i }}>
        <span className="ro-num tabular">{p.number}</span>
        <span className="ro-name">
          <span className="ro-first">{parts.join(' ')}</span> <b>{last}</b>
        </span>
        <span className="ro-pos">{p.position}</span>
      </li>
    );
  };
  return (
    <div className="ro" style={teamVars(t.color)}>
      <div className="ro-head">
        <div className="ro-badge">{t.short}</div>
        <div className="ro-title">
          <div className="ro-team">{t.name}</div>
          <div className="ro-label">Sestava · {setup.competition}</div>
        </div>
      </div>
      <div className="ro-body">
        <div className="ro-col">
          <div className="ro-col-h">Základní sestava</div>
          <ol className="ro-list">{xi.map((p, i) => row(p, i))}</ol>
        </div>
        <div className="ro-col ro-col-bench">
          <div className="ro-col-h">Náhradníci</div>
          <ol className="ro-list">{subs.map((p, i) => row(p, i + xi.length))}</ol>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Spodní titulky ─────────────────────────────

function LowerThirdPlayer({ state, show }: { state: AppState; show: boolean }) {
  const sel = state.graphics.lowerPlayer;
  const p = sel ? findPlayer(state.setup, sel.side, sel.playerId) : undefined;
  const data = useLatest(p && sel ? { p, team: state.setup[sel.side] } : null);
  return (
    <Presence show={show && !!p} className="ov-lower" exitMs={600}>
      {data && (
        <div className="lt" style={teamVars(data.team.color)}>
          <div className="lt-num tabular">{data.p.number}</div>
          <div className="lt-body">
            <div className="lt-name">{data.p.name}</div>
            <div className="lt-sub">
              <span>{data.p.position}</span>
              <i />
              <span>{data.team.name}</span>
            </div>
          </div>
        </div>
      )}
    </Presence>
  );
}

function LowerThirdOfficial({ state, show }: { state: AppState; show: boolean }) {
  const o = state.setup.officials[state.graphics.officialIndex];
  const data = useLatest(o);
  return (
    <Presence show={show && !!o} className="ov-lower" exitMs={600}>
      {data && (
        <div className="lt lt-official">
          <div className="lt-num lt-whistle">
            <svg viewBox="0 0 24 24" className="lt-whistle-ico" aria-hidden>
              <path
                fill="currentColor"
                d="M9 6a7 7 0 1 0 6.3 10H21a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-7.6A7 7 0 0 0 9 6zm0 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM7 2h4v2.6A8.8 8.8 0 0 0 9 4.4 8.8 8.8 0 0 0 7 4.6z"
              />
            </svg>
          </div>
          <div className="lt-body">
            <div className="lt-name">{data.name}</div>
            <div className="lt-sub">
              <span>{data.role}</span>
              <i />
              <span>{state.setup.competition}</span>
            </div>
          </div>
        </div>
      )}
    </Presence>
  );
}

// ───────────────────────────── Poločas / konec ─────────────────────────────

function scorers(log: LogItem[], side: Side, setup: AppState['setup'], untilTs: number | null) {
  return log
    .filter((l) => l.type === 'SCORE' && l.side === side && (untilTs == null || l.ts <= untilTs))
    .map((l) => {
      const name = l.detail.replace(/^\d+\s+/, '');
      const isTeam = name === setup[side].name;
      const label = l.icon === 'try' ? (l.points === 7 ? 'TP' : '') : l.title === 'Proměněný kop' ? 'K' : l.title === 'Drop goal' ? 'DG' : 'TK';
      return { key: l.eventId, who: isTeam ? '' : surname(name), minute: l.minute, label };
    });
}

function ScoreSummary({ state, kind }: { state: AppState; kind: 'halftime' | 'fulltime' }) {
  const { setup, live } = state;
  const htEvent = live.log.find((l) => l.title === 'Konec 1. poločasu');
  const score = kind === 'halftime' ? live.halftimeScore ?? live.score : live.score;
  const until = kind === 'halftime' ? htEvent?.ts ?? null : null;
  const winner = score.home === score.away ? null : score.home > score.away ? 'home' : 'away';

  const team = (side: Side) => {
    const t = setup[side];
    const list = scorers(live.log, side, setup, until);
    return (
      <div className={`ss-team ss-${side} ${kind === 'fulltime' && winner === side ? 'is-winner' : ''}`} style={teamVars(t.color)}>
        <div className="ss-head">
          <div className="ss-badge">{t.short}</div>
          <div className="ss-name">{t.name}</div>
        </div>
        <ul className="ss-scorers">
          {list.length === 0 && <li className="ss-empty">—</li>}
          {list.slice(0, 6).map((s) => (
            <li key={s.key}>
              {s.label ? <b className="ss-tag">{s.label}</b> : <Icon name="try" className="ss-ico" />}
              <span>{s.who || setup[side].short}</span>
              <span className="ss-min tabular">{s.minute}</span>
            </li>
          ))}
          {list.length > 6 && <li className="ss-more">+{list.length - 6} další</li>}
        </ul>
      </div>
    );
  };

  return (
    <div className={`ss ss-${kind}`}>
      <div className="ss-label">{kind === 'halftime' ? 'Poločas' : 'Konečné skóre'}</div>
      <div className="ss-row">
        {team('home')}
        <div className="ss-score tabular">
          <span>{score.home}</span>
          <i />
          <span>{score.away}</span>
        </div>
        {team('away')}
      </div>
      <div className="ss-foot">
        {setup.competition} · {setup.venue}
      </div>
    </div>
  );
}
