"use client";
import { useEffect, useState } from 'react';
import './bracket.css';

export default function Playoffs() {
  const [bracket, setBracket] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchBracket = async () => {
    const res = await fetch('/api/bracket');
    const data = await res.json();
    setBracket(data);
  };

  const fetchTeams = async () => {
    const res = await fetch('/api/teams');
    const data = await res.json();
    setTeams(data);
  };

  useEffect(() => {
    Promise.all([fetchBracket(), fetchTeams()]).then(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!confirm('Biztosan generálod az ágrajzot a csoportkörök alapján? Ez törli a meglévő legjobb 32 meccseit és újakat hoz létre!')) return;
    setIsGenerating(true);
    await fetch('/api/bracket', { method: 'POST' });
    await fetchBracket();
    setIsGenerating(false);
  };

  const handleUpdateMatch = async (match, stage, slot, field, value) => {
    const updatedMatch = { ...match, [field]: value };
    
    // We only trigger API call when the value actually changes and onBlur happens (for scores), 
    // or onChange (for selects).
    
    const payload = {
      team_home: updatedMatch.team_home || 'TBD',
      team_away: updatedMatch.team_away || 'TBD',
      goals_home: updatedMatch.goals_home || 0,
      goals_away: updatedMatch.goals_away || 0,
      stage: stage,
      group_id: slot.toString(),
      match_date: updatedMatch.match_date || '2026-07-01'
    };

    if (match.id) {
      await fetch(`/api/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    
    window.dispatchEvent(new Event('simulationStarted'));
    await fetchBracket(); // Refresh bracket to show auto-advancing teams!
  };

  if (loading) return <div>Loading...</div>;

  const renderMatch = (stage, slotData) => {
    const m = slotData.match || { team_home: 'TBD', team_away: 'TBD', goals_home: 0, goals_away: 0 };
    return (
      <div className="match-slot" key={`${stage}-${slotData.slot}`}>
        <div className="match-card">
          <div className="match-row">
            <select 
              value={m.team_home} 
              onChange={(e) => handleUpdateMatch(m, stage, slotData.slot, 'team_home', e.target.value)}
            >
            <option value="TBD">TBD</option>
            {teams.map(t => <option key={t.team_name} value={t.team_name}>{t.team_name}</option>)}
          </select>
          <input 
            type="number" 
            defaultValue={m.goals_home} 
            onBlur={(e) => {
              if (parseInt(e.target.value) !== m.goals_home) {
                handleUpdateMatch(m, stage, slotData.slot, 'goals_home', parseInt(e.target.value) || 0)
              }
            }}
          />
        </div>
        <div className="match-row">
          <select 
            value={m.team_away} 
            onChange={(e) => handleUpdateMatch(m, stage, slotData.slot, 'team_away', e.target.value)}
          >
            <option value="TBD">TBD</option>
            {teams.map(t => <option key={t.team_name} value={t.team_name}>{t.team_name}</option>)}
          </select>
          <input 
            type="number" 
            defaultValue={m.goals_away} 
            onBlur={(e) => {
              if (parseInt(e.target.value) !== m.goals_away) {
                handleUpdateMatch(m, stage, slotData.slot, 'goals_away', parseInt(e.target.value) || 0)
              }
            }}
          />
          </div>
        </div>
      </div>
    );
  };

  const stages = [
    { key: 'r32', label: '1/16 Döntő' },
    { key: 'r16', label: 'Nyolcaddöntő' },
    { key: 'qf', label: 'Negyeddöntő' },
    { key: 'sf', label: 'Elődöntő' },
    { key: 'final', label: 'Döntő' }
  ];

  return (
    <main>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1>Play-off Ágrajz</h1>
        <button onClick={handleGenerate} disabled={isGenerating} style={{background: 'var(--accent)', cursor: 'pointer', padding: '0.8rem 1.5rem', borderRadius: '8px', color: 'black', fontWeight: 'bold', border: 'none'}}>
          {isGenerating ? 'Generálás folyamatban...' : 'Automatikus Ágrajz Generálás'}
        </button>
      </div>
      
      <p style={{color: 'var(--text-dim)', marginBottom: '1rem'}}>
        Itt láthatod a kieséses szakaszt. Ha beírod a gólokat, a győztes automatikusan továbbjut a következő körbe, a vesztes pedig 0% esélyt kap a végső győzelemre a Monte Carlo szimulációban! (Döntetlen esetén manuálisan kell felülírnod a következő kör résztvevőjét, vagy az API büntető logikáját használni).
      </p>

      <div className="bracket-container">
        {stages.map(st => (
          <div className="bracket-column" key={st.key}>
            <h3>{st.label}</h3>
            {bracket[st.key].map(slotData => renderMatch(st.key, slotData))}
          </div>
        ))}
      </div>
    </main>
  );
}
