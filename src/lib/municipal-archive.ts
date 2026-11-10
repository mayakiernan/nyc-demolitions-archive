import { formatStreetAddress } from './address';

const origin = 'https://nycrecords.access.preservica.com';
const collection = 'SO_d501be84-e09a-4023-bb8a-263aa8b0e04f';
type Property = { borough: string; houseNumber: string | null; streetName: string | null; block: number | null; lot: number | null };
export type ArchivePhoto = { thumbnailUrl: string; sourcePageUrl: string; title: string; date: string; identifier: string };
const boroughs: Record<string, number> = { MANHATTAN: 1, BRONX: 2, BROOKLYN: 3, QUEENS: 4, 'STATEN ISLAND': 5, RICHMOND: 5 };

// Decode text only; archive HTML is never inserted into the UI.
function text(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
export function normalizeArchiveAddress(value: string) {
  const words: Record<string, string> = { ST: 'STREET', AV: 'AVENUE', AVE: 'AVENUE', RD: 'ROAD', BLVD: 'BOULEVARD', PL: 'PLACE', DR: 'DRIVE', CT: 'COURT', LN: 'LANE', PKWY: 'PARKWAY', N: 'NORTH', S: 'SOUTH', E: 'EAST', W: 'WEST' };
  return value.toUpperCase().replace(/\b(\d+)(?:ST|ND|RD|TH)\b/g, '$1').replace(/[.,']/g, '').replace(/\b[A-Z]+\b/g, word => words[word] ?? word).replace(/\s+/g, ' ').trim();
}
export function archiveSearchUrl(property: Property) {
  return `${origin}/?${new URLSearchParams({ s: formatStreetAddress(property), parenthierarchy: collection })}`;
}
export function archiveRecordIds(html: string) {
  return [...new Set([...html.matchAll(/<h5>\s*<a\s+href="https:\/\/nycrecords\.access\.preservica\.com\/uncategorized\/(IO_[a-f0-9-]{36})\//gi)].map(match => match[1]))];
}
export function matchArchiveRecord(html: string, id: string, property: Property): ArchivePhoto | null {
  const metadata = new Map<string, string[]>();
  for (const entry of html.matchAll(/<p\b[^>]*class="metadata-entry"[^>]*>([\s\S]*?)<\/p>/gi)) {
    const label = entry[1].match(/class="metadata-title">([\s\S]*?)<\/span>/)?.[1];
    const value = entry[1].match(/class="metadata-content">([\s\S]*?)<\/span>/)?.[1];
    if (label && value) metadata.set(text(label), [...(metadata.get(text(label)) ?? []), text(value)]);
  }
  const identifier = metadata.get('Identifier')?.[0] ?? '';
  const parcel = identifier.match(/^nynyma_rec0040_(\d)_(\d+)_(\d+)[a-z]?$/i);
  const titles = metadata.get('Title') ?? [];
  const title = titles.find(value => normalizeArchiveAddress(value) === normalizeArchiveAddress(formatStreetAddress(property)));
  const start = metadata.get('Start Date')?.[0] ?? '';
  const end = metadata.get('End Date')?.[0] ?? start;
  // Require both the exact address and historic parcel. Modern lot splits/merges
  // and alternate addresses need human review, never a guessed photograph.
  if (!title || !parcel || !property.houseNumber || !property.streetName ||
      Number(parcel[1]) !== boroughs[property.borough.toUpperCase()] ||
      Number(parcel[2]) !== property.block || Number(parcel[3]) !== property.lot ||
      !/^\d{4}$/.test(start) || !/^\d{4}$/.test(end) || Number(start) < 1939 || Number(end) > 1951 ||
      !metadata.get('Type')?.some(value => value === 'Still Image')) return null;
  return { thumbnailUrl: `${origin}/download/thumbnail/${id}`, sourcePageUrl: `${origin}/uncategorized/${id}/`, title, date: start === end ? start : `${start}–${end}`, identifier };
}

async function archiveHtml(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error('Municipal Archive unavailable');
  return response.text();
}
export async function findArchivePhoto(property: Property): Promise<ArchivePhoto | null> {
  const borough = boroughs[property.borough.toUpperCase()];
  if (!borough || !property.block || !property.lot || !property.houseNumber || !property.streetName) return null;
  const identifier = `nynyma_rec0040_${borough}_${String(property.block).padStart(5, '0')}_${String(property.lot).padStart(4, '0')}`;
  const url = `${origin}/?${new URLSearchParams({ s: identifier, parenthierarchy: collection })}`;
  const inspected = new Set<string>();
  async function confirmedPhotos(searchUrl: string) {
    const ids = archiveRecordIds(await archiveHtml(searchUrl)).filter(id => !inspected.has(id)).slice(0, 24);
    ids.forEach(id => inspected.add(id));
    const results = await Promise.all(ids.map(async id => matchArchiveRecord(await archiveHtml(`${origin}/uncategorized/${id}/`), id, property)));
    return results.filter((photo): photo is ArchivePhoto => photo !== null)
      .sort((a, b) => a.date.localeCompare(b.date) || a.identifier.localeCompare(b.identifier));
  }
  const parcelMatches = await confirmedPhotos(url);
  if (parcelMatches.length) return parcelMatches[0];
  // A parcel search may return records for a different street frontage. Still
  // try the address search when those results fail validation.
  return (await confirmedPhotos(archiveSearchUrl(property)))[0] ?? null;
}
