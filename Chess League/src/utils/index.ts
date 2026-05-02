import type { Player } from '../data';

export function playerLabel(p: Player) { 
  return `${p.name} (${p.username})`; 
}

export function gameKey(divisionId: string, round: number, white: string, black: string) { 
  return `${divisionId}_R${round}_${white}_${black}`; 
}

export const extractUsername = (label: string) => {
  const m = label.match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : '';
};

export const getPlayerDisplay = (label: string) => {
  const username = extractUsername(label);
  const name = label.split(' (')[0];
  return { name, username };
};
