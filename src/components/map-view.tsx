'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import type { AddressSuggestion, BuildingFilter, GeocodedLocation, PermitMarker } from '@/types/building';

let protocolRegistered = false;
const sourceId = 'demolition-permits';
const selectedLocationSourceId = 'selected-address-location';

function localArchiveUrl() { return process.env.NEXT_PUBLIC_MAP_ARCHIVE_URL || `${window.location.origin}/maps/nyc.pmtiles`; }
function styleFor(archiveUrl: string): StyleSpecification { return { version: 8, sources: { basemap: { type: 'vector', url: `pmtiles://${archiveUrl}`, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' } }, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#fff' } }, { id: 'water', type: 'fill', source: 'basemap', 'source-layer': 'water', paint: { 'fill-color': '#e6e6e6' } }, { id: 'landcover', type: 'fill', source: 'basemap', 'source-layer': 'landcover', paint: { 'fill-color': '#f5f5f5' } }, { id: 'building', type: 'fill', source: 'basemap', 'source-layer': 'building', minzoom: 12, paint: { 'fill-color': '#fff', 'fill-outline-color': '#555' } }, { id: 'road-minor', type: 'line', source: 'basemap', 'source-layer': 'transportation', filter: ['!in', 'class', 'motorway', 'trunk', 'primary', 'secondary'], paint: { 'line-color': '#bbb', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 16, 3] } }, { id: 'road-major', type: 'line', source: 'basemap', 'source-layer': 'transportation', filter: ['in', 'class', 'motorway', 'trunk', 'primary', 'secondary'], paint: { 'line-color': '#111', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 16, 5] } }] }; }

/** One rendered point per coordinate makes cluster counts match visible dots. */
function permitGeoJson(permits: PermitMarker[]) {
  const locations = new Map<string, PermitMarker & { locationPermitCount: number }>();
  permits.filter((permit) => permit.latitude !== null && permit.longitude !== null).forEach((permit) => {
    const key = `${permit.longitude},${permit.latitude}`;
    const current = locations.get(key);
    if (current) current.locationPermitCount += 1;
    else locations.set(key, { ...permit, locationPermitCount: 1 });
  });
  return { type: 'FeatureCollection' as const, features: [...locations.values()].map((permit) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [permit.longitude!, permit.latitude!] }, properties: permit })) };
}
function selectedLocationGeoJson(location: (GeocodedLocation & { permitId: string }) | null) { return { type: 'FeatureCollection' as const, features: location ? [{ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [location.longitude, location.latitude] }, properties: { id: location.permitId } }] : [] }; }

type Props = { filters: BuildingFilter; focusedSuggestion: AddressSuggestion | null; selectedPermitId: string | null; onSelectPermit(permit: PermitMarker): void };

