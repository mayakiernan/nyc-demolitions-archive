import { asc, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { buildings } from '../../../../../drizzle/schema';
import { db } from '@/lib/db';
import { formatAddress } from '@/lib/address';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  if (!query || query.length < 2) return NextResponse.json({ data: [] });
  const pattern = `%${query.replace(/[%_]/g, '\\$&').toLowerCase()}%`;
  const address = sql<string>`trim(coalesce(${buildings.houseNumber}, '') || ' ' || coalesce(${buildings.streetName}, ''))`;
  // The representative permit ID is a stable UI identity. The address remains
  // searchable even when DOB did not supply a usable map coordinate.
  const rows = await db.select({ id: sql<string>`min(${buildings.id})`, houseNumber: buildings.houseNumber, streetName: buildings.streetName, borough: buildings.borough }).from(buildings).where(sql`lower(${address}) like ${pattern} escape '\\' and ${buildings.houseNumber} is not null and ${buildings.streetName} is not null`).groupBy(buildings.houseNumber, buildings.streetName, buildings.borough).orderBy(asc(buildings.streetName), asc(buildings.houseNumber));
  return NextResponse.json({ data: rows.map((row) => ({ ...row, label: formatAddress(row), searchTerm: `${row.houseNumber} ${row.streetName} ${row.borough}` })) }, { headers: { 'Cache-Control': 'no-store' } });
}
