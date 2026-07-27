import { createId } from '@paralleldrive/cuid2';
import { loadEnvConfig } from '@next/env';
import { and, asc, eq, gte, isNotNull, lte } from 'drizzle-orm';
import { buildingImages, buildings } from '../drizzle/schema';
import { db } from '../src/lib/db';

loadEnvConfig(process.cwd());

type CommonsInfo = { url?: string; thumburl?: string; extmetadata?: Record<string, { value?: string }> };
const clean = (value?: string) => value?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || null;
const value = (info: CommonsInfo, key: string) => clean(info.extmetadata?.[key]?.value);

async function commonsCandidate(address: string, houseNumber: string, streetName: string) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '5', gsrsearch: address, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '900', origin: '*' }).toString();
  const response = await fetch(url, { headers: { 'User-Agent': 'NYC-Demolition-Heritage-Map/0.1 (research pilot)' } });
  if (!response.ok) return null;
  const pages = Object.values(((await response.json()).query?.pages ?? {}) as Record<string, { pageid: number; title: string; imageinfo?: CommonsInfo[] }>);
  const streetToken = streetName.toLowerCase().split(' ')[0];
  const match = pages.find((page) => page.title.toLowerCase().includes(houseNumber.toLowerCase()) && page.title.toLowerCase().includes(streetToken));
  if (!match?.imageinfo?.[0]?.url) return null;
  const info = match.imageinfo[0];
  return { source: 'wikimedia_commons', sourceImageId: String(match.pageid), sourcePageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(match.title.replace(/ /g, '_'))}`, imageUrl: info.url!, thumbnailUrl: info.thumburl ?? info.url!, title: clean(match.title.replace(/^File:/, '')), creator: value(info, 'Artist'), license: value(info, 'LicenseShortName'), licenseUrl: value(info, 'LicenseUrl'), capturedAt: value(info, 'DateTimeOriginal'), matchMethod: 'address-title-exact', confidence: 0.8 };
}

async function mapillaryCandidate(latitude: number, longitude: number, jobStartDate: string) {
  const token = process.env.MAPILLARY_ACCESS_TOKEN;
  if (!token) return null;
  const url = new URL('https://graph.mapillary.com/images');
  url.search = new URLSearchParams({ access_token: token, fields: 'id,thumb_1024_url,captured_at,computed_geometry,creator', closeto: `${longitude},${latitude}`, limit: '10' }).toString();
  const response = await fetch(url);
  if (!response.ok) return null;
  const images = (await response.json()).data as Array<{ id: string; thumb_1024_url?: string; captured_at?: string; creator?: { username?: string } }>;
  const image = images.find((item) => item.thumb_1024_url && item.captured_at && item.captured_at.slice(0, 10) < jobStartDate);
  if (!image?.thumb_1024_url) return null;
  return { source: 'mapillary', sourceImageId: image.id, sourcePageUrl: `https://www.mapillary.com/app/?pKey=${image.id}`, imageUrl: image.thumb_1024_url, thumbnailUrl: image.thumb_1024_url, title: 'Mapillary street-level image', creator: image.creator?.username ?? null, license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', capturedAt: image.captured_at?.slice(0, 10) ?? null, matchMethod: 'nearby-coordinate-pre-start-date', confidence: 0.55 };
}

async function main() {
  const candidates = await db.select({ id: buildings.id, borough: buildings.borough, houseNumber: buildings.houseNumber, streetName: buildings.streetName, jobStartDate: buildings.jobStartDate, latitude: buildings.latitude, longitude: buildings.longitude }).from(buildings).where(and(gte(buildings.jobStartDate, '2024-01-01'), lte(buildings.jobStartDate, new Date().toISOString().slice(0, 10)), isNotNull(buildings.houseNumber), isNotNull(buildings.streetName), isNotNull(buildings.latitude), isNotNull(buildings.longitude))).orderBy(asc(buildings.jobStartDate)).limit(500);
  const selected = []; const boroughCounts = new Map<string, number>();
  for (const building of candidates) { const count = boroughCounts.get(building.borough) ?? 0; if (count < 5 && selected.length < 25) { selected.push(building); boroughCounts.set(building.borough, count + 1); } }
  for (const building of candidates) { if (selected.length >= 25) break; if (!selected.some((item) => item.id === building.id)) selected.push(building); }
  let commonsFound = 0; let mapillaryFound = 0;
  for (const building of selected) {
    const address = `${building.houseNumber} ${building.streetName}, ${building.borough}, New York`;
    const image = await commonsCandidate(address, building.houseNumber!, building.streetName!);
    if (image) { await db.insert(buildingImages).values({ id: createId(), buildingId: building.id, ...image }).onConflictDoNothing(); commonsFound++; }
    const streetImage = await mapillaryCandidate(building.latitude!, building.longitude!, building.jobStartDate!);
    if (streetImage) { await db.insert(buildingImages).values({ id: createId(), buildingId: building.id, ...streetImage }).onConflictDoNothing(); mapillaryFound++; }
  }
  console.log(`Checked ${selected.length} permits; saved ${commonsFound} Wikimedia Commons and ${mapillaryFound} Mapillary candidates for admin review.`);
}
main();
