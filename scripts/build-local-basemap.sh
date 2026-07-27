#!/usr/bin/env bash
set -euo pipefail

# Builds an NYC-only PMTiles archive from current OpenStreetMap data. This script
# deliberately runs Planetiler in Docker so Java and native GIS tooling stay out
# of the application dependency tree.
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cache_dir="$project_root/.cache/basemap"
archive_dir="$project_root/public/maps"
source_file="$cache_dir/new-york-latest.osm.pbf"

mkdir -p "$cache_dir" "$archive_dir"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker Desktop is required. Install and start it, then run this script again." >&2
  exit 1
fi

if [ ! -s "$source_file" ]; then
  curl --fail --location --retry 3 \
    --output "$source_file" \
    https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf
fi

docker run --rm \
  -e JAVA_TOOL_OPTIONS='-Xmx2g' \
  -v "$cache_dir:/data" \
  ghcr.io/onthegomap/planetiler:latest \
  --download \
  --osm-path=/data/new-york-latest.osm.pbf \
  --bounds=-74.35,40.40,-73.55,41.05 \
  --output=/data/nyc.pmtiles \
  --force

mv "$cache_dir/nyc.pmtiles" "$archive_dir/nyc.pmtiles"
echo "Built $archive_dir/nyc.pmtiles"
