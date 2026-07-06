"use client";
import { useState, useEffect } from 'react';

export default function Groups() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    fetch('/api/teams').then(r => r.json()).then(setTeams);
    fetch('/api/matches').then(r => r.json()).then(setMatches);
  }, []);

  const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  
  // Csoporttábla számítása a meccsek alapján
  const groupTables = {};
  groupLetters.forEach(g => { groupTables[g] = {}; });
  
  teams.forEach(t => {
    if (groupTables[t.group_id] !== undefined) {
      groupTables[t.group_id][t.team_name] = {
        name: t.team_name,
        pts: 0, played: 0, won: 0, drawn: 0, lost: 0,
        gf: 0, ga: 0, gd: 0,
        elo: t.elo || t.fifa_points,
        eliminated: t.eliminated
      };
    }
  });

  matches.forEach(m => {
    if (m.stage !== 'group') return;
    const g = groupTables[m.group_id];
    if (!g || !g[m.team_home] || !g[m.team_away]) return;

    const h = g[m.team_home];
    const a = g[m.team_away];
    h.played++; a.played++;
    h.gf += m.goals_home; h.ga += m.goals_away; h.gd = h.gf - h.ga;
    a.gf += m.goals_away; a.ga += m.goals_home; a.gd = a.gf - a.ga;

    if (m.goals_home > m.goals_away) {
      h.pts += 3; h.won++;  a.lost++;
    } else if (m.goals_away > m.goals_home) {
      a.pts += 3; a.won++;  h.lost++;
    } else {
      h.pts += 1; h.drawn++;
      a.pts += 1; a.drawn++;
    }
  });

  return (
    <div>
      <h2>Csoportállások</h2>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:'1.5rem'}}>
        {groupLetters.map(g => {
          const rows = Object.values(groupTables[g]).sort((a,b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
          });
          if (rows.length === 0) return null;
          return (
            <div key={g} className="card">
              <h3>{g} Csoport</h3>
              <table style={{fontSize:'0.85rem', width:'100%', tableLayout: 'fixed'}}>
                <colgroup>
                  <col style={{width:'35%'}} />
                  <col style={{width:'8%'}} />
                  <col style={{width:'8%'}} />
                  <col style={{width:'8%'}} />
                  <col style={{width:'8%'}} />
                  <col style={{width:'8%'}} />
                  <col style={{width:'8%'}} />
                  <col style={{width:'9%'}} />
                  <col style={{width:'8%'}} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{textAlign:'left', paddingLeft: '0.75rem'}}>Csapat</th>
                    <th style={{textAlign:'center'}}>M</th>
                    <th style={{textAlign:'center'}}>Gy</th>
                    <th style={{textAlign:'center'}}>D</th>
                    <th style={{textAlign:'center'}}>V</th>
                    <th style={{textAlign:'center'}}>GF</th>
                    <th style={{textAlign:'center'}}>GA</th>
                    <th style={{textAlign:'center'}}>GK</th>
                    <th style={{textAlign:'center'}}>Pt</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t, idx) => (
                    <tr key={t.name} style={{
                      opacity: t.eliminated ? 0.35 : 1,
                      background: 'transparent',
                      borderLeft: idx < 2 ? '3px solid #3b82f6' : '3px solid transparent'
                    }}>
                      <td style={{
                        textAlign: 'left', 
                        paddingLeft: '0.75rem', 
                        minWidth: '120px',
                        fontStyle: t.eliminated ? 'italic' : 'normal'
                      }}>
                        <strong>{t.name}</strong>
                      </td>
                      <td style={{textAlign:'center', padding: '0.5rem 0.4rem', fontSize: '0.85rem'}}>{t.played}</td>
                      <td style={{textAlign:'center', padding: '0.5rem 0.4rem', fontSize: '0.85rem'}}>{t.won}</td>
                      <td style={{textAlign:'center', padding: '0.5rem 0.4rem', fontSize: '0.85rem'}}>{t.drawn}</td>
                      <td style={{textAlign:'center', padding: '0.5rem 0.4rem', fontSize: '0.85rem'}}>{t.lost}</td>
                      <td style={{textAlign:'center', padding: '0.5rem 0.4rem', fontSize: '0.85rem'}}>{t.gf}</td>
                      <td style={{textAlign:'center', padding: '0.5rem 0.4rem', fontSize: '0.85rem'}}>{t.ga}</td>
                      <td style={{textAlign:'center', padding: '0.5rem 0.4rem', fontSize: '0.85rem'}}>{t.gd > 0 ? '+' : ''}{t.gd}</td>
                      <td style={{textAlign:'center', padding: '0.5rem 0.4rem', fontSize: '0.85rem', fontWeight:'bold'}}>{t.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
