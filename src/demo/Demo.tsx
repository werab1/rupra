import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { GraphicId } from '../domain/types';
import { useMatch } from '../hooks/useMatch';
import Overlay from '../routes/overlay/Overlay';
import Panel from '../routes/panel/Panel';
import Zapis from '../routes/zapis/Zapis';

type View = 'vse' | 'zapis' | 'rezie' | 'overlay';

const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: 'vse', label: 'Vše vedle sebe', hint: 'Ťukněte v telefonu na body nebo kartu – režie i náhled se změní okamžitě.' },
  { id: 'zapis', label: 'Zápis', hint: 'Mobil zapisovatele na stadionu. Body, čas, střídání, karty a ZPĚT.' },
  { id: 'rezie', label: 'Režie', hint: 'Panel klienta doma. Grafiky spouštějte dlaždicemi nebo klávesami 1–9, Esc skryje vše.' },
  { id: 'overlay', label: 'Overlay', hint: 'Výstup 1920 × 1080 tak, jak ho uvidí vMix. Pozadí je ve skutečnosti průhledné.' },
];

function viewFromHash(): View | null {
  const h = window.location.hash.replace('#', '');
  return VIEWS.some((v) => v.id === h) ? (h as View) : null;
}

function defaultView(): View {
  const w = window.innerWidth;
  return w >= 1480 ? 'vse' : w >= 1100 ? 'rezie' : 'zapis';
}

export function Demo({ onRestart }: { onRestart: () => void }) {
  const [view, setView] = useState<View>(() => viewFromHash() ?? defaultView());
  const [wide, setWide] = useState(() => window.innerWidth >= 720);
  const [restartArmed, setRestartArmed] = useState(false);

  useEffect(() => {
    const onHash = () => {
      const v = viewFromHash();
      if (v) setView(v);
    };
    const onResize = () => setWide(window.innerWidth >= 720);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!restartArmed) return;
    const t = window.setTimeout(() => setRestartArmed(false), 3000);
    return () => window.clearTimeout(t);
  }, [restartArmed]);

  const go = (v: View) => {
    setView(v);
    try {
      history.replaceState(null, '', `#${v}`);
    } catch {
      /* hash nejde nastavit – nevadí */
    }
  };

  const hint = VIEWS.find((v) => v.id === view)!.hint;

  return (
    <div className="dm">
      <header className="dm-bar">
        <div className="dm-brand">
          <svg viewBox="0 0 64 64" aria-hidden>
            <path d="M14 50 26 14h12l-4 12h16L38 50H26l4-12H18z" fill="currentColor" />
          </svg>
          RUPRA <em>gama</em>
        </div>
        <nav className="dm-tabs" aria-label="Pohled">
          {VIEWS.map((v) => (
            <button key={v.id} className={view === v.id ? 'is-active' : ''} aria-pressed={view === v.id} onClick={() => go(v.id)}>
              {v.label}
            </button>
          ))}
        </nav>
        <p className="dm-hint">{hint}</p>
        <button
          className={`dm-restart ${restartArmed ? 'is-armed' : ''}`}
          onClick={() => {
            if (restartArmed) {
              onRestart();
              setRestartArmed(false);
            } else setRestartArmed(true);
          }}
        >
          {restartArmed ? 'Klikněte znovu pro potvrzení' : 'Nový ukázkový zápas'}
        </button>
      </header>

      <main className={`dm-stage dm-view-${view}`}>
        {view === 'vse' && (
          <div className="dm-split">
            <Phone>
              <Zapis />
            </Phone>
            <div className="dm-panel">
              <Panel embedded />
            </div>
          </div>
        )}
        {view === 'zapis' &&
          (wide ? (
            <div className="dm-center">
              <Phone>
                <Zapis />
              </Phone>
            </div>
          ) : (
            <div className="dm-plain">
              <Zapis />
            </div>
          ))}
        {view === 'rezie' && (
          <div className="dm-panel">
            <Panel embedded />
          </div>
        )}
        {view === 'overlay' && <OverlayStage />}
      </main>
    </div>
  );
}

/** Rámeček telefonu. transform vytváří obal pro position:fixed prvky zápisu (spodní lišta, toast, výběr hráče). */
function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="dm-phone">
      <div className="dm-phone-screen">{children}</div>
    </div>
  );
}

const QUICK: { key: string; id: GraphicId; label: string }[] = [
  { key: '1', id: 'scorebug', label: 'Scorebug' },
  { key: '2', id: 'intro', label: 'Úvodní karta' },
  { key: '3', id: 'rosterHome', label: 'Soupiska A' },
  { key: '4', id: 'rosterAway', label: 'Soupiska B' },
  { key: '5', id: 'lowerPlayer', label: 'Titulek hráče' },
  { key: '6', id: 'lowerOfficial', label: 'Titulek rozhodčího' },
  { key: '7', id: 'halftime', label: 'Poločas' },
  { key: '8', id: 'fulltime', label: 'Konečné skóre' },
];

type Bg = 'pitch' | 'checker' | 'black';

function OverlayStage() {
  const { state, dispatch } = useMatch('panel');
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [bg, setBg] = useState<Bg>('pitch');

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / 1920);
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, []);

  const toggle = (id: GraphicId) => {
    if (state.graphics.on[id]) {
      dispatch({ type: 'HIDE_GRAPHIC', graphic: id });
      return;
    }
    if (id === 'lowerPlayer' && !state.graphics.lowerPlayer) {
      dispatch({ type: 'SHOW_GRAPHIC', graphic: id, lowerPlayer: { side: 'home', playerId: state.setup.home.roster[9]?.id ?? 'h10' } });
      return;
    }
    dispatch({ type: 'SHOW_GRAPHIC', graphic: id });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Escape') return dispatch({ type: 'HIDE_ALL' });
      const q = QUICK.find((x) => x.key === e.key);
      if (q) toggle(q.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="dm-ov">
      <div className="dm-ov-tools">
        <div className="dm-ov-buttons">
          {QUICK.map((q) => (
            <button key={q.id} className={state.graphics.on[q.id] ? 'is-on' : ''} onClick={() => toggle(q.id)}>
              <kbd>{q.key}</kbd> {q.label}
            </button>
          ))}
          <button onClick={() => dispatch({ type: 'HIDE_ALL' })}>
            <kbd>Esc</kbd> Skrýt vše
          </button>
        </div>
        <div className="dm-ov-bg" role="radiogroup" aria-label="Pozadí náhledu">
          {(
            [
              ['pitch', 'Trávník'],
              ['checker', 'Průhlednost'],
              ['black', 'Černá'],
            ] as [Bg, string][]
          ).map(([id, label]) => (
            <button key={id} role="radio" aria-checked={bg === id} className={bg === id ? 'is-active' : ''} onClick={() => setBg(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={`dm-ov-frame bg-${bg}`} ref={box}>
        <div className="dm-ov-canvas" style={{ transform: `scale(${scale})` }}>
          <Overlay />
        </div>
      </div>
    </div>
  );
}
