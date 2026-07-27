import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { buildingImages } from '../../../../../../drizzle/schema';
import { db } from '@/lib/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await db.select().from(buildingImages).where(eq(buildingImages.buildingId, id)).orderBy(asc(buildingImages.createdAt));
  return NextResponse.json({ data });
}
