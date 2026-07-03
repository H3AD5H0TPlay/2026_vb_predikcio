// src/lib/monteCarlo.js
import { getExpectedScore } from './elo.js';
import { getMatchProbabilitiesDC } from './dixonColes.js';
import { DC_WARMUP_MATCHES, N_SIMULATIONS } from './config.js';
import { getDb } from '../db/index.js';
import fs from 'fs';
import path from 'path';

let isSimulationRunning = false;
let pendingSimulationArgs = null;

const statusFile = path.resolve(process.cwd(), '.sim_status');

export function getSimulationStatus() {
  try {
    return fs.existsSync(statusFile);
  } catch (e) {
    return false;
  }
}

export function getBlendedProbabilities(homeTeam, awayTeam, teamStates, mu) {
  const stateH = teamStates[homeTeam];
  const stateA = teamStates[awayTeam];

  const { eHome, eAway } = getExpectedScore(stateH.elo, stateA.elo);
  const pEloHome = eHome * 0.75;
  const pEloAway = eAway * 0.75;
  const pEloDraw = 0.25;

  const dcProbs = getMatchProbabilitiesDC(
    stateH.attack_strength, stateH.defense_strength,
    stateA.attack_strength, stateA.defense_strength,
    mu
  );

  const maxMatches = Math.max(stateH.matches_played, stateA.matches_played);
  const wDc = Math.min(maxMatches / DC_WARMUP_MATCHES, 1.0);
  const wElo = 1.0 - wDc;

  return {
    pHomeWin: wElo * pEloHome + wDc * dcProbs.pHomeWin,
    pDraw: wElo * pEloDraw + wDc * dcProbs.pDraw,
    pAwayWin: wElo * pEloAway + wDc * dcProbs.pAwayWin
  };
}

function simulateMatch(probs) {
  const rand = Math.random();
  if (rand < probs.pHomeWin) return 'home';
  if (rand < probs.pHomeWin + probs.pDraw) return 'draw';
  return 'away';
}

function simulateKnockoutMatch(probs, eloHome, eloAway, teamH, teamA, teamStates) {
  if (teamStates[teamH]?.eliminated) return 'away';
  if (teamStates[teamA]?.eliminated) return 'home';

  const pHomeAdj = probs.pHomeWin + probs.pDraw * (probs.pHomeWin / (probs.pHomeWin + probs.pAwayWin));
  const rand = Math.random();
  if (rand < pHomeAdj) return 'home';
  return 'away';
}

