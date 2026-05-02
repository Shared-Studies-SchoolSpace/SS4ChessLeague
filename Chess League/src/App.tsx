import React, { useState, useEffect, useMemo } from 'react';
import { players as initialPlayers, rounds as initialRounds, pinPlayers, pinRounds } from './data';
import { generateRoundRobin } from './pairing';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Supabase imports
import { supabase } from './supabase';

// Modular imports
import type { Result, GameResults, Division, StandingEntry } from './types';
import { playerLabel, gameKey } from './utils';
import { StandingsTab } from './components/StandingsTab';
import { ResultsTab } from './components/ResultsTab';
import { FixturesTab } from './components/FixturesTab';
import { AdminTab } from './components/AdminTab';

const ADMIN_PIN = '1926';

const App: React.FC = () => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [gameResults, setGameResults] = useState<GameResults>({});

  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('default');

  // Sync Divisions from Supabase
  useEffect(() => {
    const fetchDivisions = async () => {
      const { data } = await supabase.from('divisions').select('*');
      const currentDivisions = (data as Division[]) || [];

      const forkExists = currentDivisions.find(d => d.id === 'default');
      const pinExists = currentDivisions.find(d => d.id === 'pin');

      if (!forkExists) {
        const defaultDiv: Division = {
          id: 'default',
          name: 'Fork Division',
          players: initialPlayers,
          rounds: initialRounds as any
        };
        await supabase.from('divisions').upsert(defaultDiv);
      }

      if (!pinExists) {
        const pinDiv: Division = {
          id: 'pin',
          name: 'Pin Division',
          players: pinPlayers,
          rounds: pinRounds as any
        };
        await supabase.from('divisions').upsert(pinDiv);
      }

      const { data: updatedData } = await supabase.from('divisions').select('*');
      if (updatedData) {
        setDivisions(updatedData as Division[]);
      }
    };
    fetchDivisions();

    const channel = supabase
      .channel('divisions_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'divisions' }, () => {
        fetchDivisions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync Results from Supabase
  useEffect(() => {
    const fetchResults = async () => {
      const { data } = await supabase.from('settings').select('data').eq('id', 'gameResults').single();
      if (data && data.data) {
        setGameResults(data.data as GameResults);
      }
    };
    fetchResults();

    const channel = supabase
      .channel('settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchResults();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    divisions.find(d => d.id === selectedDivisionId) || divisions[0] || { id: 'default', name: 'Loading...', players: [], rounds: [] }
  , [divisions, selectedDivisionId]);

  const standings = useMemo(() => {
    if (!currentDivision || currentDivision.players.length === 0) return [];
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

  const handleSetResult = async (key: string, result: Result) => {
    if (!isAdmin) return;
    
    const nextResults = { ...gameResults };
    if (nextResults[key] === result) delete nextResults[key];
    else nextResults[key] = result;

    try {
      await supabase.from('settings').upsert({ id: 'gameResults', data: nextResults });
      toast.success('Result updated!', { autoClose: 1000, theme: 'dark' });
    } catch (e) {
      toast.error('Failed to update result');
    }
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

  const handleCreateDivision = async () => {
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

    const newPlayers = playerNames.map(name => {
      const match = name.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        return { name: match[1].trim(), username: match[2].trim() };
      }
      return { name, username: name.toLowerCase().replace(/\s+/g, '_') };
    });

    const labels = newPlayers.map(p => playerLabel(p));
    const generatedRounds = generateRoundRobin(labels);

    const newId = Date.now().toString();
    const newDiv: Division = {
      id: newId,
      name: newDivName,
      players: newPlayers,
      rounds: generatedRounds as any
    };

    try {
      await supabase.from('divisions').insert(newDiv);
      setNewDivName('');
      setNewDivPlayers('');
      setSelectedDivisionId(newId);
      toast.success(`Division "${newDivName}" generated!`, { theme: 'dark' });
    } catch (e) {
      toast.error('Failed to create division');
    }
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

        {activeTab === 'standings' && <StandingsTab standings={standings} />}
        {activeTab === 'results' && (
          <ResultsTab 
            isAdmin={isAdmin}
            currentDivision={currentDivision}
            currentRound={currentRound}
            setCurrentRound={setCurrentRound}
            gameResults={gameResults}
            handleSetResult={handleSetResult}
          />
        )}
        {activeTab === 'fixtures' && <FixturesTab currentDivision={currentDivision} gameResults={gameResults} />}
        {activeTab === 'admin' && (
          <AdminTab 
            isAdmin={isAdmin}
            newDivName={newDivName}
            setNewDivName={setNewDivName}
            newDivPlayers={newDivPlayers}
            setNewDivPlayers={setNewDivPlayers}
            handleCreateDivision={handleCreateDivision}
            divisions={divisions}
            selectedDivisionId={selectedDivisionId}
            setSelectedDivisionId={setSelectedDivisionId}
            handleAdminToggle={handleAdminToggle}
          />
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
