import type { LogItem } from '../domain/types';

type Name = LogItem['icon'] | 'undo' | 'play' | 'pause' | 'next' | 'gear' | 'close' | 'download' | 'eye' | 'swap' | 'external';

/** Jednoduchá sada ikon (inline SVG, currentColor). */
export function Icon({ name, className = 'ico', title }: { name: Name; className?: string; title?: string }) {
  const common = { className, viewBox: '0 0 24 24', 'aria-hidden': title ? undefined : true, role: title ? 'img' : undefined };
  switch (name) {
    case 'try':
      // ovál míče
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="12" rx="10" ry="6.2" transform="rotate(-35 12 12)" />
          <path d="M8.5 15.5l7-7M10 11.6l2.4 2.4M11.8 9.8l2.4 2.4" strokeLinecap="round" />
        </svg>
      );
    case 'kick':
      // branka (H)
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 3v18M18 3v18M6 14h12" />
        </svg>
      );
    case 'card-yellow':
      return (
        <svg {...common}>
          <rect x="6" y="3" width="12" height="18" rx="1.5" transform="rotate(8 12 12)" fill="var(--c-card-yellow)" />
        </svg>
      );
    case 'card-red':
      return (
        <svg {...common}>
          <rect x="6" y="3" width="12" height="18" rx="1.5" transform="rotate(8 12 12)" fill="var(--c-card-red)" />
        </svg>
      );
    case 'sub':
    case 'swap':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 4v14M3.5 14.5 7 18l3.5-3.5" stroke="var(--c-danger)" />
          <path d="M17 20V6M13.5 9.5 17 6l3.5 3.5" stroke="var(--c-ok)" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2M10 2h4" />
        </svg>
      );
    case 'period':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
        </svg>
      );
    case 'undo':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </svg>
      );
    case 'play':
      return (
        <svg {...common} fill="currentColor">
          <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.2-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common} fill="currentColor">
          <rect x="5.5" y="4" width="4.5" height="16" rx="1" />
          <rect x="14" y="4" width="4.5" height="16" rx="1" />
        </svg>
      );
    case 'next':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 5l7 7-7 7M13 5l7 7-7 7" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case 'download':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'external':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      );
  }
}
