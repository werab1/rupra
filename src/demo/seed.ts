import { createInitialState, reducer } from '../domain/reducer';
import { sampleSetup } from '../domain/sampleData';
import type { Action, AppState } from '../domain/types';

/**
 * Rozehraný ukázkový zápas: 23. minuta, čas běží, scorebug ve vysílání,
 * hosté mají hráče na žluté kartě. Razítka jsou posunutá do minulosti,
 * takže čas i odpočet karty plynule navazují.
 */
export function seedDemoState(now = Date.now()): AppState {
  const MIN = 60_000;
  const t0 = now - 23 * MIN - 12_000;
  let s = createInitialState(sampleSetup());
  let n = 0;
  const at = (a: Action, ts: number) => {
    s = reducer(s, { ...a, id: `demo-${++n}`, ts } as Parameters<typeof reducer>[1]);
  };
  at({ type: 'CLOCK_START' }, t0);
  at({ type: 'SCORE', side: 'home', kind: 'try', playerId: 'h11' }, t0 + 6 * MIN + 20_000);
  at({ type: 'SCORE', side: 'home', kind: 'conversion', playerId: 'h10' }, t0 + 7 * MIN + 5_000);
  at({ type: 'SCORE', side: 'away', kind: 'penalty', playerId: 'a10' }, t0 + 13 * MIN + 40_000);
  at({ type: 'CARD', side: 'away', card: 'yellow', playerId: 'a6' }, t0 + 17 * MIN + 5_000);
  at({ type: 'SUB', side: 'home', outId: 'h3', inId: 'h18' }, t0 + 20 * MIN + 30_000);
  at({ type: 'SHOW_GRAPHIC', graphic: 'scorebug' }, now - 1000);
  // Hlášení z hřiště: jedno už schválené, dvě čekají na kontrolu (jedno s varováním).
  at({ type: 'SUBMIT', items: [{ side: 'home', playerId: 'h12', kind: 'penalty' }] }, t0 + 21 * MIN + 40_000);
  at({ type: 'APPROVE', submissionId: `demo-${n}-0` }, t0 + 22 * MIN);
  at(
    {
      type: 'SUBMIT',
      items: [
        { side: 'away', playerId: 'a14', kind: 'try' },
        { side: 'away', playerId: 'a6', kind: 'yellow' },
      ],
    },
    now - 25_000,
  );
  return { ...s, notification: null };
}
