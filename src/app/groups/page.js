"use client";
import { useState, useEffect } from 'react';

export default function Groups() {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    fetch('/api/teams').then(res => res.json()).then(setTeams);
  }, []);

  // Group teams by group_id
  const groups = {};
  ['A','B','C','D','E','F','G','H','I','J','K','L'].forEach(g => groups[g] = []);
  
  teams.forEach(t => {
    if (groups[t.group_id]) groups[t.group_id].push(t);
  });

  return (
    <div>
      <h2>Csoportok</h2>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem'}}>
        {Object.keys(groups).map(g => (
          <div key={g} className="card">
            <h3>{g} Csoport</h3>
            <table style={{fontSize: '0.9rem'}}>
              <thead>
                <tr>
                  <th>Csapat</th>
                  <th>Meccs</th>
                  <th>Elo</th>
                </tr>
              </thead>
              <tbody>
                {groups[g].map(t => (
                  <tr key={t.team_name}>
                    <td><strong>{t.team_name}</strong></td>
                    <td>{t.matches_played || 0}</td>
                    <td>{t.elo ? t.elo.toFixed(1) : t.fifa_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
