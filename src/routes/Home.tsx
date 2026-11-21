import './home.css';

const ROUTES = [
  { href: '/zapis', title: 'Zápis', desc: 'Mobil zapisovatele na stadionu – body, čas, střídání, karty.', tag: 'Mobil' },
  { href: '/panel', title: 'Režie', desc: 'Řídicí panel pro klienta doma – náhled a spouštění grafik.', tag: 'Desktop' },
  { href: '/overlay', title: 'Overlay', desc: 'Výstup 1920 × 1080 s průhledností pro vMix Browser input.', tag: 'vMix' },
];

export function Home() {
  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-brand">
          <svg viewBox="0 0 64 64" aria-hidden>
            <path d="M14 50 26 14h12l-4 12h16L38 50H26l4-12H18z" fill="currentColor" />
          </svg>
          <span>RUPRA</span>
          <em>gama</em>
        </div>
        <p className="home-lead">Živá grafika pro streamy ragbyových zápasů.</p>
        <div className="home-grid">
          {ROUTES.map((r) => (
            <a key={r.href} className="home-card" href={r.href} target={r.href === '/zapis' ? undefined : '_blank'} rel="noreferrer">
              <span className="home-tag">{r.tag}</span>
              <b>{r.title}</b>
              <span>{r.desc}</span>
              <code>{r.href}</code>
            </a>
          ))}
        </div>
        <p className="home-note">Tip: otevřete všechny tři odkazy v samostatných záložkách – změny se synchronizují okamžitě.</p>
      </div>
    </div>
  );
}
