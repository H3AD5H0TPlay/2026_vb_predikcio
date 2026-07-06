// src/lib/dixonColes.js
import { RHO } from './config.js';

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

export function poisson(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function tau(goalsHome, goalsAway, lambdaHome, lambdaAway) {
  if (goalsHome === 0 && goalsAway === 0) {
    return 1 - lambdaHome * lambdaAway * RHO;
  }
  if (goalsHome === 1 && goalsAway === 0) {
    return 1 + lambdaAway * RHO;
  }
  if (goalsHome === 0 && goalsAway === 1) {
    return 1 + lambdaHome * RHO;
  }
  if (goalsHome === 1 && goalsAway === 1) {
    return 1 - RHO;
  }
  return 1.0;
}

export function getMatchProbabilitiesDC(alphaHome, betaHome, alphaAway, betaAway, mu, maxGoals = 8) {
  const lambdaHome = alphaHome * betaAway * mu;
  const lambdaAway = alphaAway * betaHome * mu;

  let pHomeWin = 0;
  let pDraw = 0;
  let pAwayWin = 0;

  for (let i = 0; i <= maxGoals; i++) {
    for (let j = 0; j <= maxGoals; j++) {
      const pPoissonHome = poisson(i, lambdaHome);
      const pPoissonAway = poisson(j, lambdaAway);
      const pCorr = pPoissonHome * pPoissonAway * tau(i, j, lambdaHome, lambdaAway);

      if (i > j) {
        pHomeWin += pCorr;
      } else if (i === j) {
        pDraw += pCorr;
      } else {
        pAwayWin += pCorr;
      }
    }
  }

  const total = pHomeWin + pDraw + pAwayWin;
  return {
    pHomeWin: pHomeWin / total,
    pDraw: pDraw / total,
    pAwayWin: pAwayWin / total,
  };
}

export function optimizeDixonColes(matches, teams) {
  const params = {};
  teams.forEach(team => {
    params[team] = { alpha: 1.0, beta: 1.0 };
  });

  if (matches.length === 0) return { params, mu: 1.0 };

  let totalGoals = 0;
  matches.forEach(m => totalGoals += m.goals_home + m.goals_away);
  let mu = totalGoals / (matches.length * 2);
  if (mu === 0) mu = 1.0;

  const lr = 0.01;
  const iterations = 100;

  for (let iter = 0; iter < iterations; iter++) {
    const grads = {};
    teams.forEach(team => {
      grads[team] = { dAlpha: 0, dBeta: 0 };
    });
    
    matches.forEach(m => {
      const aH = params[m.team_home]?.alpha ?? 1.0;
      const bH = params[m.team_home]?.beta ?? 1.0;
      const aA = params[m.team_away]?.alpha ?? 1.0;
      const bA = params[m.team_away]?.beta ?? 1.0;

      if (!params[m.team_home] || !params[m.team_away]) return;

      const lambdaH = aH * bA * mu;
      const lambdaA = aA * bH * mu;

      const tauVal = tau(m.goals_home, m.goals_away, lambdaH, lambdaA);
      const safeTau = tauVal === 0 ? 0.001 : tauVal;

      // Poisson log-likelihood gradient
      const dLL_dLambdaH = (m.goals_home / (lambdaH || 0.001)) - 1;
      const dLL_dLambdaA = (m.goals_away / (lambdaA || 0.001)) - 1;

      // τ korrekció gradient (alacsony gólszámú meccsekre)
      let dTau_dLambdaH = 0;
      let dTau_dLambdaA = 0;
      if (m.goals_home === 0 && m.goals_away === 0) {
        dTau_dLambdaH = -lambdaA * RHO / safeTau;
        dTau_dLambdaA = -lambdaH * RHO / safeTau;
      } else if (m.goals_home === 1 && m.goals_away === 0) {
        dTau_dLambdaA = RHO / safeTau;
      } else if (m.goals_home === 0 && m.goals_away === 1) {
        dTau_dLambdaH = RHO / safeTau;
      }

      const totalGradH = dLL_dLambdaH + dTau_dLambdaH;
      const totalGradA = dLL_dLambdaA + dTau_dLambdaA;

      grads[m.team_home].dAlpha += totalGradH * (bA * mu);
      grads[m.team_away].dBeta  += totalGradH * (aH * mu);
      grads[m.team_away].dAlpha += totalGradA * (bH * mu);
      grads[m.team_home].dBeta  += totalGradA * (aA * mu);
    });

    teams.forEach(team => {
      params[team].alpha += lr * grads[team].dAlpha;
      params[team].beta += lr * grads[team].dBeta;
      params[team].alpha = Math.max(0.1, Math.min(params[team].alpha, 3.0));
      params[team].beta = Math.max(0.1, Math.min(params[team].beta, 3.0));
    });
  }

  let sumAlpha = 0;
  teams.forEach(t => sumAlpha += params[t].alpha);
  const avgAlpha = sumAlpha / teams.length;
  
  teams.forEach(t => {
    params[t].alpha /= avgAlpha;
  });

  return { params, mu };
}
