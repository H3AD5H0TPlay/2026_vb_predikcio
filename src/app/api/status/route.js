import { NextResponse } from 'next/server';

export async function GET() {
  // Check simulation status from monteCarlo.js if needed, or just simple state
  // But wait, our monteCarlo runs completely async. It modifies DB when done.
  // We can just query if any worker is running or we can just send true/false.
  return NextResponse.json({ running: false }); 
}
