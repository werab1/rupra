import { VARIANTS } from './rules';
import type { MatchSetup, Player, Side, TeamSetup } from './types';

export function starters(team: TeamSetup, setup: MatchSetup): Player[] {
  return team.roster.slice(0, VARIANTS[setup.variant].starters);
}

export function bench(team: TeamSetup, setup: MatchSetup): Player[] {
  const v = VARIANTS[setup.variant];
  return team.roster.slice(v.starters, v.starters + v.bench);
}

/** Hráči na soupisce zápasu (základ + náhradníci). */
export function matchSquad(team: TeamSetup, setup: MatchSetup): Player[] {
  const v = VARIANTS[setup.variant];
  return team.roster.slice(0, v.starters + v.bench);
}

export function findPlayer(setup: MatchSetup, side: Side, id: string | null | undefined): Player | undefined {
  if (!id) return undefined;
  return setup[side].roster.find((p) => p.id === id);
}

export function playerLabel(p: Player | undefined): string {
  return p ? `${p.number} ${p.name}` : '';
}

export function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

export const SIDES: Side[] = ['home', 'away'];
export const otherSide = (s: Side): Side => (s === 'home' ? 'away' : 'home');
