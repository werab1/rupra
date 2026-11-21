import { useState } from 'react';
import { teamVars } from '../../components/color';
import { Icon } from '../../components/Icon';
import { VARIANTS } from '../../domain/rules';
import { sampleSetup } from '../../domain/sampleData';
import type { AppState, MatchSetup, Player, Side, Variant } from '../../domain/types';

/** Nastavení zápasu: týmy, zkratky, barvy, varianta, soupisky, rozhodčí. */
export function Setup({
  state,
  onClose,
  onSave,
  onReset,
}: {
  state: AppState;
  onClose: () => void;
  onSave: (s: MatchSetup) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<MatchSetup>(() => structuredClone(state.setup));
  const rules = VARIANTS[draft.variant];

  const setTeam = (side: Side, patch: Partial<MatchSetup['home']>) =>
    setDraft((d) => ({ ...d, [side]: { ...d[side], ...patch } }));

  const setPlayer = (side: Side, idx: number, patch: Partial<Player>) =>
    setDraft((d) => {
      const roster = d[side].roster.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      return { ...d, [side]: { ...d[side], roster } };
    });

  const movePlayer = (side: Side, idx: number, dir: -1 | 1) =>
    setDraft((d) => {
      const roster = [...d[side].roster];
      const j = idx + dir;
      if (j < 0 || j >= roster.length) return d;
      [roster[idx], roster[j]] = [roster[j], roster[idx]];
      return { ...d, [side]: { ...d[side], roster } };
    });

  const removePlayer = (side: Side, idx: number) =>
    setDraft((d) => ({ ...d, [side]: { ...d[side], roster: d[side].roster.filter((_, i) => i !== idx) } }));

  const addPlayer = (side: Side) =>
    setDraft((d) => {
      const nums = d[side].roster.map((p) => p.number);
      const next = nums.length ? Math.max(...nums) + 1 : 1;
      const id = `${side[0]}${Date.now().toString(36)}`;
      return { ...d, [side]: { ...d[side], roster: [...d[side].roster, { id, number: next, name: '', position: '' }] } };
    });

  const valid =
    draft.home.short.trim().length === 3 &&
    draft.away.short.trim().length === 3 &&
    draft.home.name.trim() &&
    draft.away.name.trim();

  return (
    <div className="zp zp-setup">
      <header className="zp-setup-bar">
        <button className="zp-icon-btn" onClick={onClose} aria-label="Zpět">
          <Icon name="close" />
        </button>
        <h1>Nastavení zápasu</h1>
        <button className="zp-save" disabled={!valid} onClick={() => onSave(normalize(draft))}>
          Uložit
        </button>
      </header>

      <main className="zp-main">
        <section className="zp-sec">
          <h2 className="zp-form-h">Zápas</h2>
          <label className="zp-field">
            <span>Soutěž</span>
            <input value={draft.competition} onChange={(e) => setDraft({ ...draft, competition: e.target.value })} />
          </label>
          <label className="zp-field">
            <span>Místo</span>
            <input value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} />
          </label>
          <div className="zp-field">
            <span>Varianta</span>
            <div className="zp-seg" role="radiogroup">
              {(Object.keys(VARIANTS) as Variant[]).map((v) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={draft.variant === v}
                  className={draft.variant === v ? 'is-active' : ''}
                  onClick={() => setDraft({ ...draft, variant: v })}
                >
                  <b>{VARIANTS[v].label}</b>
                  <span>
                    2 × {VARIANTS[v].halfMin} min · žlutá {VARIANTS[v].yellowMin} min
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {(['home', 'away'] as Side[]).map((side) => {
          const t = draft[side];
          return (
            <section key={side} className="zp-sec" style={teamVars(t.color)}>
              <h2 className="zp-form-h zp-form-h-team">{side === 'home' ? 'Domácí' : 'Hosté'}</h2>
              <label className="zp-field">
                <span>Název týmu</span>
                <input value={t.name} onChange={(e) => setTeam(side, { name: e.target.value })} />
              </label>
              <div className="zp-field-row">
                <label className="zp-field">
                  <span>Zkratka (3 písmena)</span>
                  <input
                    className="zp-short-input"
                    value={t.short}
                    maxLength={3}
                    autoCapitalize="characters"
                    onChange={(e) => setTeam(side, { short: e.target.value.toUpperCase().replace(/[^A-ZÁ-Ž0-9]/gi, '') })}
                  />
                </label>
                <label className="zp-field">
                  <span>Barva</span>
                  <span className="zp-color">
                    <input type="color" value={t.color} onChange={(e) => setTeam(side, { color: e.target.value })} />
                    <code>{t.color.toUpperCase()}</code>
                  </span>
                </label>
              </div>

              <details className="zp-roster">
                <summary>
                  Soupiska <span>{t.roster.length} hráčů</span>
                </summary>
                <p className="zp-hint">
                  Prvních {rules.starters} = základní sestava, dalších {rules.bench} = náhradníci. Pořadí změníte šipkami.
                </p>
                <ol className="zp-roster-list">
                  {t.roster.map((p, i) => (
                    <li key={p.id}>
                      {i === 0 && <div className="zp-roster-div">Základní sestava</div>}
                      {i === rules.starters && <div className="zp-roster-div">Náhradníci</div>}
                      {i === rules.starters + rules.bench && <div className="zp-roster-div is-out">Mimo soupisku zápasu</div>}
                      <div className="zp-roster-row">
                        <input
                          className="zp-roster-num"
                          inputMode="numeric"
                          aria-label="Číslo"
                          value={p.number || ''}
                          onChange={(e) => setPlayer(side, i, { number: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                        />
                        <input
                          className="zp-roster-name"
                          aria-label="Jméno"
                          placeholder="Jméno a příjmení"
                          value={p.name}
                          onChange={(e) => setPlayer(side, i, { name: e.target.value })}
                        />
                        <input
                          className="zp-roster-pos"
                          aria-label="Pozice"
                          placeholder="Pozice"
                          value={p.position}
                          onChange={(e) => setPlayer(side, i, { position: e.target.value })}
                        />
                        <div className="zp-roster-tools">
                          <button onClick={() => movePlayer(side, i, -1)} aria-label="Posunout výš">
                            ↑
                          </button>
                          <button onClick={() => movePlayer(side, i, 1)} aria-label="Posunout níž">
                            ↓
                          </button>
                          <button onClick={() => removePlayer(side, i)} aria-label="Odebrat">
                            ✕
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <button className="zp-add" onClick={() => addPlayer(side)}>
                  + Přidat hráče
                </button>
              </details>
            </section>
          );
        })}

        <section className="zp-sec">
          <h2 className="zp-form-h">Rozhodčí</h2>
          {draft.officials.map((o, i) => (
            <div key={i} className="zp-field-row zp-official">
              <input
                aria-label="Jméno rozhodčího"
                value={o.name}
                onChange={(e) =>
                  setDraft({ ...draft, officials: draft.officials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })
                }
              />
              <input
                aria-label="Funkce"
                value={o.role}
                onChange={(e) =>
                  setDraft({ ...draft, officials: draft.officials.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) })
                }
              />
              <button
                className="zp-icon-btn"
                aria-label="Odebrat rozhodčího"
                onClick={() => setDraft({ ...draft, officials: draft.officials.filter((_, j) => j !== i) })}
              >
                <Icon name="close" />
              </button>
            </div>
          ))}
          <button
            className="zp-add"
            onClick={() => setDraft({ ...draft, officials: [...draft.officials, { name: '', role: 'Asistent rozhodčího' }] })}
          >
            + Přidat rozhodčího
          </button>
        </section>

        <section className="zp-sec zp-danger">
          <h2 className="zp-form-h">Další</h2>
          <button className="zp-wide-btn" onClick={() => setDraft(sampleSetup())}>
            Načíst ukázková data
          </button>
          <button
            className="zp-wide-btn is-danger"
            onClick={() => {
              if (confirm('Začít nový zápas? Skóre, čas i všechny události se vymažou.')) onReset();
            }}
          >
            Nový zápas (vymazat skóre a události)
          </button>
        </section>
      </main>
    </div>
  );
}

function normalize(s: MatchSetup): MatchSetup {
  const team = (t: MatchSetup['home']) => ({
    ...t,
    name: t.name.trim(),
    short: t.short.trim().toUpperCase().slice(0, 3),
    roster: t.roster.filter((p) => p.name.trim() || p.number),
  });
  return { ...s, home: team(s.home), away: team(s.away), officials: s.officials.filter((o) => o.name.trim()) };
}
