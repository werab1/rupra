import { lazy, Suspense, useEffect } from 'react';
import { Home } from './routes/Home';

const Zapis = lazy(() => import('./routes/zapis/Zapis'));
const Panel = lazy(() => import('./routes/panel/Panel'));
const Overlay = lazy(() => import('./routes/overlay/Overlay'));
const Hriste = lazy(() => import('./routes/hriste/Hriste'));
const Kontrola = lazy(() => import('./routes/kontrola/Kontrola'));

/** Minimalistický router – tři pevné routy, žádná další závislost. */
export function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const known = ['zapis', 'panel', 'overlay', 'hriste', 'kontrola'] as const;
  const route = (known as readonly string[]).includes(path.slice(1)) ? (path.slice(1) as (typeof known)[number]) : 'home';

  useEffect(() => {
    document.documentElement.dataset.route = route;
    const titles = { zapis: 'Zápis', panel: 'Režie', overlay: 'Overlay', hriste: 'Hřiště', kontrola: 'Kontrola', home: '' };
    document.title = titles[route] ? `Rupra · ${titles[route]}` : 'Rupra';
  }, [route]);

  return (
    <Suspense fallback={null}>
      {route === 'zapis' && <Zapis />}
      {route === 'panel' && <Panel />}
      {route === 'overlay' && <Overlay />}
      {route === 'hriste' && <Hriste />}
      {route === 'kontrola' && <Kontrola />}
      {route === 'home' && <Home />}
    </Suspense>
  );
}
