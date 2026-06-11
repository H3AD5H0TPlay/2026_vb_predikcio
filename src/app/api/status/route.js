import { NextResponse } from 'next/server';
import { getSimulationStatus } from '@/lib/monteCarlo';

export async function GET() {
  return NextResponse.json({ running: getSimulationStatus() });
}
