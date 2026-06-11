// src/lib/monteCarlo.js
import { getExpectedScore } from './elo.js';
import { getMatchProbabilitiesDC } from './dixonColes.js';
import { DC_WARMUP_MATCHES, N_SIMULATIONS } from './config.js';
import { getDb } from '../db/index.js';

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

function simulateKnockoutMatch(probs, eloHome, eloAway) {
  const pHomeAdj = probs.pHomeWin + probs.pDraw * (probs.pHomeWin / (probs.pHomeWin + probs.pAwayWin));
  const rand = Math.random();
  if (rand < pHomeAdj) return 'home';
  return 'away';
}

function runSingleSimulation(teams, initialGroupTables, remainingMatches, teamStates, mu) {
  // Deep clone group tables for this run
  const groups = {};
  for (const g in initialGroupTables) {
    groups[g] = {};
    for (const t in initialGroupTables[g]) {
      groups[g][t] = { ...initialGroupTables[g][t] };
    }
  }

  // Simulate remaining group matches
  for (const m of remainingMatches) {
    if (m.stage === 'group') {
      const probs = getBlendedProbabilities(m.team_home, m.team_away, teamStates, mu);
      const res = simulateMatch(probs);
      const g = m.group_id;
      
      groups[g][m.team_home].played++;
      groups[g][m.team_away].played++;

      // We approximate goals for GD/GF in simulation using expected means if we want, 
      // but to be fast we can just use fixed generic scores or purely points.
      // For tiebreakers, we'll assign random tiebreaker values if points are equal,
      // because simulating exact Poisson goals here 100k times takes slightly longer, 
      // but let's do a fast poisson draw.
      
      // Fast goal draw approximation (mean = 1.5)
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

  // Sort groups and find advancing teams
  const advanced = [];
  const thirdPlaces = [];

  for (const g in groups) {
    const teamArr = Object.values(groups[g]).sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      if (a.gd !== b.gd) return b.gd - a.gd;
      if (a.gf !== b.gf) return b.gf - a.gf;
      return Math.random() - 0.5;
    });

    if (teamArr.length > 0) advanced.push(teamArr[0].name);
    if (teamArr.length > 1) advanced.push(teamArr[1].name);
    if (teamArr.length > 2) thirdPlaces.push(teamArr[2]);
  }

  // Top 8 third places
  thirdPlaces.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    if (a.gf !== b.gf) return b.gf - a.gf;
    return Math.random() - 0.5;
  });

  for (let i = 0; i < 8 && i < thirdPlaces.length; i++) {
    advanced.push(thirdPlaces[i].name);
  }

  // We have 32 teams. Knockout bracket.
  // We'll pair them randomly for simulation simplicity unless specific 2026 bracket mapping is provided.
  let currentRound = advanced;
  const semifinalists = [];
  const finalists = [];
  let champion = null;

  while (currentRound.length > 1) {
    const nextRound = [];
    // shuffle for generic bracket if not strictly mapped, but let's just pair 0-1, 2-3...
    for (let i = 0; i < currentRound.length; i += 2) {
      if (i + 1 >= currentRound.length) {
        nextRound.push(currentRound[i]);
        break;
      }
      const t1 = currentRound[i];
      const t2 = currentRound[i+1];
      const probs = getBlendedProbabilities(t1, t2, teamStates, mu);
      const winner = simulateKnockoutMatch(probs, teamStates[t1].elo, teamStates[t2].elo) === 'home' ? t1 : t2;
      nextRound.push(winner);
    }
    
    if (nextRound.length === 4) {
      semifinalists.push(...nextRound);
    } else if (nextRound.length === 2) {
      finalists.push(...nextRound);
    } else if (nextRound.length === 1) {
      champion = nextRound[0];
    }
    
    currentRound = nextRound;
  }

  return { champion, finalists, semifinalists, advanced };
}

let isSimulationRunning = false;
let pendingSimulationArgs = null;

export function getSimulationStatus() {
  return isSimulationRunning || pendingSimulationArgs !== null;
}

export function runMonteCarloBackground(teams, initialGroupTables, remainingMatches, teamStates, mu) {
  if (isSimulationRunning) {
    pendingSimulationArgs = { teams, initialGroupTables, remainingMatches, teamStates, mu };
    return;
  }
  isSimulationRunning = true;
  startProcessing(teams, initialGroupTables, remainingMatches, teamStates, mu);
}

function startProcessing(teams, initialGroupTables, remainingMatches, teamStates, mu) {
  let runsCompleted = 0;
  const BATCH_SIZE = 5000;
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
      startProcessing(args.teams, args.initialGroupTables, args.remainingMatches, args.teamStates, args.mu);
      return;
    }

    for (let i = 0; i < BATCH_SIZE && runsCompleted < N_SIMULATIONS; i++) {
       const sim = runSingleSimulation(teams, initialGroupTables, remainingMatches, teamStates, mu);
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
  console.log("Monte Carlo simulation finished.");

  if (pendingSimulationArgs) {
    const args = pendingSimulationArgs;
    pendingSimulationArgs = null;
    runMonteCarloBackground(args.teams, args.initialGroupTables, args.remainingMatches, args.teamStates, args.mu);
  }
}
