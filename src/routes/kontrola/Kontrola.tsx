import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { teamVars } from '../../components/color';
import { Icon } from '../../components/Icon';
import { displayMs, formatClock, PERIOD_LABEL } from '../../domain/clock';
import { pointsOf, reviewFlags, SUBMISSION_LABEL, type ReviewFlag } from '../../domain/review';
import { findPlayer } from '../../domain/roster';
import type { Action, AppState, Submission } from '../../domain/types';
import { useMatch, useNow } from '../../hooks/useMatch';
import { getAdapter } from '../../sync';
import './kontrola.css';

const OverlayInline = lazy(() => import('../overlay/Overlay'));

function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `před ${s} s`;
  const m = Math.floor(s / 60);
  return `před ${m} min`;
}

/**
 * /kontrola – druhý člověk ověří hlášení z hřiště. Do zápasu (a tedy do režie
 * a vysílání) se dostane jen to, co tady schválí.
 */
export default function Kontrola({ embedded = false }: { embedded?: boolean } = {}) {
  const { state, dispatch } = useMatch('kontrola');
  const now = useNow(500);
  const subs = state.submissions ?? [];
  const pending = subs.filter((s) => s.status === 'pending');
  const done = subs.filter((s) => s.status !== 'pending').slice(-15).reverse();
  const flagged = pending.map((s) => ({ s, flags: reviewFlags(state, s, now) }));
  const clean = flagged.filter((x) => x.flags.length === 0);

  // Klávesy: Enter = schválit první, Delete/Backspace = zamítnout první
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON')) return;
      const first = flagged[0];
      if (!first) return;
      if (e.key === 'Enter' && !first.flags.some((f) => f.severity === 'block')) {
        e.preventDefault();
        dispatch({ type: 'APPROVE', submissionId: first.s.id });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        dispatch({ type: 'REJECT', submissionId: first.s.id });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flagged, dispatch]);

  return (
    <div className={`kt ${embedded ? 'is-embedded' : ''}`}>
      <header className="kt-head">
        <div className="kt-title">
          <h1>Kontrola hlášení z hřiště</h1>
          <p>Do režie a vysílání se dostane jen to, co schválíte.</p>
        </div>
        <span className={`kt-count ${pending.length ? 'is-on' : ''}`}>
          Ke kontrole <b>{pending.length}</b>
        </span>
        <button
          className="kt-btn kt-btn-ok"
          disabled={!clean.length}
          onClick={() => {
            // Postupně, s kontrolou proti aktuálnímu stavu po každém schválení
            // (např. proměněný kop projde, jakmile se schválí položení před ním).
            for (const { s } of flagged) {
              const fresh = getAdapter().getState();
              const cur = (fresh.submissions ?? []).find((x) => x.id === s.id);
              if (cur?.status === 'pending' && reviewFlags(fresh, cur).length === 0) {
                dispatch({ type: 'APPROVE', submissionId: s.id });
              }
            }
          }}
          title="Schválí všechna hlášení, u kterých automatická kontrola nic nenašla"
        >
          Schválit vše bez varování ({clean.length})
        </button>
      </header>

      <div className="kt-grid">
        <section className="kt-queue" aria-label="Fronta ke kontrole">
          {flagged.length === 0 && (
            <div className="kt-empty">
              <b>Fronta je prázdná</b>
              <span>Nová hlášení z hřiště se tu objeví hned po odeslání.</span>
            </div>
          )}
          {flagged.map(({ s, flags }, i) => (
            <QueueCard key={s.id} s={s} flags={flags} state={state} now={now} first={i === 0} dispatch={dispatch} />
          ))}
          {flagged.length > 0 && (
            <p className="kt-keys">
              <kbd>Enter</kbd> schválí první · <kbd>Delete</kbd> zamítne první
            </p>
          )}

          {done.length > 0 && (
            <>
              <h2 className="kt-h">Vyřízeno</h2>
              <ul className="kt-done">
                {done.map((s) => {
                  const p = findPlayer(state.setup, s.side, s.playerId);
                  return (
                    <li key={s.id} className={`is-${s.status}`} style={teamVars(state.setup[s.side].color)}>
                      <span className="kt-done-min tabular">{s.minute}</span>
                      <span className="kt-done-text">
                        <b>
                          {SUBMISSION_LABEL[s.kind]} · {state.setup[s.side].short} {p ? `#${p.number} ${p.name}` : 'tým'}
                        </b>
                        {s.note && <span>{s.note}</span>}
                      </span>
                      <span className="kt-done-status">{s.status === 'approved' ? 'Schváleno · v režii' : 'Zamítnuto'}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <aside className="kt-side">
          <LiveSummary state={state} now={now} />
          <MiniPreview />
          <RecentEvents state={state} />
        </aside>
      </div>
    </div>
  );
}

function QueueCard({
  s,
  flags,
  state,
  now,
  first,
  dispatch,
}: {
  s: Submission;
  flags: ReviewFlag[];
  state: AppState;
  now: number;
  first: boolean;
  dispatch: (a: Action) => void;
}) {
  const team = state.setup[s.side];
  const p = findPlayer(state.setup, s.side, s.playerId);
  const blocked = flags.some((f) => f.severity === 'block');
  const pts = pointsOf(s.kind);
  return (
    <article className={`kt-card ${first ? 'is-first' : ''} ${flags.length ? 'has-flags' : ''}`} style={teamVars(team.color)}>
      <div className="kt-card-meta">
        <span className="kt-team">{team.short}</span>
        <span className="tabular">{s.minute}</span>
        <span>odesláno z hřiště {ago(now - s.ts)}</span>
      </div>
      <div className="kt-card-main">
        <span className={`kt-num tabular ${p ? '' : 'is-team'}`}>{p ? p.number : team.short}</span>
        <span className="kt-what">
          <b className={`k-${s.kind}`}>
            {s.kind === 'yellow' && <i className="card-chip yellow" />}
            {s.kind === 'red' && <i className="card-chip red" />}
            {SUBMISSION_LABEL[s.kind]}
            {pts > 0 && <em>+{pts}</em>}
          </b>
          <span>{p ? `${p.name} · ${p.position}` : `${team.name} (týmová akce)`}</span>
        </span>
      </div>
      {flags.length > 0 ? (
        <ul className="kt-flags">
          {flags.map((f) => (
            <li key={f.text} className={`is-${f.severity}`}>
              {f.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="kt-ok">Automatická kontrola: v pořádku</p>
      )}
      <div className="kt-actions">
        <button className="kt-btn kt-btn-reject" onClick={() => dispatch({ type: 'REJECT', submissionId: s.id })}>
          <Icon name="close" /> Zamítnout
        </button>
        <button className="kt-btn kt-btn-ok kt-btn-big" disabled={blocked} onClick={() => dispatch({ type: 'APPROVE', submissionId: s.id })}>
          {blocked ? 'Nelze schválit' : flags.length ? 'Přesto schválit' : 'Schválit do režie'}
        </button>
      </div>
    </article>
  );
}

function LiveSummary({ state, now }: { state: AppState; now: number }) {
  const { setup, live } = state;
  return (
    <section className="kt-block">
      <h2 className="kt-h">V režii teď</h2>
      <div className="kt-live">
        {(['home', 'away'] as const).map((side) => (
          <span key={side} className="kt-live-team" style={teamVars(setup[side].color)}>
            <b>{setup[side].short}</b>
            <em className="tabular">{live.score[side]}</em>
          </span>
        ))}
        <span className="kt-live-clock">
          <b className="tabular">{formatClock(displayMs(live, setup.variant, now))}</b>
          <span>{PERIOD_LABEL[live.period]}</span>
        </span>
      </div>
    </section>
  );
}

function MiniPreview() {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1920);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, []);
  return (
    <section className="kt-block">
      <h2 className="kt-h">Náhled vysílání</h2>
      <div className="kt-preview" ref={box}>
        <div className="kt-preview-canvas" style={{ transform: `scale(${scale})` }}>
          <Suspense fallback={null}>
            <OverlayInline />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

function RecentEvents({ state }: { state: AppState }) {
  const items = state.live.log.filter((l) => l.side).slice(-6).reverse();
  return (
    <section className="kt-block">
      <h2 className="kt-h">Poslední zapsané události</h2>
      {items.length === 0 && <p className="kt-muted">Zatím nic.</p>}
      <ul className="kt-events">
        {items.map((l) => (
          <li key={l.eventId} style={teamVars(state.setup[l.side!].color)}>
            <span className="tabular">{l.minute}</span>
            <b>
              {l.title}
              {l.points ? ` +${l.points}` : ''}
            </b>
            <span>{l.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
