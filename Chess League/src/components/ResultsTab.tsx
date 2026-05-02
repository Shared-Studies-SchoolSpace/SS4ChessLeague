import React from 'react';
import type { Division, GameResults, Result } from '../types';
import { getPlayerDisplay, gameKey } from '../utils';

interface ResultsTabProps {
  isAdmin: boolean;
  currentDivision: Division;
  currentRound: number;
  setCurrentRound: (round: number) => void;
  gameResults: GameResults;
  handleSetResult: (key: string, result: Result) => void;
}

export const ResultsTab: React.FC<ResultsTabProps> = ({
  isAdmin,
  currentDivision,
  currentRound,
  setCurrentRound,
  gameResults,
  handleSetResult
}) => {
  return (
    <div className="section active">
      <div className="admin-status-indicator">
        {isAdmin ? '🔓 Admin Mode' : '🔒 View Only'}
      </div>
      <div className="round-selector">
        <label>Round</label>
        <div className="round-pills">
          {currentDivision.rounds.map(r => {
            const allDone = r.games.every(([w, b]) => gameResults[gameKey(currentDivision.id, r.round, w, b)]);
            return (
              <button
                key={r.round}
                className={`round-pill ${currentRound === r.round ? 'active' : ''} ${allDone ? 'completed' : ''}`}
                onClick={() => setCurrentRound(r.round)}
              >
                R{r.round}
              </button>
            );
          })}
        </div>
      </div>
      <div className="round-date-label">{currentDivision.rounds[currentRound - 1]?.date}</div>
      <div id="games-list">
        {currentDivision.rounds[currentRound - 1]?.games.map(([w, b]) => {
          const key = gameKey(currentDivision.id, currentRound, w, b);
          const res = gameResults[key];
          const wP = getPlayerDisplay(w);
          const bP = getPlayerDisplay(b);
          return (
            <div key={key} className="game-card">
              <div className="player-name">{wP.name}<span className="uname">@{wP.username}</span></div>
              <span className="vs">vs</span>
              <div className="player-name" style={{ textAlign: 'right' }}>{bP.name}<span className="uname">@{bP.username}</span></div>
              <div className="result-btns">
                <button className={`res-btn ${res === 'white' ? 'win' : ''}`} disabled={!isAdmin} onClick={() => handleSetResult(key, 'white')}>{wP.name}</button>
                <button className={`res-btn ${res === 'draw' ? 'draw' : ''}`} disabled={!isAdmin} onClick={() => handleSetResult(key, 'draw')}>Draw</button>
                <button className={`res-btn ${res === 'black' ? 'loss' : ''}`} disabled={!isAdmin} onClick={() => handleSetResult(key, 'black')}>{bP.name}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
