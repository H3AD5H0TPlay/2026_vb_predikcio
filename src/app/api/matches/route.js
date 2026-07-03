import { NextResponse } from 'next/server';
import { getDb } from '@/db/index';
import { addMatchAndRunEngine } from '@/lib/engine';

export const dynamic = 'force-dynamic';

let simulationStatus = { running: false };

export async function GET() {
  const db = getDb();
  const matches = db.prepare('SELECT * FROM matches ORDER BY match_date DESC, id DESC').all();
  return NextResponse.json(matches);
}

export async function POST(req) {
  const body = await req.json();
  
  try {
    addMatchAndRunEngine(body);
    return NextResponse.json({ success: true, message: 'Match added and simulation started.' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
