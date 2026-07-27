# NYC Building Demolitions Archive

Interactive NYC demolition-permit map with preservation context and moderated community stories.

## Local setup

1. Copy `.env.example` to `.env.local` and replace the two admin secrets. For local work, retain the default `file:./data/nyc-demolition.db` database URL.
2. Install dependencies: `npm install`.
3. Generate and apply migrations: `npm run db:generate && npm run db:migrate`.
4. Build the local basemap: `./scripts/build-local-basemap.sh`. See [public/maps/README.md](public/maps/README.md) for disk requirements and attribution.
5. Optionally import DOB demolition permits: `npm run sync:nyc:data`.
6. Run the conservative pre-demolition image trial: `npm run sync:images:pilot`. It checks 25 cross-borough permits started since 2024 and saves only exact Wikimedia Commons address-title matches as pending candidates.
7. Start: `npm run dev`.

## Deployment

Create a Turso database, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel, then run migrations against that database before the first deploy. Add `ADMIN_ACCESS_PASSWORD` and `ADMIN_SESSION_SECRET` to Vercel too. The basemap is intentionally local during MVP development; only set `NEXT_PUBLIC_MAP_ARCHIVE_URL` after you choose a static host that supports byte-range requests.

The temporary admin password gate is suitable only for an internal MVP. Replace it with a real identity provider before granting multiple people access.

## Architecture

- `drizzle/schema.ts`: durable permit, moderation, media, and sync-run schema.
- `scripts/sync-nyc-data.ts`: paginated NYC Open Data import with idempotent upserts.
- `src/app/api`: public building/submission APIs and protected admin session endpoints.
- `public/maps/nyc.pmtiles`: locally served MapLibre/PMTiles basemap (generated, not committed).
- `src/lib/llm-provider.ts`: provider boundary; rule-based moderation is intentionally the initial implementation.
- `scripts/sync-image-pilot.ts`: provenance-first Wikimedia Commons discovery; it saves remote URLs and attribution only, never image files.

## Phases

MVP implements the permit map, filtering, submissions, and moderation foundation. Phase 2 enriches records from PLUTO/LPC and activates 3D building data. Phase 3 adds user identities, social features, exports, and mobile packaging.
