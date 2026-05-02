import React from 'react';
import type { Division, GameResults } from '../types';
import { getPlayerDisplay, gameKey } from '../utils';

interface FixturesTabProps {
  currentDivision: Division;
  gameResults: GameResults;
}

export const FixturesTab: React.FC<FixturesTabProps> = ({ currentDivision, gameResults }) => {
  return (
    <div className="section active">
      <div id="fixtures-list">
        {currentDivision.rounds.map((r) => (
          <div key={r.round} className="fixture-round">
            <div className="fixture-round-header">
              <span>Round {r.round}</span>
              <span>{r.date}</span>
            </div>
            <div className="fixture-wrap">
              {r.games.map(([w, b]) => {
                const res = gameResults[gameKey(currentDivision.id, r.round, w, b)];
                const wP = getPlayerDisplay(w);
                const bP = getPlayerDisplay(b);
                return (
                  <div key={`${r.round}_${w}_${b}`} className={`fixture-game ${res ? 'done' : ''}`}>
                    <span className="color-badge white-badge">W</span>
                    <div style={{ flex: 1 }}>{wP.name}<span className="uname" style={{ fontSize: '10px' }}>@{wP.username}</span></div>
                    <span className="vs-small">vs</span>
                    <div style={{ flex: 1, textAlign: 'right' }}>{bP.name}<span className="uname" style={{ fontSize: '10px' }}>@{bP.username}</span></div>
                    <span className="color-badge black-badge">B</span>
                    {res === 'white' && <span className="result-tag">{wP.name}</span>}
                    {res === 'black' && <span className="result-tag">{bP.name}</span>}
                    {res === 'draw' && <span className="result-tag">Draw</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
