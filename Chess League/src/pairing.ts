export function generateRoundRobin(players: string[]): { round: number; date: string; games: [string, string][] }[] {
  const n = players.length;
  const isOdd = n % 2 !== 0;
  const tempPlayers = [...players];
  if (isOdd) tempPlayers.push("BYE");
  
  const numPlayers = tempPlayers.length;
  const numRounds = numPlayers - 1;
  const gamesPerRound = numPlayers / 2;
  
  const rounds: { round: number; date: string; games: [string, string][] }[] = [];
  
  for (let r = 0; r < numRounds; r++) {
    const roundGames: [string, string][] = [];
    for (let g = 0; g < gamesPerRound; g++) {
      const p1 = tempPlayers[g];
      const p2 = tempPlayers[numPlayers - 1 - g];
      
      if (p1 !== "BYE" && p2 !== "BYE") {
        // Alternate colors
        if ((r + g) % 2 === 0) {
          roundGames.push([p1, p2]);
        } else {
          roundGames.push([p2, p1]);
        }
      }
    }
    
    rounds.push({
      round: r + 1,
      date: `Round ${r + 1} - Date TBD`,
      games: roundGames
    });
    
    // Rotate players (keep the first one fixed)
    tempPlayers.splice(1, 0, tempPlayers.pop()!);
  }
  
  return rounds;
}
