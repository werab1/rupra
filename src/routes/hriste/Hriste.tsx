import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { teamVars } from '../../components/color';
import { Icon } from '../../components/Icon';
import { activeYellowCards, displayMs, formatClock, PERIOD_SHORT } from '../../domain/clock';
import { itemLabel, PLAYER_KINDS, pointsOf, SUBMISSION_LABEL } from '../../domain/review';
import { matchSquad, SIDES } from '../../domain/roster';
import type { AppState, Player, Side, Submission, SubmissionItem, SubmissionKind } from '../../domain/types';
import { useMatch, useNow } from '../../hooks/useMatch';
import './hriste.css';

const DRAFT_KEY = 'rupra:hriste:draft';

const sameItem = (a: SubmissionItem, b: SubmissionItem) => a.side === b.side && a.playerId === b.playerId && a.kind === b.kind;

function loadDraft(): SubmissionItem[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as SubmissionItem[]) : [];
  } catch {
    return [];
  }
}

function haptic(p: number | number[] = 20) {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* nepodporováno */
  }
}

/**
 * /hriste – člověk přímo u hřiště. Vybere hráče, zaškrtne, co udělal, a odešle.
 * Nic nejde rovnou do vysílání: hlášení čeká na schválení na obrazovce /kontrola.
 */
