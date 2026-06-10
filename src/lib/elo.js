// src/lib/elo.js
import { K_INIT, K_GROUP, K_KNOCKOUT, PRIOR_WEIGHT } from './config.js';

export function calculateInitElo(fifaPoints, avgFifa) {
  return 1500 + (fifaPoints - avgFifa) * K_INIT;
}

export function getExpectedScore(eloHome, eloAway) {
  const eHome = 1 / (1 + Math.pow(10, (eloAway - eloHome) / 400));
  return { eHome, eAway: 1 - eHome };
}

export function calculateGdm(goalsHome, goalsAway) {
  const gd = Math.abs(goalsHome - goalsAway);
  if (gd === 0) return 1.0;
  return Math.log(gd + 1) + 1;
}

export function calculateEloUpdate(eloHome, eloAway, goalsHome, goalsAway, stage, penalties, penaltyWinner) {
  const { eHome, eAway } = getExpectedScore(eloHome, eloAway);
  const gdm = calculateGdm(goalsHome, goalsAway);
  const k = stage === 'group' ? K_GROUP : K_KNOCKOUT;

  let sHome, sAway;
  if (penalties) {
    sHome = penaltyWinner === 'home' ? 0.75 : 0.25;
    sAway = penaltyWinner === 'away' ? 0.75 : 0.25;
  } else if (goalsHome > goalsAway) {
    sHome = 1;
    sAway = 0;
  } else if (goalsHome < goalsAway) {
    sHome = 0;
    sAway = 1;
  } else {
    sHome = 0.5;
    sAway = 0.5;
  }

  const deltaHome = k * gdm * (sHome - eHome);
  const deltaAway = k * gdm * (sAway - eAway);

  return { deltaHome, deltaAway };
}

export function getEffectiveElo(eloInit, currentElo, matchesPlayed) {
  return (eloInit * PRIOR_WEIGHT + currentElo * matchesPlayed) / (PRIOR_WEIGHT + matchesPlayed);
}
