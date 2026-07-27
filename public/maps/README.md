# Local NYC basemap

This directory is intentionally local-only. Place the generated `nyc.pmtiles` file here; Next.js serves it at `/maps/nyc.pmtiles` and MapLibre reads it directly with HTTP range requests.

## Build once with Docker

Prerequisites: Docker Desktop and at least 8 GB free disk space. The process downloads the current New York State OpenStreetMap extract (about 470 MB) and keeps only NYC-area tiles in the final archive.

From the project root:

```bash
./scripts/build-local-basemap.sh
```

The script downloads source data into `.cache/basemap/` and writes `public/maps/nyc.pmtiles`. Do not commit either file. Start the app with `npm run dev`; the map becomes visible when the archive is present.

## What is included

The archive uses Planetiler's OpenMapTiles-compatible profile and a NYC metro bounding box (`-74.35,40.40,-73.55,41.05`). The built-in project style intentionally has no labels or remote assets, so it remains entirely self-hosted. It renders water, land cover, buildings, and roads.

Data is © OpenStreetMap contributors and is used under the [Open Database License](https://www.openstreetmap.org/copyright). Preserve the visible attribution when changing the map UI.

## Later deployment

Set `NEXT_PUBLIC_MAP_ARCHIVE_URL` to an HTTPS URL serving the exact same `.pmtiles` archive. A static host must support HTTP byte-range requests and send `Accept-Ranges: bytes`; Cloudflare R2 does, but is not required for local use.
