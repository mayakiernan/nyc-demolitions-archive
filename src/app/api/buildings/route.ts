import { and, desc, gte, isNotNull, like, lte, or, sql, type SQL } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { buildings } from '../../../../drizzle/schema';
import { db } from '@/lib/db';

const currentYear = new Date().getUTCFullYear();
const today = new Date().toISOString().slice(0, 10);
const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const fromYear = Number(params.get('fromYear'));
  const search = params.get('search')?.trim();
  const startedPastYear = params.get('startedPastYear') === 'true';
  const conditions: SQL[] = [isNotNull(buildings.latitude), isNotNull(buildings.longitude)];
  if (Number.isInteger(fromYear) && fromYear >= 1900 && fromYear <= currentYear) conditions.push(gte(buildings.jobStartDate, `${fromYear}-01-01`));
  if (search) { const pattern = `%${search.replace(/[%_]/g, '\\$&').toLowerCase()}%`; const address = sql<string>`trim(coalesce(${buildings.houseNumber}, '') || ' ' || coalesce(${buildings.streetName}, ''))`; conditions.push(or(sql`lower(${address}) like ${pattern} escape '\\'`, like(buildings.borough, pattern)) as SQL); }
  if (startedPastYear) conditions.push(and(gte(buildings.jobStartDate, oneYearAgo), lte(buildings.jobStartDate, today)) as SQL);
  const rows = await db.select({ id: buildings.id, borough: buildings.borough, houseNumber: buildings.houseNumber, streetName: buildings.streetName, block: buildings.block, lot: buildings.lot, jobId: buildings.jobId, jobDocId: buildings.jobDocId, issuanceDate: buildings.issuanceDate, jobStartDate: buildings.jobStartDate, permitStatus: buildings.permitStatus, ownerFullName: buildings.ownerFullName, ownerBusinessName: buildings.ownerBusinessName, permitteeBusinessName: buildings.permitteeBusinessName, permitteePhone: buildings.permitteePhone, latitude: buildings.latitude, longitude: buildings.longitude, constructionYear: buildings.constructionYear }).from(buildings).where(and(...conditions)).orderBy(desc(buildings.jobStartDate)).limit(150_000);
  return NextResponse.json({ data: rows, filters: { fromYear, search, startedPastYear } }, { headers: { 'Cache-Control': 'no-store' } });
}
