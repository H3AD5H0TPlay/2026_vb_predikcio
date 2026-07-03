import { NextResponse } from 'next/server';
import { getDb } from '@/db/index';
import { triggerEngine } from '@/lib/engine';

export async function GET() {
  const db = getDb();
  const teams = db.prepare(`
    SELECT f.*, t.elo, t.matches_played, t.champion_prob, t.finalist_prob, t.sf_prob, t.group_prob, t.eliminated 
    FROM fifa_rankings f 
    LEFT JOIN team_state t ON f.team_name = t.team_name
    ORDER BY t.champion_prob DESC, f.fifa_points DESC
  `).all();
  return NextResponse.json(teams);
}

export async function POST(req) {
  const body = await req.json();
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO fifa_rankings (team_name, fifa_points, fifa_rank, group_id)
    VALUES (?, ?, ?, ?)
  `);
  
  try {
    stmt.run(body.team_name, body.fifa_points, body.fifa_rank, body.group_id);
    triggerEngine();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