export default function Hriste() {
  const { state, dispatch, connection } = useMatch('hriste');
  const now = useNow(500);
  const [side, setSide] = useState<Side>('home');
  const [draft, setDraft] = useState<SubmissionItem[]>(loadDraft);
  const [open, setOpen] = useState<Player | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* úložiště nedostupné – koncept zůstane jen v paměti */
    }
  }, [draft]);

  const say = useCallback((t: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const toggle = (it: SubmissionItem) => {
    haptic(15);
    setDraft((d) => (d.some((x) => sameItem(x, it)) ? d.filter((x) => !sameItem(x, it)) : [...d, it]));
  };

  const send = () => {
    if (!draft.length) return;
    dispatch({ type: 'SUBMIT', items: draft });
    haptic([20, 40, 20]);
    say(`Odesláno ke kontrole: ${draft.length} ${draft.length === 1 ? 'položka' : draft.length < 5 ? 'položky' : 'položek'}`);
    setDraft([]);
  };

  const team = state.setup[side];
  const squad = matchSquad(team, state.setup);
  const onField = new Set(state.live.onField[side]);
  const sentOff = new Set(state.live.sentOff[side]);
  const yellow = new Set(
    activeYellowCards(state, now)
      .filter((y) => y.card.side === side)
      .map((y) => y.card.playerId),
  );
  const fieldPlayers = squad.filter((p) => onField.has(p.id));
  const benchPlayers = squad.filter((p) => !onField.has(p.id));

  const draftFor = (pid: string | null, s: Side = side) => draft.filter((d) => d.side === s && d.playerId === pid);
  const penaltyTry: SubmissionItem = { side, playerId: null, kind: 'penaltytry' };

  const mine = useMemo(() => [...(state.submissions ?? [])].reverse().slice(0, 12), [state.submissions]);

  const row = (p: Player) => {
    const items = draftFor(p.id);
    return (
      <li key={p.id}>
        <button
          className={`hr-player ${items.length ? 'has-draft' : ''} ${sentOff.has(p.id) ? 'is-off' : ''}`}
          onClick={() => setOpen(p)}
          aria-label={`${p.number} ${p.name}, ${items.length ? `zaškrtnuto ${items.length}` : 'nic nezaškrtnuto'}`}
        >
          <span className="hr-num tabular">{p.number}</span>
          <span className="hr-name">
            <b>{p.name}</b>
            <span>
              {p.position}
              {yellow.has(p.id) && <i className="card-chip yellow" title="Na žluté kartě" />}
              {sentOff.has(p.id) && <i className="card-chip red" title="Vyloučen" />}
            </span>
          </span>
          <span className="hr-tags">
            {items.map((it) => (
              <span key={it.kind} className={`hr-tag k-${it.kind}`}>
                {SHORT[it.kind]}
              </span>
            ))}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="hr" style={teamVars(team.color)}>
      <header className="hr-top">
        <div className="hr-score">
          <span className="hr-score-team" style={teamVars(state.setup.home.color)}>
            {state.setup.home.short}
          </span>
          <b className="tabular">
            {state.live.score.home}:{state.live.score.away}
          </b>
          <span className="hr-score-team" style={teamVars(state.setup.away.color)}>
            {state.setup.away.short}
          </span>
        </div>
        <div className="hr-clock tabular">
          {formatClock(displayMs(state.live, state.setup.variant, now))} <span>{PERIOD_SHORT[state.live.period]}</span>
        </div>
        <span className={`conn-dot ${connection.status}`} title="Spojení" />
      </header>

      <div className="hr-teams" role="tablist" aria-label="Tým">
        {SIDES.map((s) => {
          const n = draft.filter((d) => d.side === s).length;
          return (
            <button
              key={s}
              role="tab"
              aria-selected={side === s}
              className={side === s ? 'is-active' : ''}
              style={teamVars(state.setup[s].color)}
              onClick={() => setSide(s)}
            >
              <b>{state.setup[s].short}</b>
              <span>{state.setup[s].name}</span>
              {n > 0 && <em>{n}</em>}
            </button>
          );
        })}
      </div>

      <main className="hr-main">
        <p className="hr-help">Klepněte na hráče a zaškrtněte, co udělal. Pak vše odešlete ke kontrole.</p>

        <button
          className={`hr-teamact ${draft.some((d) => sameItem(d, penaltyTry)) ? 'is-checked' : ''}`}
          onClick={() => toggle(penaltyTry)}
          aria-pressed={draft.some((d) => sameItem(d, penaltyTry))}
        >
          <span className="hr-check" aria-hidden />
          <span>
            <b>Trestné položení +7</b>
            <small>týmová akce · {team.short}</small>
          </span>
        </button>

        <h2 className="hr-h">Na hřišti</h2>
        <ul className="hr-list">{fieldPlayers.map(row)}</ul>

        {benchPlayers.length > 0 && (
          <>
            <h2 className="hr-h">Lavička a mimo hru</h2>
            <ul className="hr-list is-bench">{benchPlayers.map(row)}</ul>
          </>
        )}

        <h2 className="hr-h">Odesláno</h2>
        {mine.length === 0 && <p className="hr-empty">Zatím nic neodesláno.</p>}
        <ul className="hr-sent">
          {mine.map((s) => (
            <SentRow key={s.id} s={s} state={state} />
          ))}
        </ul>
      </main>

      <div className="hr-tray">
        {draft.length > 0 && (
          <div className="hr-tray-items">
            {draft.map((it) => (
              <button key={`${it.side}-${it.playerId}-${it.kind}`} className="hr-chip" style={teamVars(state.setup[it.side].color)} onClick={() => toggle(it)} aria-label={`Odebrat: ${itemLabel(state, it)}`}>
                <span>{chipText(state, it)}</span>
                <Icon name="close" className="hr-chip-x" />
              </button>
            ))}
          </div>
        )}
        <button className="hr-send" disabled={!draft.length} onClick={send}>
          {draft.length ? `ODESLAT KE KONTROLE (${draft.length})` : 'NIC K ODESLÁNÍ'}
        </button>
      </div>

      {toast && (
        <div className="hr-toast" role="status">
          {toast}
        </div>
      )}

      {open && (
        <PlayerSheet
          player={open}
          side={side}
          state={state}
          draft={draftFor(open.id)}
          onToggle={(kind) => toggle({ side, playerId: open.id, kind })}
          onClose={() => setOpen(null)}
          onYellow={yellow.has(open.id)}
        />
      )}
    </div>
  );
}

const SHORT: Record<SubmissionKind, string> = {
  try: 'POL',
  conversion: 'KOP',
  penalty: 'TK',
  dropgoal: 'DG',
  penaltytry: 'TP',
  yellow: 'ŽK',
  red: 'ČK',
};

function chipText(state: AppState, it: SubmissionItem) {
  const p = it.playerId ? state.setup[it.side].roster.find((x) => x.id === it.playerId) : null;
  return `${state.setup[it.side].short} ${p ? `#${p.number}` : 'tým'} · ${SUBMISSION_LABEL[it.kind]}`;
}

const STATUS_LABEL: Record<Submission['status'], string> = { pending: 'Čeká na kontrolu', approved: 'Schváleno', rejected: 'Zamítnuto' };

function SentRow({ s, state }: { s: Submission; state: AppState }) {
  return (
    <li className={`hr-sent-row is-${s.status}`} style={teamVars(state.setup[s.side].color)}>
      <span className="hr-sent-min tabular">{s.minute}</span>
      <span className="hr-sent-text">
        <b>{itemLabel(state, s)}</b>
        {s.note && <span>{s.note}</span>}
      </span>
      <span className="hr-sent-status">{STATUS_LABEL[s.status]}</span>
    </li>
  );
}

function PlayerSheet({
  player,
  side,
  state,
  draft,
  onToggle,
  onClose,
  onYellow,
}: {
  player: Player;
  side: Side;
  state: AppState;
  draft: SubmissionItem[];
  onToggle: (k: SubmissionKind) => void;
  onClose: () => void;
  onYellow: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const team = state.setup[side];
  return (
    <div className="hr-sheet-bg" onClick={onClose}>
      <div className="hr-sheet" role="dialog" aria-modal="true" aria-label={`${player.number} ${player.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="hr-sheet-head">
          <span className="hr-num hr-num-lg tabular">{player.number}</span>
          <span className="hr-name">
            <b>{player.name}</b>
            <span>
              {team.short} · {player.position}
              {onYellow && ' · na žluté kartě'}
            </span>
          </span>
        </div>
        <div className="hr-opts">
          {PLAYER_KINDS.map((k) => {
            const on = draft.some((d) => d.kind === k);
            const pts = pointsOf(k);
            return (
              <button key={k} className={`hr-opt k-${k} ${on ? 'is-checked' : ''}`} onClick={() => onToggle(k)} aria-pressed={on}>
                <span className="hr-check" aria-hidden />
                <span className="hr-opt-label">
                  {k === 'yellow' && <i className="card-chip yellow" />}
                  {k === 'red' && <i className="card-chip red" />}
                  {SUBMISSION_LABEL[k]}
                </span>
                {pts > 0 && <span className="hr-opt-pts">+{pts}</span>}
              </button>
            );
          })}
        </div>
        <button className="hr-done" onClick={onClose}>
          Hotovo
        </button>
      </div>
    </div>
  );
}
