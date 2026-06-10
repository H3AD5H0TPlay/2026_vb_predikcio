"use client";
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        setTeams(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <main>
      <h1>VB 2026 Bajnoki Esélyek</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Hely</th>
              <th>Csapat</th>
              <th>Csoport</th>
              <th>Bajnok %</th>
              <th>Döntős %</th>
              <th>Elődöntős %</th>
              <th>Továbbjut %</th>
              <th>Aktuális Elo</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t, idx) => (
              <tr key={t.team_name}>
                <td>{idx + 1}.</td>
                <td><strong>{t.team_name}</strong></td>
                <td>{t.group_id}</td>
                <td style={{color: 'var(--accent)'}}>{(t.champion_prob * 100).toFixed(1)}%</td>
                <td>{(t.finalist_prob * 100).toFixed(1)}%</td>
                <td>{(t.sf_prob * 100).toFixed(1)}%</td>
                <td>{(t.group_prob * 100).toFixed(1)}%</td>
                <td>{t.elo ? t.elo.toFixed(1) : t.fifa_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
