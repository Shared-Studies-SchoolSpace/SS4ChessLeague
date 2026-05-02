import type { Player, Round } from '../data';

export type Result = 'white' | 'black' | 'draw' | null;
export type GameResults = Record<string, Result>;

export interface Division {
  id: string;
  name: string;
  players: Player[];
  rounds: Round[];
}

export interface StandingEntry {
  label: string;
  name: string;
  username: string;
  P: number;
  W: number;
  D: number;
  L: number;
  Pts: number;
  h2h: Record<string, number>;
  history: ('W' | 'D' | 'L')[];
}
