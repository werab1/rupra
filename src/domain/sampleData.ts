import type { MatchSetup, Player } from './types';

const XV_POSITIONS = [
  'Pilíř', 'Mlynář', 'Pilíř', 'Druhá řada', 'Druhá řada', 'Rojník', 'Rojník', 'Uzávěr',
  'Mlýnová spojka', 'Útoková spojka', 'Křídlo', 'Centr', 'Centr', 'Křídlo', 'Zadák',
  'Mlynář', 'Pilíř', 'Pilíř', 'Druhá řada', 'Rojník', 'Mlýnová spojka', 'Útoková spojka', 'Centr',
];

function roster(prefix: string, names: string[]): Player[] {
  return names.map((name, i) => ({
    id: `${prefix}${i + 1}`,
    number: i + 1,
    name,
    position: XV_POSITIONS[i] ?? '',
  }));
}

const HOME_NAMES = [
  'Ondřej Kratochvíl', 'Lukáš Beneš', 'Marek Holub', 'Jakub Šťastný', 'Tomáš Vrba',
  'Filip Kolář', 'Adam Machala', 'Vojtěch Pešek', 'David Říha', 'Matěj Hájek',
  'Daniel Kopecký', 'Jan Bartoš', 'Šimon Polák', 'Michal Zeman', 'Petr Doležal',
  'Radek Sýkora', 'Karel Musil', 'Josef Moravec', 'Martin Kučera', 'Viktor Hruška',
  'Patrik Fiala', 'Dominik Novák', 'Roman Tichý',
];

const AWAY_NAMES = [
  'Štěpán Černý', 'Aleš Procházka', 'Libor Krejčí', 'Václav Horák', 'Jiří Mareš',
  'Robert Kadlec', 'Pavel Urban', 'Igor Navrátil', 'Tadeáš Šimek', 'Kryštof Vávra',
  'Erik Bláha', 'Hynek Pospíšil', 'Zdeněk Jelínek', 'Antonín Růžička', 'Oskar Malý',
  'Bohumil Staněk', 'Richard Vlček', 'Miroslav Pokorný', 'Ladislav Kříž', 'Samuel Hladík',
  'Vít Charvát', 'Denis Kubíček', 'Jaroslav Šindelář',
];

export function sampleSetup(): MatchSetup {
  return {
    variant: 'xv',
    competition: 'Ukázková liga ragby 2026',
    venue: 'Stadion U Splavu',
    home: {
      name: 'RC Kamenní Draci',
      short: 'DRA',
      color: '#E0312B',
      roster: roster('h', HOME_NAMES),
    },
    away: {
      name: 'RK Lesní Vlci',
      short: 'VLK',
      color: '#13A8C4',
      roster: roster('a', AWAY_NAMES),
    },
    officials: [
      { name: 'Tomáš Novotný', role: 'Hlavní rozhodčí' },
      { name: 'Petr Svoboda', role: 'Asistent rozhodčího' },
      { name: 'Jan Dvořák', role: 'Asistent rozhodčího' },
    ],
  };
}
