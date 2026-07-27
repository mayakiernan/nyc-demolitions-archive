import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { buildings } from '../../../../../drizzle/schema';
import { db } from '@/lib/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [building] = await db.select({ id: buildings.id, borough: buildings.borough, houseNumber: buildings.houseNumber, streetName: buildings.streetName, block: buildings.block, lot: buildings.lot, jobId: buildings.jobId, jobDocId: buildings.jobDocId, issuanceDate: buildings.issuanceDate, jobStartDate: buildings.jobStartDate, permitStatus: buildings.permitStatus, ownerFullName: buildings.ownerFullName, ownerBusinessName: buildings.ownerBusinessName, permitteeBusinessName: buildings.permitteeBusinessName, permitteePhone: buildings.permitteePhone, latitude: buildings.latitude, longitude: buildings.longitude, constructionYear: buildings.constructionYear }).from(buildings).where(eq(buildings.id, id)).limit(1);
  if (!building) return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
  return NextResponse.json({ data: building }, { headers: { 'Cache-Control': 'no-store' } });
}
