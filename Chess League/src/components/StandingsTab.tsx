import React from 'react';
import type { StandingEntry } from '../types';

interface StandingsTabProps {
  standings: StandingEntry[];
}

export const StandingsTab: React.FC<StandingsTabProps> = ({ standings }) => {
  return (
    <div className="section active">
      <div className="standings-wrap">
        <table className="standings-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th style={{ width: '160px' }}>Player</th>
              <th style={{ width: '30px' }}>P</th>
              <th style={{ width: '30px' }}>W</th>
              <th style={{ width: '30px' }}>D</th>
              <th style={{ width: '30px' }}>L</th>
              <th style={{ width: '42px' }}>Pts</th>
              <th style={{ width: '130px' }}>Form</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((p, i) => {
              const pos = i + 1;
              const bc = pos === 1 ? 'pos-1' : pos === 2 ? 'pos-2' : pos === 3 ? 'pos-3' : 'pos-other';
              const last5 = p.history.slice(-5);
              while (last5.length < 5) (last5 as any[]).unshift(null);

              return (
                <tr key={p.label} className={pos === 1 && p.P > 0 ? 'leader' : ''}>
                  <td><span className={`pos-badge ${bc}`}>{pos}</span></td>
                  <td>{p.name}<span className="username">@{p.username}</span></td>
                  <td>{p.P}</td><td>{p.W}</td><td>{p.D}</td><td>{p.L}</td>
                  <td className="pts-cell">{p.Pts}</td>
                  <td>
                    <div className="form-dots">
                      {last5.map((res, idx) => (
                        res ? (
                          <span key={idx} className={`form-dot ${res === 'W' ? 'form-w' : res === 'D' ? 'form-d' : 'form-l'}`}>
                            {res === 'W' ? '✓' : res === 'D' ? '−' : '✕'}
                          </span>
                        ) : <span key={idx} className="form-empty"></span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
