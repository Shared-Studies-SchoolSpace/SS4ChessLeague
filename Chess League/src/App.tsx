import React, { useState, useEffect, useMemo } from 'react';
import { players as initialPlayers, rounds as initialRounds } from './data';
import type { Player, Round } from './data';
import { generateRoundRobin } from './pairing';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

const STORAGE_KEY = 'ss4_chess_league_2026_v2';
const RESULTS_KEY = 'ss4_chess_league_results_v2';
const ADMIN_PIN = '1926';

type Result = 'white' | 'black' | 'draw' | null;
type GameResults = Record<string, Result>;

interface Division {
  id: string;
  name: string;
  players: Player[];
  rounds: Round[];
}

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
function gameKey(divisionId: string, round: number, white: string, black: string) { 
  return `${divisionId}_R${round}_${white}_${black}`; 
}

const App: React.FC = () => {
  const [divisions, setDivisions] = useState<Division[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return [{
      id: 'default',
      name: 'Fork Division',
      players: initialPlayers,
      rounds: initialRounds
    }];
  });

  const [selectedDivisionId, setSelectedDivisionId] = useState<string>(divisions[0].id);
  const [gameResults, setGameResults] = useState<GameResults>(() => {
    const raw = localStorage.getItem(RESULTS_KEY);
    const results = raw ? JSON.parse(raw) : {};
    
    // Migration: Check for old storage key and migrate to 'default' division
    const oldRaw = localStorage.getItem('ss4_chess_league_2026');
    if (oldRaw) {
      const oldResults = JSON.parse(oldRaw);
      Object.keys(oldResults).forEach(key => {
        // Only migrate if not already present in new format
        const newKey = `default_${key}`;
        if (!results[newKey]) {
          results[newKey] = oldResults[key];
        }
      });
      // Optionally clear old data after migration
      // localStorage.removeItem('ss4_chess_league_2026');
    }
    return results;
  });

  const [activeTab, setActiveTab] = useState<'standings' | 'results' | 'fixtures' | 'admin'>('standings');
  const [currentRound, setCurrentRound] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Division creation state
  const [newDivName, setNewDivName] = useState('');
  const [newDivPlayers, setNewDivPlayers] = useState('');

  const currentDivision = useMemo(() => 
    divisions.find(d => d.id === selectedDivisionId) || divisions[0]
  , [divisions, selectedDivisionId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(divisions));
  }, [divisions]);

  useEffect(() => {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(gameResults));
  }, [gameResults]);

  const standings = useMemo(() => {
    const stats: Record<string, StandingEntry> = {};
    currentDivision.players.forEach(p => {
      const lbl = playerLabel(p);
      stats[lbl] = { label: lbl, name: p.name, username: p.username, P: 0, W: 0, D: 0, L: 0, Pts: 0, h2h: {}, history: [] };
    });

    currentDivision.rounds.forEach(r => {
      r.games.forEach(([w, b]) => {
        const key = gameKey(currentDivision.id, r.round, w, b);
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
  }, [gameResults, currentDivision]);

  const handleSetResult = (key: string, result: Result) => {
    if (!isAdmin) return;
    setGameResults(prev => {
      const next = { ...prev };
      if (next[key] === result) delete next[key];
      else next[key] = result;
      return next;
    });
    toast.success('Result updated!', { autoClose: 1000, theme: 'dark' });
  };

  const [lastTap, setLastTap] = useState(0);
  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      if (activeTab === 'admin') setActiveTab('standings');
      toast.info('Logged out from admin', { theme: 'dark' });
    } else {
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const handleTouchStart = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      handleAdminToggle();
    }
    setLastTap(now);
  };

  const submitPin = () => {
    if (pinInput === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
      toast.success('Admin access granted!', { theme: 'dark' });
    } else {
      setPinError('Incorrect PIN. Try again.');
      setPinInput('');
    }
  };

  const handleCreateDivision = () => {
    if (!newDivName.trim() || !newDivPlayers.trim()) {
      toast.error('Please enter division name and players', { theme: 'dark' });
      return;
    }

    const playerNames = newDivPlayers.split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (playerNames.length < 2) {
      toast.error('At least 2 players required', { theme: 'dark' });
      return;
    }

    const newPlayers: Player[] = playerNames.map(name => {
      // Basic extraction of username if provided in "Name (Username)" format
      const match = name.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        return { name: match[1].trim(), username: match[2].trim() };
      }
      return { name, username: name.toLowerCase().replace(/\s+/g, '_') };
    });

    const labels = newPlayers.map(p => playerLabel(p));
    const generatedRounds = generateRoundRobin(labels);

    const newDiv: Division = {
      id: Date.now().toString(),
      name: newDivName,
      players: newPlayers,
      rounds: generatedRounds as any // Types match closely enough for this demo
    };

    setDivisions(prev => [...prev, newDiv]);
    setNewDivName('');
    setNewDivPlayers('');
    toast.success(`Division "${newDivName}" generated!`, { theme: 'dark' });
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
      <ToastContainer position="bottom-right" />
      <nav className="top-nav">
        <img src="/SS4_logo.png" alt="SS4 Logo" className="nav-logo" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <div className="nav-title">
          <h1>SS4 Chess League</h1>
          <span onDoubleClick={handleAdminToggle} onTouchStart={handleTouchStart} style={{ cursor: 'default' }}>The Board Remembers</span>
        </div>
      </nav>

      <div className="league-wrap">
        <div className="division-selector-bar">
          <label>Division:</label>
          <select 
            value={selectedDivisionId} 
            onChange={(e) => {
              setSelectedDivisionId(e.target.value);
              setCurrentRound(1);
            }}
          >
            {divisions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="hero">
          <div className="hero-content">
            <h2>{currentDivision.name}</h2>
            <p>Think Deep, Play True</p>
            <div className="hero-stats">
              <span className="hero-stat">{currentDivision.players.length} Players</span>
              <span className="hero-stat blue">{currentDivision.rounds.length} Rounds</span>
              <span className="hero-stat">Win = 3 · Draw = 1 · Loss = 0</span>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'standings' ? 'active' : ''}`} onClick={() => setActiveTab('standings')}>Standings</button>
          <button className={`tab ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>Results</button>
          <button className={`tab ${activeTab === 'fixtures' ? 'active' : ''}`} onClick={() => setActiveTab('fixtures')}>Fixtures</button>
          {isAdmin && (
            <button className={`tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Manage</button>
          )}
        </div>

        {activeTab === 'standings' && (
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
        )}

        {activeTab === 'results' && (
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
        )}

        {activeTab === 'fixtures' && (
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
        )}

        {activeTab === 'admin' && isAdmin && (
          <div className="section active">
            <div className="admin-creation-panel">
              <h3>Create New Division</h3>
              <div className="form-group">
                <label>Division Name</label>
                <input 
                  type="text" 
                  value={newDivName} 
                  onChange={e => setNewDivName(e.target.value)} 
                  placeholder="e.g. Knight Division"
                />
              </div>
              <div className="form-group">
                <label>Players (one per line)</label>
                <textarea 
                  rows={8}
                  value={newDivPlayers} 
                  onChange={e => setNewDivPlayers(e.target.value)} 
                  placeholder={"Magnus (Carlsen)\nHikaru (Nakamura)\nFabiano (Caruana)"}
                />
              </div>
              <button className="generate-btn" onClick={handleCreateDivision}>Generate Division & Pairings</button>
            </div>

            <div className="admin-manage-panel">
              <h3>Existing Divisions</h3>
              <div className="division-list">
                {divisions.map(d => (
                  <div key={d.id} className="division-item">
                    <span>{d.name} ({d.players.length} players)</span>
                    <button 
                      className="delete-btn" 
                      onClick={() => {
                        if (divisions.length === 1) {
                          toast.error('Cannot delete the last division', { theme: 'dark' });
                          return;
                        }
                        if (window.confirm(`Delete ${d.name}?`)) {
                          setDivisions(prev => prev.filter(div => div.id !== d.id));
                          if (selectedDivisionId === d.id) setSelectedDivisionId(divisions.find(div => div.id !== d.id)!.id);
                          toast.warn(`Deleted ${d.name}`, { theme: 'dark' });
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <button className="logout-btn" onClick={handleAdminToggle}>Lock Admin Access</button>
            </div>
          </div>
        )}
      </div>

      {showPinModal && (
        <div className="pin-overlay show" onClick={() => setShowPinModal(false)}>
          <div className="pin-modal" onClick={e => e.stopPropagation()}>
            <h3>🔐 Admin Access</h3>
            <p>Enter your PIN to manage the league.</p>
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
