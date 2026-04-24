import React, { useState, useEffect, useMemo } from 'react';
import { players, rounds, Player, Round } from './data';
import './App.css';

const STORAGE_KEY = 'ss4_chess_league_2026';
const ADMIN_PIN = '1926';

type Result = 'white' | 'black' | 'draw' | null;
type GameResults = Record<string, Result>;

interface StandingEntry {
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

function playerLabel(p: Player) { return `${p.name} (${p.username})`; }
function gameKey(round: number, white: string, black: string) { return `R${round}_${white}_${black}`; }

const App: React.FC = () => {
  const [gameResults, setGameResults] = useState<GameResults>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  });
  const [activeTab, setActiveTab] = useState<'standings' | 'results' | 'fixtures'>('standings');
  const [currentRound, setCurrentRound] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameResults));
  }, [gameResults]);

  const standings = useMemo(() => {
    const stats: Record<string, StandingEntry> = {};
    players.forEach(p => {
      const lbl = playerLabel(p);
      stats[lbl] = { label: lbl, name: p.name, username: p.username, P: 0, W: 0, D: 0, L: 0, Pts: 0, h2h: {}, history: [] };
    });

    rounds.forEach(r => {
      r.games.forEach(([w, b]) => {
        const key = gameKey(r.round, w, b);
        const res = gameResults[key];
        if (!res || !stats[w] || !stats[b]) return;

        stats[w].P++; stats[b].P++;
        if (res === 'white') {
          stats[w].W++; stats[w].Pts += 3; stats[b].L++;
          stats[w].h2h[b] = (stats[w].h2h[b] || 0) + 3;
          stats[w].history.push('W'); stats[b].history.push('L');
        } else if (res === 'draw') {
          stats[w].D++; stats[w].Pts += 1; stats[b].D++; stats[b].Pts += 1;
          stats[w].h2h[b] = (stats[w].h2h[b] || 0) + 1; stats[b].h2h[w] = (stats[b].h2h[w] || 0) + 1;
          stats[w].history.push('D'); stats[b].history.push('D');
        } else {
          stats[b].W++; stats[b].Pts += 3; stats[w].L++;
          stats[b].h2h[w] = (stats[b].h2h[w] || 0) + 3;
          stats[b].history.push('W'); stats[w].history.push('L');
        }
      });
    });

    return Object.values(stats).sort((a, b) => {
      if (b.Pts !== a.Pts) return b.Pts - a.Pts;
      const aVsB = a.h2h[b.label] || 0;
      const bVsA = b.h2h[a.label] || 0;
      if (bVsA !== aVsB) return bVsA - aVsB;
      if (b.W !== a.W) return b.W - a.W;
      if (a.L !== b.L) return a.L - b.L;
      return a.name.localeCompare(b.name);
    });
  }, [gameResults]);

  const handleSetResult = (key: string, result: Result) => {
    if (!isAdmin) return;
    setGameResults(prev => {
      const next = { ...prev };
      if (next[key] === result) delete next[key];
      else next[key] = result;
      return next;
    });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1800);
  };

  const handleAdminToggle = () => {
    if (isAdmin) setIsAdmin(false);
    else {
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const submitPin = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPinInput('');
    }
  };

  const extractUsername = (label: string) => {
    const m = label.match(/\(([^)]+)\)\s*$/);
    return m ? m[1] : '';
  };

  const getPlayerDisplay = (label: string) => {
    const username = extractUsername(label);
    const name = label.split(' (')[0];
    return { name, username };
  };

  return (
    <>
      <nav className="top-nav">
        <img src="/SS4_logo.png" alt="SS4 Logo" className="nav-logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div className="nav-title">
          <h1>SS4 Chess League</h1>
          <span>The Board Remembers</span>
        </div>
      </nav>

      <div className="league-wrap">
        <div className="hero">
          <div className="hero-content">
            <h2>Fork Division</h2>
            <p>Think Deep, Play True</p>
            <div className="hero-stats">
              <span className="hero-stat">20 Players</span>
              <span className="hero-stat blue">38 Rounds</span>
              <span className="hero-stat">Win = 3 · Draw = 1 · Loss = 0</span>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'standings' ? 'active' : ''}`} onClick={() => setActiveTab('standings')}>Standings</button>
          <button className={`tab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>Enter Results</button>
          <button className={`tab ${activeTab === 'fixtures' ? 'active' : ''}`} onClick={() => setActiveTab('fixtures')}>Fixtures</button>
        </div>

        {activeTab === 'standings' && (
          <div id="standings" className="section active">
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
            <p className="tiebreaker-note">Tiebreaker: head-to-head record · Form shows last 5 played games</p>
          </div>
        )}

        {activeTab === 'results' && (
          <div id="results" className="section active">
            <div className="admin-bar">
              <span className={`admin-status ${isAdmin ? 'unlocked' : 'locked'}`}>
                {isAdmin ? '✓ Admin Mode' : '🔒 View Only'}
              </span>
              <button className={`admin-lock-btn ${isAdmin ? 'lock' : 'unlock'}`} onClick={handleAdminToggle}>
                {isAdmin ? 'Lock' : 'Admin Login'}
              </button>
            </div>
            {!isAdmin && (
              <div className="view-only-notice">
                Results are <strong>view-only</strong> for visitors. Enter the admin PIN to record or update game results.
              </div>
            )}
            <div className="round-selector">
              <label>Round</label>
              <div className="round-pills">
                {rounds.map(r => {
                  const allDone = r.games.every(([w, b]) => gameResults[gameKey(r.round, w, b)]);
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
              <span className={`save-indicator ${showSaved ? 'show' : ''}`}>✓ Saved</span>
            </div>
            <div className="round-date-label">{rounds[currentRound - 1].date}</div>
            <div id="games-list">
              {rounds[currentRound - 1].games.map(([w, b], idx) => {
                const key = gameKey(currentRound, w, b);
                const res = gameResults[key];
                const wP = getPlayerDisplay(w);
                const bP = getPlayerDisplay(b);
                return (
                  <div key={key} className="game-card" style={{ animationDelay: `${idx * 0.03}s` }}>
                    <div className="player-name">{wP.name}<span className="uname">@{wP.username}</span></div>
                    <span className="vs">vs</span>
                    <div className="player-name" style={{ textAlign: 'right' }}>{bP.name}<span className="uname">@{bP.username}</span></div>
                    <div className="result-btns">
                      <button className={`res-btn ${res === 'white' ? 'win' : ''}`} disabled={!isAdmin} onClick={() => handleSetResult(key, 'white')}>{wP.name} wins</button>
                      <button className={`res-btn ${res === 'draw' ? 'draw' : ''}`} disabled={!isAdmin} onClick={() => handleSetResult(key, 'draw')}>Draw</button>
                      <button className={`res-btn ${res === 'black' ? 'loss' : ''}`} disabled={!isAdmin} onClick={() => handleSetResult(key, 'black')}>{bP.name} wins</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'fixtures' && (
          <div id="fixtures" className="section active">
            <div id="fixtures-list">
              {rounds.map((r, ri) => (
                <div key={r.round} className="fixture-round" style={{ animationDelay: `${Math.min(ri * 0.015, 0.4)}s` }}>
                  <div className="fixture-round-header">
                    <span>Round {r.round}</span>
                    <span>{r.date}</span>
                  </div>
                  <div className="fixture-wrap">
                    {r.games.map(([w, b]) => {
                      const res = gameResults[gameKey(r.round, w, b)];
                      const wP = getPlayerDisplay(w);
                      const bP = getPlayerDisplay(b);
                      return (
                        <div key={`${r.round}_${w}_${b}`} className={`fixture-game ${res ? 'done' : ''}`}>
                          <span className="color-badge white-badge">W</span>
                          <div style={{ flex: 1 }}>{wP.name}<span className="uname" style={{ fontSize: '10px' }}>@{wP.username}</span></div>
                          <span style={{ fontSize: '11px', color: 'var(--ss4-orange-glow)', width: '24px', textAlign: 'center', fontWeight: 700, letterSpacing: '0.1em' }}>vs</span>
                          <div style={{ flex: 1, textAlign: 'right' }}>{bP.name}<span className="uname" style={{ fontSize: '10px' }}>@{bP.username}</span></div>
                          <span className="color-badge black-badge">B</span>
                          {res === 'white' && <span className="result-tag">{wP.name} W</span>}
                          {res === 'black' && <span className="result-tag">{bP.name} W</span>}
                          {res === 'draw' && <span className="result-tag">Draw</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPinModal && (
        <div className="pin-overlay show" onClick={() => setShowPinModal(false)}>
          <div className="pin-modal" onClick={e => e.stopPropagation()}>
            <h3>🔐 Admin Access</h3>
            <p>Enter your PIN to enter or edit results.</p>
            <div className="pin-input-wrap">
              <input
                className={`pin-input ${pinError ? 'error' : ''}`}
                type="password"
                inputMode="numeric"
                maxLength={8}
                placeholder="· · · ·"
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError(''); }}
                onKeyDown={e => e.key === 'Enter' && submitPin()}
                autoFocus
              />
            </div>
            <div className="pin-error-msg">{pinError}</div>
            <div className="pin-modal-btns">
              <button className="pin-cancel" onClick={() => setShowPinModal(false)}>Cancel</button>
              <button className="pin-submit" onClick={submitPin}>Unlock</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