export function MapView({ filters, focusedSuggestion, selectedPermitId, onSelectPermit }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [permits, setPermits] = useState<PermitMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [geocodedFocus, setGeocodedFocus] = useState<(GeocodedLocation & { permitId: string }) | null>(null);
  const [geocodeNotice, setGeocodeNotice] = useState<string | null>(null);
  const locationCount = useMemo(() => new Set(permits.filter((permit) => permit.latitude !== null && permit.longitude !== null).map((permit) => `${permit.longitude},${permit.latitude}`)).size, [permits]);

  useEffect(() => { fetch(localArchiveUrl(), { method: 'HEAD' }).then((response) => setReady(response.ok)).catch(() => setReady(false)); }, []);
  useEffect(() => { const controller = new AbortController(); const params = new URLSearchParams({ fromYear: String(filters.fromYear), startedPastYear: String(filters.startedPastYear) }); setLoading(true); fetch(`/api/buildings?${params}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Permit query failed'))).then((body) => setPermits(body.data)).catch((error: Error) => { if (error.name !== 'AbortError') console.error(error); }).finally(() => setLoading(false)); return () => controller.abort(); }, [filters.fromYear, filters.startedPastYear]);

  useEffect(() => {
    if (!ready || !container.current) return;
    const protocol = new Protocol();
    if (!protocolRegistered) { maplibregl.addProtocol('pmtiles', protocol.tile); protocolRegistered = true; }
    const map = new maplibregl.Map({ container: container.current, style: styleFor(localArchiveUrl()), center: [-73.9772, 40.7527], zoom: 10.4, maxBounds: [[-74.35, 40.4], [-73.55, 41.05]] });
    const labels = new Map<string, maplibregl.Marker>();
    const clearLabels = () => labels.forEach((marker) => marker.remove());
    const zoomToCluster = (id: number, coordinates: [number, number]) => (map.getSource(sourceId) as GeoJSONSource).getClusterExpansionZoom(id).then((zoom) => map.easeTo({ center: coordinates, zoom }));
    // queryRenderedFeatures includes only the clusters actually on-screen,
    // preventing duplicate DOM labels from off-screen source tiles.
    const refreshLabels = () => {
      clearLabels(); labels.clear();
      map.queryRenderedFeatures({ layers: ['demolition-clusters'] }).forEach((feature) => {
        const geometry = feature.geometry as { type: string; coordinates?: number[] };
        if (geometry.type !== 'Point' || !geometry.coordinates) return;
        const id = Number(feature.properties?.cluster_id);
        if (!Number.isFinite(id) || labels.has(String(id))) return;
        const coordinates = geometry.coordinates as [number, number];
        const element = document.createElement('button');
        element.className = 'cluster-count';
        element.textContent = String(feature.properties?.point_count_abbreviated ?? '');
        element.setAttribute('aria-label', `${feature.properties?.point_count} map locations; zoom in`);
        element.onclick = () => zoomToCluster(id, coordinates);
        labels.set(String(id), new maplibregl.Marker({ element }).setLngLat(coordinates).addTo(map));
      });
    };
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      map.addSource(sourceId, { type: 'geojson', data: permitGeoJson([]), cluster: true, clusterMaxZoom: 14, clusterRadius: 48 });
      map.addSource(selectedLocationSourceId, { type: 'geojson', data: selectedLocationGeoJson(null) });
      map.addLayer({ id: 'demolition-clusters', type: 'circle', source: sourceId, filter: ['has', 'point_count'], paint: { 'circle-color': '#fff', 'circle-radius': ['step', ['get', 'point_count'], 16, 20, 20, 100, 26], 'circle-opacity': 1, 'circle-stroke-width': 2, 'circle-stroke-color': '#000' } });
      map.addLayer({ id: 'demolition-points', type: 'circle', source: sourceId, filter: ['!', ['has', 'point_count']], paint: { 'circle-color': '#000', 'circle-radius': 6, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' } });
      map.addLayer({ id: 'selected-address-point', type: 'circle', source: selectedLocationSourceId, paint: { 'circle-color': '#d40000', 'circle-radius': 9, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' } });
      map.on('click', 'demolition-points', (event) => { const properties = event.features?.[0]?.properties; if (properties) { setGeocodedFocus(null); setGeocodeNotice(null); onSelectPermit(properties as unknown as PermitMarker); } });
      map.on('click', 'demolition-clusters', (event) => { const feature = event.features?.[0]; const geometry = feature?.geometry as { type: string; coordinates?: number[] } | undefined; if (geometry?.type === 'Point' && geometry.coordinates) zoomToCluster(Number(feature?.properties?.cluster_id), geometry.coordinates as [number, number]); });
      map.on('moveend', refreshLabels); map.on('idle', refreshLabels); setMapReady(true);
    });
    return () => { clearLabels(); map.remove(); mapRef.current = null; setMapReady(false); };
  }, [ready, onSelectPermit]);

  useEffect(() => { if (!mapReady) return; const source = mapRef.current?.getSource(sourceId) as GeoJSONSource | undefined; source?.setData(permitGeoJson(permits)); }, [mapReady, permits]);
  useEffect(() => { const map = mapRef.current; if (!mapReady || !map?.getLayer('demolition-points')) return; const directSearchId = geocodedFocus?.permitId ?? ''; map.setFilter('demolition-points', ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'id'], directSearchId]]); map.setPaintProperty('demolition-points', 'circle-color', ['case', ['==', ['get', 'id'], selectedPermitId ?? ''], '#d40000', '#000']); map.setPaintProperty('demolition-points', 'circle-radius', ['case', ['==', ['get', 'id'], selectedPermitId ?? ''], 9, 6]); }, [mapReady, selectedPermitId, geocodedFocus]);
  useEffect(() => { const source = mapRef.current?.getSource(selectedLocationSourceId) as GeoJSONSource | undefined; source?.setData(selectedLocationGeoJson(geocodedFocus)); }, [mapReady, geocodedFocus]);
  useEffect(() => {
    if (!focusedSuggestion) { setGeocodedFocus(null); setGeocodeNotice(null); return; }
    if (!mapReady || !mapRef.current) return;
    const controller = new AbortController();
    setGeocodedFocus(null); setGeocodeNotice('Finding the listed address…');
    fetch(`/api/buildings/${encodeURIComponent(focusedSuggestion.id)}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : null).then((body) => { if (!controller.signal.aborted && body?.data) onSelectPermit(body.data as PermitMarker); }).catch(() => {});
    fetch(`/api/geocode?address=${encodeURIComponent(focusedSuggestion.label)}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : null).then((body) => {
      if (controller.signal.aborted) return;
      const location = body?.data as GeocodedLocation | null;
      if (!location) { setGeocodeNotice('The listed address could not be located on the map.'); return; }
      setGeocodedFocus({ ...location, permitId: focusedSuggestion.id }); setGeocodeNotice(null);
      mapRef.current?.flyTo({ center: [location.longitude, location.latitude], zoom: 16, essential: true });
    }).catch(() => { if (!controller.signal.aborted) setGeocodeNotice('The listed address could not be located on the map.'); });
    return () => controller.abort();
  }, [focusedSuggestion, mapReady, onSelectPermit]);

  if (ready === false) return <div className="map-message panel">Local basemap not found. Follow <code>public/maps/README.md</code> to build <code>nyc.pmtiles</code>, then refresh.</div>;
  if (ready === null) return <div className="map-message panel">Checking local basemap…</div>;
  return <><div ref={container} className="map-canvas" aria-label="NYC demolition map" />{loading && <p className="map-loading">Updating permits…</p>}{geocodeNotice && <p className="map-notice">{geocodeNotice}</p>}<p className="map-count">{locationCount.toLocaleString()} locations · {permits.length.toLocaleString()} permits</p></>;
}
