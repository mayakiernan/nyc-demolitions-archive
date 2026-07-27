import { NextRequest, NextResponse } from 'next/server';

type GeoSearchFeature = {
  geometry?: { coordinates?: unknown };
  properties?: { label?: unknown; confidence?: unknown };
};

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim();
  if (!address || address.length > 200) return NextResponse.json({ error: 'A valid address is required' }, { status: 400 });

  const url = new URL('https://geosearch.planninglabs.nyc/v2/search');
  url.searchParams.set('text', address);
  url.searchParams.set('size', '1');

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6_000), next: { revalidate: 86_400 } });
    if (!response.ok) throw new Error(`NYC GeoSearch returned ${response.status}`);
    const body = await response.json() as { features?: GeoSearchFeature[] };
    const feature = body.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') return NextResponse.json({ data: null });
    const properties = feature?.properties;
    return NextResponse.json({ data: { longitude: coordinates[0], latitude: coordinates[1], label: typeof properties?.label === 'string' ? properties.label : address, confidence: typeof properties?.confidence === 'number' ? properties.confidence : null } }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
  } catch (error) {
    console.error('NYC GeoSearch failed', error);
    return NextResponse.json({ error: 'Address lookup is temporarily unavailable' }, { status: 502 });
  }
}
