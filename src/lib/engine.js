// src/lib/engine.js
import { getDb } from '../db/index.js';
import { calculateInitElo, calculateEloUpdate, getEffectiveElo } from './elo.js';
import { optimizeDixonColes } from './dixonColes.js';
import { runMonteCarloBackground } from './monteCarlo.js';

export function addMatchAndRunEngine(matchData) {
  const db = getDb();
  
  const insertMatch = db.prepare(`
    INSERT INTO matches 
    (team_home, team_away, goals_home, goals_away, stage, group_id, match_date, yellow_home, yellow_away, red_home, red_away, aet, penalties, penalty_winner)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertMatch.run(
    matchData.team_home, matchData.team_away, matchData.goals_home, matchData.goals_away,
    matchData.stage, matchData.group_id || null, matchData.match_date,
    matchData.yellow_home || 0, matchData.yellow_away || 0,
    matchData.red_home || 0, matchData.red_away || 0,
    matchData.aet ? 1 : 0, matchData.penalties ? 1 : 0, matchData.penalty_winner || null
  );

  triggerEngine();
}

export function triggerEngine() {
  const db = getDb();
  const matches = db.prepare('SELECT * FROM matches ORDER BY id ASC').all();
  const fifaRankings = db.prepare('SELECT * FROM fifa_rankings').all();

  if (fifaRankings.length === 0) return;

  const avgFifa = fifaRankings.reduce((sum, f) => sum + f.fifa_points, 0) / fifaRankings.length;
  const teamStates = {};
  const teams = [];

  fifaRankings.forEach(f => {
    teams.push(f.team_name);
    const initElo = calculateInitElo(f.fifa_points, avgFifa);
    teamStates[f.team_name] = {
      name: f.team_name,
      initElo,
      elo: initElo, // current meccsalapú
      effectiveElo: initElo,
      matches_played: 0,
      eliminated: 0,
      group_id: f.group_id
    };
  });

  // 1. Elo replay
  matches.forEach(m => {
    const tHome = teamStates[m.team_home];
    const tAway = teamStates[m.team_away];
    if (!tHome || !tAway) return;

    const { deltaHome, deltaAway } = calculateEloUpdate(
      tHome.effectiveElo, tAway.effectiveElo, 
      m.goals_home, m.goals_away, 
      m.stage, m.penalties, m.penalty_winner
    );

    tHome.elo += deltaHome;
    tAway.elo += deltaAway;
    tHome.matches_played++;
    tAway.matches_played++;
    
    tHome.effectiveElo = getEffectiveElo(tHome.initElo, tHome.elo, tHome.matches_played);
    tAway.effectiveElo = getEffectiveElo(tAway.initElo, tAway.elo, tAway.matches_played);
  });

  // 2. Dixon-Coles ML optimization
  const { params: dcParams, mu } = optimizeDixonColes(matches, teams);
  
  teams.forEach(t => {
    teamStates[t].attack_strength = dcParams[t].alpha;
    teamStates[t].defense_strength = dcParams[t].beta;
  });

  // 3. Setup current group standings & remaining matches for Monte Carlo
  // We need to parse remaining schedule.
  // For the sake of the generic model, we will define remaining schedule by checking 
  // which round-robin matches are missing.
  
  const groups = {};
  fifaRankings.forEach(f => {
    if (!groups[f.group_id]) groups[f.group_id] = {};
    groups[f.group_id][f.team_name] = { name: f.team_name, played: 0, pts: 0, gf: 0, ga: 0, gd: 0 };
  });

  const playedSet = new Set();
  matches.forEach(m => {
    if (m.stage === 'group' && groups[m.group_id]) {
      const g = groups[m.group_id];
      if (g[m.team_home] && g[m.team_away]) {
        playedSet.add(`${m.team_home}-${m.team_away}`);
        playedSet.add(`${m.team_away}-${m.team_home}`);
        
        g[m.team_home].played++;
        g[m.team_away].played++;
        g[m.team_home].gf += m.goals_home;
        g[m.team_home].ga += m.goals_away;
        g[m.team_home].gd += (m.goals_home - m.goals_away);
        
        g[m.team_away].gf += m.goals_away;
        g[m.team_away].ga += m.goals_home;
        g[m.team_away].gd += (m.goals_away - m.goals_home);

        if (m.goals_home > m.goals_away) {
          g[m.team_home].pts += 3;
        } else if (m.goals_home < m.goals_away) {
          g[m.team_away].pts += 3;
        } else {
          g[m.team_home].pts += 1;
          g[m.team_away].pts += 1;
        }
      }
    }
  });

  const remainingMatches = [];
  Object.keys(groups).forEach(gId => {
    const tms = Object.keys(groups[gId]);
    for (let i = 0; i < tms.length; i++) {
      for (let j = i + 1; j < tms.length; j++) {
        if (!playedSet.has(`${tms[i]}-${tms[j]}`)) {
          remainingMatches.push({
            stage: 'group',
            group_id: gId,
            team_home: tms[i],
            team_away: tms[j]
          });
        }
      }
    }
  });

  // 4. Update DB Team State
  const updateStmt = db.prepare(`
    INSERT INTO team_state (team_name, elo, attack_strength, defense_strength, matches_played)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(team_name) DO UPDATE SET
    elo = excluded.elo,
    attack_strength = excluded.attack_strength,
    defense_strength = excluded.defense_strength,
    matches_played = excluded.matches_played
  `);

  db.exec('BEGIN');
  try {
    teams.forEach(t => {
      const state = teamStates[t];
      updateStmt.run(t, state.effectiveElo, state.attack_strength, state.defense_strength, state.matches_played);
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error("Hiba az Elo frissítéskor:", e);
  }

  // 5. Fire Monte Carlo
  runMonteCarloBackground(teams, groups, remainingMatches, teamStates, mu);
}
