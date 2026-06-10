"use client";
import { useState, useEffect } from 'react';

export default function Admin() {
  const [teamName, setTeamName] = useState('');
  const [fifaPoints, setFifaPoints] = useState('');
  const [fifaRank, setFifaRank] = useState('');
  const [groupId, setGroupId] = useState('A');
  const [teams, setTeams] = useState([]);

  const fetchTeams = () => {
    fetch('/api/teams').then(res => res.json()).then(setTeams);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_name: teamName,
        fifa_points: parseFloat(fifaPoints),
        fifa_rank: parseInt(fifaRank),
        group_id: groupId
      })
    });
    setTeamName('');
    setFifaPoints('');
    setFifaRank('');
    fetchTeams();
  };

  return (
    <div className="card">
      <h2>Csapat Hozzáadása</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Csapat neve</label>
          <input value={teamName} onChange={e => setTeamName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>FIFA Pontszám</label>
          <input type="number" step="0.1" value={fifaPoints} onChange={e => setFifaPoints(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>FIFA Rangsor helyezés</label>
          <input type="number" value={fifaRank} onChange={e => setFifaRank(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Csoport (A-L)</label>
          <select value={groupId} onChange={e => setGroupId(e.target.value)}>
            {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <button type="submit">Hozzáadás</button>
      </form>

      <h3 style={{marginTop: '2rem'}}>Eddig rögzített csapatok ({teams.length}/48)</h3>
      <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
        {teams.map(t => (
          <div key={t.team_name} style={{background: 'rgba(0,0,0,0.3)', padding: '0.5rem 1rem', borderRadius: '8px'}}>
            {t.team_name} ({t.group_id})
          </div>
        ))}
      </div>
    </div>
  );
}
