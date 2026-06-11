import { NextResponse } from 'next/server';
import { getDb } from '@/db/index';
import { triggerEngine } from '@/lib/engine';

export async function DELETE(req, { params }) {
  const { id } = await params;
  try {
    const db = getDb();
    db.prepare('DELETE FROM matches WHERE id = ?').run(id);
    
    // Mivel a modell determinisztikus, egy meccs törlésénél elég csak
    // nullázni és újraszámolni az egészet a megmaradt meccsekből:
    triggerEngine(); 
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PUT(req, { params }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const db = getDb();
    db.prepare(`
      UPDATE matches 
      SET team_home = ?, team_away = ?, goals_home = ?, goals_away = ?, stage = ?, match_date = ?, group_id = ?
      WHERE id = ?
    `).run(
      body.team_home, body.team_away, body.goals_home, body.goals_away, 
      body.stage, body.match_date, body.group_id || null, id
    );
    
    // A módosítás után mindent újraszámol a motor
    triggerEngine();
    
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
