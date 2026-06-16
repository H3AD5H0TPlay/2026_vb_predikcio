"use client";
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  useEffect(() => {
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        setTeams(data);
        setLoading(false);
      });
  }, []);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
      key = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortedTeams = () => {
    const teamsWithRank = teams.map((t, idx) => ({ ...t, originalRank: idx + 1 }));

    if (!sortConfig.key || !sortConfig.direction) {
      return teamsWithRank;
    }

    return [...teamsWithRank].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];

      if (sortConfig.key === 'team_name' || sortConfig.key === 'group_id') {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      } else {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedTeams = getSortedTeams();

  const renderSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
    }
    return '';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <main>
      <h1>VB 2026 Bajnoki Esélyek</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('originalRank')} style={{cursor: 'pointer'}}>Hely{renderSortIndicator('originalRank')}</th>
              <th onClick={() => handleSort('team_name')} style={{cursor: 'pointer'}}>Csapat{renderSortIndicator('team_name')}</th>
              <th onClick={() => handleSort('group_id')} style={{cursor: 'pointer'}}>Csoport{renderSortIndicator('group_id')}</th>
              <th onClick={() => handleSort('champion_prob')} style={{cursor: 'pointer'}}>Bajnok %{renderSortIndicator('champion_prob')}</th>
              <th onClick={() => handleSort('finalist_prob')} style={{cursor: 'pointer'}}>Döntős %{renderSortIndicator('finalist_prob')}</th>
              <th onClick={() => handleSort('sf_prob')} style={{cursor: 'pointer'}}>Elődöntős %{renderSortIndicator('sf_prob')}</th>
              <th onClick={() => handleSort('group_prob')} style={{cursor: 'pointer'}}>Továbbjut %{renderSortIndicator('group_prob')}</th>
              <th onClick={() => handleSort('elo')} style={{cursor: 'pointer'}}>Aktuális Elo{renderSortIndicator('elo')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((t) => (
              <tr key={t.team_name}>
                <td>{t.originalRank}.</td>
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
