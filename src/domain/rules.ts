import type { ScoreKind, Variant, CardKind } from './types';

export const POINTS: Record<ScoreKind, number> = {
  try: 5,
  conversion: 2,
  penalty: 3,
  dropgoal: 3,
  penaltytry: 7,
};

export const SCORE_LABEL: Record<ScoreKind, string> = {
  try: 'Položení',
  conversion: 'Proměněný kop',
  penalty: 'Trestný kop',
  dropgoal: 'Drop goal',
  penaltytry: 'Trestné položení',
};

export const SCORE_ORDER: ScoreKind[] = ['try', 'conversion', 'penalty', 'dropgoal', 'penaltytry'];

export const CARD_LABEL: Record<CardKind, string> = {
  yellow: 'Žlutá karta',
  red: 'Červená karta',
};

export interface VariantRules {
  label: string;
  halfMin: number;
  yellowMin: number;
  starters: number;
  bench: number;
}

export const VARIANTS: Record<Variant, VariantRules> = {
  xv: { label: 'Patnáctky (XV)', halfMin: 40, yellowMin: 10, starters: 15, bench: 8 },
  sevens: { label: 'Sedmičky (7s)', halfMin: 7, yellowMin: 2, starters: 7, bench: 5 },
};
