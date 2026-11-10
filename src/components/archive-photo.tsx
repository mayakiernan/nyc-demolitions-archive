'use client';

import { useEffect, useState } from 'react';
import type { PermitMarker } from '@/types/building';
import { archiveSearchUrl, type ArchivePhoto as Photo } from '@/lib/municipal-archive';

export function ArchivePhoto({ permit }: { permit: PermitMarker }) {
  const [result, setResult] = useState<{ id: string; photo: Photo | null; failed: boolean } | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/buildings/${permit.id}/archive-photo`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('Archive unavailable'); return response.json(); })
      .then(body => setResult({ id: permit.id, photo: body.data, failed: false }))
      .catch(() => { if (!controller.signal.aborted) setResult({ id: permit.id, photo: null, failed: true }); });
    return () => controller.abort();
  }, [permit.id]);
  const current = result?.id === permit.id ? result : null;
  const photo = current?.photo;
  return <section className="archive-photo" aria-label="Historic Municipal Archive photograph">
    {photo && broken !== photo.thumbnailUrl ? <figure className="building-image">
      <img src={photo.thumbnailUrl} alt={`${photo.title}, ${photo.date}, NYC Municipal Archives tax photograph`} onError={() => setBroken(photo.thumbnailUrl)} />
      <figcaption>{photo.date} · NYC Municipal Archives<br />Address and borough/block/lot match the archive record.</figcaption>
    </figure> : <p className="muted" role="status">{!current ? 'Loading historic photograph…' : current.failed || photo ? 'Archive photograph temporarily unavailable.' : 'No confirmed 1940s photograph found for this address and tax lot.'}</p>}
    <p><a className="archive-link" href={photo?.sourcePageUrl ?? archiveSearchUrl(permit)} target="_blank" rel="noreferrer">View Municipal Archive ↗</a></p>
  </section>;
}
