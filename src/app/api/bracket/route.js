import { NextResponse } from 'next/server';
import { getDb } from '@/db/index';

export async function GET() {
  const db = getDb();
  const knockoutMatches = db.prepare(`
    SELECT * FROM matches 
    WHERE stage IN ('r32', 'r16', 'qf', 'sf', 'final')
    ORDER BY stage, CAST(group_id AS INTEGER)
  `).all();

  const bracket = {
    r32: Array.from({ length: 16 }, (_, i) => ({ slot: i + 1, match: null })),
    r16: Array.from({ length: 8 }, (_, i) => ({ slot: i + 1, match: null })),
    qf: Array.from({ length: 4 }, (_, i) => ({ slot: i + 1, match: null })),
    sf: Array.from({ length: 2 }, (_, i) => ({ slot: i + 1, match: null })),
    final: [{ slot: 1, match: null }]
  };

  knockoutMatches.forEach(m => {
    const slotIndex = parseInt(m.group_id, 10) - 1;
    if (bracket[m.stage] && bracket[m.stage][slotIndex] !== undefined) {
      bracket[m.stage][slotIndex].match = m;
    }
  });

  return NextResponse.json(bracket);
}

export async function POST() {
  const db = getDb();
  const groupMatches = db.prepare("SELECT * FROM matches WHERE stage = 'group'").all();
  
  const groups = {};
  const teams = db.prepare("SELECT team_name, group_id FROM fifa_rankings").all();
  teams.forEach(t => {
    if (!groups[t.group_id]) groups[t.group_id] = {};
    groups[t.group_id][t.team_name] = { name: t.team_name, pts: 0, gd: 0, gf: 0, ga: 0, played: 0 };
  });

  groupMatches.forEach(m => {
    const g = m.group_id;
    if (!groups[g] || !groups[g][m.team_home] || !groups[g][m.team_away]) return;
    
    groups[g][m.team_home].played++;
    groups[g][m.team_away].played++;
    groups[g][m.team_home].gf += m.goals_home;
    groups[g][m.team_home].ga += m.goals_away;
    groups[g][m.team_home].gd = groups[g][m.team_home].gf - groups[g][m.team_home].ga;

    groups[g][m.team_away].gf += m.goals_away;
    groups[g][m.team_away].ga += m.goals_home;
    groups[g][m.team_away].gd = groups[g][m.team_away].gf - groups[g][m.team_away].ga;

    if (m.goals_home > m.goals_away) {
      groups[g][m.team_home].pts += 3;
    } else if (m.goals_home < m.goals_away) {
      groups[g][m.team_away].pts += 3;
    } else {
      groups[g][m.team_home].pts += 1;
      groups[g][m.team_away].pts += 1;
    }
  });

  const advanced = [];
  const thirdPlaces = [];

  for (const g in groups) {
    const teamArr = Object.values(groups[g]).sort((a, b) => {
      if (a.pts !== b.pts) return b.pts - a.pts;
      if (a.gd !== b.gd) return b.gd - a.gd;
      if (a.gf !== b.gf) return b.gf - a.gf;
      return 0;
    });

    if (teamArr.length > 0) advanced.push({ ...teamArr[0], rankInGroup: 1, group: g });
    if (teamArr.length > 1) advanced.push({ ...teamArr[1], rankInGroup: 2, group: g });
    if (teamArr.length > 2) thirdPlaces.push({ ...teamArr[2], rankInGroup: 3, group: g });
  }

  thirdPlaces.sort((a, b) => {
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    if (a.gf !== b.gf) return b.gf - a.gf;
    return 0;
  });

  const bestThirds = thirdPlaces.slice(0, 8);
  const all32 = [...advanced, ...bestThirds];

  all32.sort((a, b) => {
    if (a.rankInGroup !== b.rankInGroup) return a.rankInGroup - b.rankInGroup;
    if (a.pts !== b.pts) return b.pts - a.pts;
    if (a.gd !== b.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });

  const pairings = [];
  for(let i=0; i<16; i++) {
    pairings.push({
      home: all32[i] ? all32[i].name : 'TBD',
      away: all32[31 - i] ? all32[31 - i].name : 'TBD'
    });
  }

  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM matches WHERE stage = 'r32'").run();
    const stmt = db.prepare(`
      INSERT INTO matches (team_home, team_away, goals_home, goals_away, stage, group_id, match_date)
      VALUES (?, ?, 0, 0, 'r32', ?, '2026-06-28')
    `);
    pairings.forEach((p, idx) => {
      stmt.run(p.home, p.away, (idx + 1).toString());
    });
    db.exec("COMMIT");
    return NextResponse.json({ success: true });
  } catch(e) {
    db.exec("ROLLBACK");
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
