import React from 'react';
import type { Division } from '../types';
import { toast } from 'react-toastify';
import { supabase } from '../supabase';

interface AdminTabProps {
  isAdmin: boolean;
  newDivName: string;
  setNewDivName: (val: string) => void;
  newDivPlayers: string;
  setNewDivPlayers: (val: string) => void;
  handleCreateDivision: () => void;
  divisions: Division[];
  selectedDivisionId: string;
  setSelectedDivisionId: (id: string) => void;
  handleAdminToggle: () => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  isAdmin,
  newDivName,
  setNewDivName,
  newDivPlayers,
  setNewDivPlayers,
  handleCreateDivision,
  divisions,
  selectedDivisionId,
  setSelectedDivisionId,
  handleAdminToggle
}) => {
  if (!isAdmin) return null;

  return (
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
                onClick={async () => {
                  if (divisions.length === 1) {
                    toast.error('Cannot delete the last division', { theme: 'dark' });
                    return;
                  }
                  if (window.confirm(`Delete ${d.name}?`)) {
                    try {
                      await supabase.from('divisions').delete().eq('id', d.id);
                      if (selectedDivisionId === d.id) {
                        setSelectedDivisionId(divisions.find(div => div.id !== d.id)!.id);
                      }
                      toast.warn(`Deleted ${d.name}`, { theme: 'dark' });
                    } catch (e) {
                      toast.error('Failed to delete division');
                    }
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
  );
};