function runSingleSimulation(teams, initialGroupTables, remainingMatches, teamStates, mu, currentKnockouts) {
  const groups = {};
  for (const g in initialGroupTables) {
    groups[g] = {};
    for (const t in initialGroupTables[g]) {
      groups[g][t] = { ...initialGroupTables[g][t] };
    }
  }

  for (const m of remainingMatches) {
    if (m.stage === 'group') {
      const probs = getBlendedProbabilities(m.team_home, m.team_away, teamStates, mu);
      const res = simulateMatch(probs);
      const g = m.group_id;
      
      groups[g][m.team_home].played++;
      groups[g][m.team_away].played++;

      const drawGoal = (lambda) => {
        let L = Math.exp(-lambda), k = 0, p = 1;
        do { k++; p *= Math.random(); } while (p > L);
        return k - 1;
      };

      const goalsHome = drawGoal(res === 'home' ? 2.0 : res === 'draw' ? 1.0 : 0.5);
      const goalsAway = drawGoal(res === 'away' ? 2.0 : res === 'draw' ? 1.0 : 0.5);

      groups[g][m.team_home].gf += goalsHome;
      groups[g][m.team_home].ga += goalsAway;
      groups[g][m.team_home].gd = groups[g][m.team_home].gf - groups[g][m.team_home].ga;

      groups[g][m.team_away].gf += goalsAway;
      groups[g][m.team_away].ga += goalsHome;
      groups[g][m.team_away].gd = groups[g][m.team_away].gf - groups[g][m.team_away].ga;

      if (res === 'home') {
        groups[g][m.team_home].pts += 3;
      } else if (res === 'away') {
        groups[g][m.team_away].pts += 3;
      } else {
        groups[g][m.team_home].pts += 1;
        groups[g][m.team_away].pts += 1;
      }
    }
  }

  const advanced = [];
  const thirdPlaces = [];

  for (const g in groups) {
    const teamArr = Object.values(groups[g]).sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      if (a.gd !== b.gd) return b.gd - a.gd;
      if (a.gf !== b.gf) return b.gf - a.gf;
      return Math.random() - 0.5;
    });

    if (teamArr.length > 0) advanced.push({ name: teamArr[0].name, rankInGroup: 1, pts: teamArr[0].pts, gd: teamArr[0].gd, gf: teamArr[0].gf });
    if (teamArr.length > 1) advanced.push({ name: teamArr[1].name, rankInGroup: 2, pts: teamArr[1].pts, gd: teamArr[1].gd, gf: teamArr[1].gf });
    if (teamArr.length > 2) thirdPlaces.push({ name: teamArr[2].name, rankInGroup: 3, pts: teamArr[2].pts, gd: teamArr[2].gd, gf: teamArr[2].gf });
  }

  thirdPlaces.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    if (a.gf !== b.gf) return b.gf - a.gf;
    return Math.random() - 0.5;
  });

  const bestThirds = thirdPlaces.slice(0, 8);
  const all32 = [...advanced, ...bestThirds];

  all32.sort((a, b) => {
    if (a.rankInGroup !== b.rankInGroup) return a.rankInGroup - b.rankInGroup;
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  const simulatedBracket = {
    'r32': Array.from({length: 16}, (_, i) => ({ team_home: all32[i]?.name, team_away: all32[31-i]?.name })),
    'r16': Array.from({length: 8}, () => ({ team_home: null, team_away: null })),
    'qf': Array.from({length: 4}, () => ({ team_home: null, team_away: null })),
    'sf': Array.from({length: 2}, () => ({ team_home: null, team_away: null })),
    'final': [{ team_home: null, team_away: null }]
  };

  const stages = ['r32', 'r16', 'qf', 'sf', 'final'];
  
  if (currentKnockouts) {
    stages.forEach(stage => {
      const stageMatches = currentKnockouts.filter(m => m.stage === stage);
      stageMatches.forEach(dbMatch => {
        const idx = parseInt(dbMatch.group_id) - 1;
        if (simulatedBracket[stage][idx]) {
          if (dbMatch.team_home !== 'TBD') simulatedBracket[stage][idx].team_home = dbMatch.team_home;
          if (dbMatch.team_away !== 'TBD') simulatedBracket[stage][idx].team_away = dbMatch.team_away;
        }
      });
    });
  }

  const semifinalists = [];
  const finalists = [];
  let champion = null;

  stages.forEach((stage, sIdx) => {
    const nextStage = stages[sIdx + 1];
    
    simulatedBracket[stage].forEach((m, idx) => {
      const t1 = m.team_home;
      const t2 = m.team_away;
      
      let winner = null;
      if (!t1 && !t2) winner = null;
      else if (!t2) winner = t1;
      else if (!t1) winner = t2;
      else {
        const probs = getBlendedProbabilities(t1, t2, teamStates, mu);
        winner = simulateKnockoutMatch(probs, teamStates[t1].elo, teamStates[t2].elo, t1, t2, teamStates) === 'home' ? t1 : t2;
      }
      
      if (winner) {
        if (stage === 'qf') semifinalists.push(winner);
        if (stage === 'sf') finalists.push(winner);
        if (stage === 'final') champion = winner;
        
        if (nextStage) {
          const nextSlot = Math.floor(idx / 2);
          const isHome = idx % 2 === 0;
          if (isHome) {
            if (!simulatedBracket[nextStage][nextSlot].team_home) {
              simulatedBracket[nextStage][nextSlot].team_home = winner;
            }
          } else {
            if (!simulatedBracket[nextStage][nextSlot].team_away) {
              simulatedBracket[nextStage][nextSlot].team_away = winner;
            }
          }
        }
      }
    });
  });

  return { champion, finalists, semifinalists, advanced: all32.map(t => t.name) };
}

export function runMonteCarloBackground(teams, initialGroupTables, remainingMatches, teamStates, mu, currentKnockouts) {
  if (isSimulationRunning) {
    pendingSimulationArgs = { teams, initialGroupTables, remainingMatches, teamStates, mu, currentKnockouts };
    return;
  }
  isSimulationRunning = true;
  
  try {
    fs.writeFileSync(statusFile, '1');
  } catch(e) {}

  startProcessing(teams, initialGroupTables, remainingMatches, teamStates, mu, currentKnockouts);
}

function startProcessing(teams, initialGroupTables, remainingMatches, teamStates, mu, currentKnockouts) {
  let runsCompleted = 0;
  const BATCH_SIZE = 250;
  const results = { champions: {}, finalists: {}, semifinalists: {}, groupAdvance: {} };
  
  teams.forEach(t => {
    results.champions[t] = 0;
    results.finalists[t] = 0;
    results.semifinalists[t] = 0;
    results.groupAdvance[t] = 0;
  });

  function processBatch() {
    if (pendingSimulationArgs) {
      const args = pendingSimulationArgs;
      pendingSimulationArgs = null;
      startProcessing(args.teams, args.initialGroupTables, args.remainingMatches, args.teamStates, args.mu, args.currentKnockouts);
      return;
    }

    for (let i = 0; i < BATCH_SIZE && runsCompleted < N_SIMULATIONS; i++) {
       const sim = runSingleSimulation(teams, initialGroupTables, remainingMatches, teamStates, mu, currentKnockouts);
       if (sim.champion) results.champions[sim.champion]++;
       sim.finalists.forEach(t => results.finalists[t]++);
       sim.semifinalists.forEach(t => results.semifinalists[t]++);
       sim.advanced.forEach(t => results.groupAdvance[t]++);
       runsCompleted++;
    }

    if (runsCompleted < N_SIMULATIONS) {
       setTimeout(processBatch, 0); 
    } else {
       finalizeResults(results, N_SIMULATIONS);
    }
  }

  processBatch();
}

function finalizeResults(results, n) {
  const db = getDb();
  
  const stmt = db.prepare(`
    UPDATE team_state SET 
      champion_prob = ?, 
      finalist_prob = ?, 
      sf_prob = ?, 
      group_prob = ? 
    WHERE team_name = ?
  `);

  db.exec('BEGIN');
  try {
    for (const team in results.champions) {
      stmt.run(
        results.champions[team] / n,
        results.finalists[team] / n,
        results.semifinalists[team] / n,
        results.groupAdvance[team] / n,
        team
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    console.error("Hiba a Monte Carlo mentéskor:", e);
  }
  isSimulationRunning = false;
  
  try {
    if (fs.existsSync(statusFile)) {
      fs.unlinkSync(statusFile);
    }
  } catch(e) {}

  console.log("Monte Carlo simulation finished.");

  if (pendingSimulationArgs) {
    const args = pendingSimulationArgs;
    pendingSimulationArgs = null;
    runMonteCarloBackground(args.teams, args.initialGroupTables, args.remainingMatches, args.teamStates, args.mu, args.currentKnockouts);
  }
}
