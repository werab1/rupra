import { lazy, Suspense, useEffect } from 'react';
import { Home } from './routes/Home';

const Zapis = lazy(() => import('./routes/zapis/Zapis'));
const Panel = lazy(() => import('./routes/panel/Panel'));
const Overlay = lazy(() => import('./routes/overlay/Overlay'));

/** Minimalistický router – tři pevné routy, žádná další závislost. */
export function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const route = path === '/zapis' ? 'zapis' : path === '/panel' ? 'panel' : path === '/overlay' ? 'overlay' : 'home';

  useEffect(() => {
    document.documentElement.dataset.route = route;
    document.title =
      route === 'zapis' ? 'Rupra · Zápis' : route === 'panel' ? 'Rupra · Režie' : route === 'overlay' ? 'Rupra · Overlay' : 'Rupra';
  }, [route]);

  return (
    <Suspense fallback={null}>
      {route === 'zapis' && <Zapis />}
      {route === 'panel' && <Panel />}
      {route === 'overlay' && <Overlay />}
      {route === 'home' && <Home />}
    </Suspense>
  );
}
