"use client";
import { useState, useEffect } from 'react';

export default function Matches() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);

  // Form state
  const [teamHome, setTeamHome] = useState('');
  const [teamAway, setTeamAway] = useState('');
  const [goalsHome, setGoalsHome] = useState('0');
  const [goalsAway, setGoalsAway] = useState('0');
  const [stage, setStage] = useState('group');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingMatchId, setEditingMatchId] = useState(null);

  useEffect(() => {
    fetch('/api/teams').then(res => res.json()).then(data => {
      setTeams(data);
      if (data.length > 1) {
        setTeamHome(data[0].team_name);
        setTeamAway(data[1].team_name);
      }
    });
    fetchMatches();
  }, []);

  const fetchMatches = () => {
    fetch('/api/matches').then(res => res.json()).then(setMatches);
  };

  const handleEditClick = (m) => {
    setEditingMatchId(m.id);
    setTeamHome(m.team_home);
    setTeamAway(m.team_away);
    setGoalsHome(m.goals_home.toString());
    setGoalsAway(m.goals_away.toString());
    setStage(m.stage);
    setMatchDate(m.match_date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (id) => {
    if (!confirm('Biztosan törölni akarod ezt a meccset? Ekkor a teljes modell és a szimuláció újra lesz számolva!')) return;
    await fetch(`/api/matches/${id}`, { method: 'DELETE' });
    fetchMatches();
  };

  const handleCancelEdit = () => {
    setEditingMatchId(null);
    setGoalsHome('0');
    setGoalsAway('0');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tHomeObj = teams.find(t => t.team_name === teamHome);
    
    const payload = {
      team_home: teamHome,
      team_away: teamAway,
      goals_home: parseInt(goalsHome),
      goals_away: parseInt(goalsAway),
      stage: stage,
      group_id: stage === 'group' ? tHomeObj?.group_id : null,
      match_date: matchDate,
      aet: false,
      penalties: false
    };

    if (editingMatchId) {
      await fetch(`/api/matches/${editingMatchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setEditingMatchId(null);
      setGoalsHome('0');
      setGoalsAway('0');
    } else {
      await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    
    fetchMatches();
  };

  return (
    <div>
      <div className="card">
        <h2>{editingMatchId ? 'Mérkőzés Szerkesztése' : 'Mérkőzés Rögzítése'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{display: 'flex', gap: '1rem'}}>
            <div className="form-group" style={{flex: 1}}>
              <label>Hazai csapat</label>
              <select value={teamHome} onChange={e => setTeamHome(e.target.value)}>
                {teams.map(t => <option key={t.team_name} value={t.team_name}>{t.team_name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Vendég csapat</label>
              <select value={teamAway} onChange={e => setTeamAway(e.target.value)}>
                {teams.map(t => <option key={t.team_name} value={t.team_name}>{t.team_name}</option>)}
              </select>
            </div>
          </div>
          
          <div style={{display: 'flex', gap: '1rem'}}>
            <div className="form-group" style={{flex: 1}}>
              <label>Hazai gól</label>
              <input type="number" value={goalsHome} onChange={e => setGoalsHome(e.target.value)} required />
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Vendég gól</label>
              <input type="number" value={goalsAway} onChange={e => setGoalsAway(e.target.value)} required />
            </div>
          </div>

          <div style={{display: 'flex', gap: '1rem'}}>
            <div className="form-group" style={{flex: 1}}>
              <label>Szakasz</label>
              <select value={stage} onChange={e => setStage(e.target.value)}>
                <option value="group">Csoportkör</option>
                <option value="r32">Legjobb 32</option>
                <option value="r16">Nyolcaddöntő</option>
                <option value="qf">Negyeddöntő</option>
                <option value="sf">Elődöntő</option>
                <option value="final">Döntő</option>
              </select>
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Dátum</label>
              <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)} required />
            </div>
          </div>

          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <button type="submit" style={{background: editingMatchId ? '#10b981' : 'var(--accent)'}}>
              {editingMatchId ? 'Módosítás Mentése' : 'Meccs Mentése'}
            </button>
            {editingMatchId && (
              <button type="button" onClick={handleCancelEdit} style={{background: '#ef4444'}}>
                Mégse
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Eddigi Eredmények</h3>
        <table>
          <thead>
            <tr>
              <th>Dátum</th>
              <th>Szakasz</th>
              <th>Hazai</th>
              <th>Eredmény</th>
              <th>Vendég</th>
              <th>Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(m => (
              <tr key={m.id}>
                <td>{m.match_date}</td>
                <td>{m.stage.toUpperCase()}</td>
                <td>{m.team_home}</td>
                <td><strong>{m.goals_home} - {m.goals_away}</strong></td>
                <td>{m.team_away}</td>
                <td>
                  <button onClick={() => handleEditClick(m)} style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#f59e0b', marginRight: '0.5rem'}}>Szerkesztés</button>
                  <button onClick={() => handleDeleteClick(m.id)} style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#ef4444'}}>Törlés</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
