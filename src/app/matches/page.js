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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tHomeObj = teams.find(t => t.team_name === teamHome);
    
    await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_home: teamHome,
        team_away: teamAway,
        goals_home: parseInt(goalsHome),
        goals_away: parseInt(goalsAway),
        stage: stage,
        group_id: stage === 'group' ? tHomeObj?.group_id : null,
        match_date: matchDate,
        aet: false,
        penalties: false
      })
    });
    fetchMatches();
  };

  return (
    <div>
      <div className="card">
        <h2>Mérkőzés Rögzítése</h2>
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

          <button type="submit">Meccs Mentése</button>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
