import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { buildings } from '../../../../../../drizzle/schema';
import { db } from '@/lib/db';
import { findArchivePhoto } from '@/lib/municipal-archive';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [property] = await db.select({ borough: buildings.borough, houseNumber: buildings.houseNumber, streetName: buildings.streetName, block: buildings.block, lot: buildings.lot }).from(buildings).where(eq(buildings.id, id)).limit(1);
  if (!property) return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
  try {
    return NextResponse.json({ data: await findArchivePhoto(property) });
  } catch {
    return NextResponse.json({ error: 'Municipal Archive temporarily unavailable' }, { status: 503 });
  }
}
