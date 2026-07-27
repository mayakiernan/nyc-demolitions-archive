'use client';

import { useEffect, useState } from 'react';
import type { PermitMarker } from '@/types/building';
import { formatAddress, formatStreetAddress } from '@/lib/address';

type Props = { permit: PermitMarker; onClose(): void };
export function SubmissionPanel({ permit, onClose }: Props) {
  const [state, setState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<Array<{ thumbnailUrl: string | null; sourcePageUrl: string; title: string | null; source: string; license: string | null; status: string }>>([]);
  const address = formatAddress(permit);
  const archiveQuery = formatStreetAddress(permit);
  const archiveSearch = archiveQuery ? `https://nycrecords.access.preservica.com/?${new URLSearchParams({ s: archiveQuery })}` : 'https://nycrecords.access.preservica.com/';
  const modernDay = address ? `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: `${address} NY` })}` : null;
  useEffect(() => { fetch(`/api/buildings/${permit.id}/images`).then((response) => response.ok ? response.json() : { data: [] }).then((body) => setImages(body.data)).catch(() => setImages([])); }, [permit.id]);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setState('saving'); const response = await fetch('/api/submissions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ buildingId: permit.id, title: form.get('title'), content: form.get('content'), submitterName: form.get('name') || undefined, submitterEmail: form.get('email') || undefined }) }); if (response.ok) { setMessage('Thank you. Your submission is awaiting moderation.'); setState('success'); event.currentTarget.reset(); } else { setMessage('We could not save that submission. Please check the fields and try again.'); setState('error'); } }
  const contactDetails = [
    ['Owner’s full name', permit.ownerFullName],
    ['Owner’s business name', permit.ownerBusinessName],
    ['Permittee’s business name', permit.permitteeBusinessName],
    ['Permittee’s phone number', permit.permitteePhone],
  ].filter(([, value]) => Boolean(value));
  return <aside className="submission-panel panel" aria-label="Submit a story"><button className="close-button" onClick={onClose} aria-label="Close submission form">×</button><p className="eyebrow">Selected demolition permit</p><h2>{address || `DOB job ${permit.jobId}`}</h2><p className="muted">Status: {permit.permitStatus} · Start date: {permit.jobStartDate ?? 'not listed'}</p><p><a className="archive-link" href={archiveSearch} target="_blank" rel="noreferrer">View Municipal Archives photos ↗</a></p>{modernDay && <p><a className="archive-link" href={modernDay} target="_blank" rel="noreferrer">View modern day ↗</a></p>}{images.map((image) => <figure className="building-image" key={image.sourcePageUrl}><a href={image.sourcePageUrl} target="_blank" rel="noreferrer">{image.thumbnailUrl && <img src={image.thumbnailUrl} alt={image.title ?? 'Candidate building image'} />}</a><figcaption>Candidate image — {image.source}{image.license ? ` · ${image.license}` : ''}. Verify this depicts the address before approval.</figcaption></figure>)}{state === 'success' ? <p role="status">{message}</p> : <form onSubmit={submit}><h3>Submit your story about this building</h3><label>Title<input name="title" required minLength={3} maxLength={140} placeholder="Title your post" /></label><label>Your story or historical note<textarea name="content" required minLength={20} maxLength={10000} rows={6} placeholder="Share context, memories, historical information, or preservation information" /></label><label>Your name <small>(optional)</small><input name="name" maxLength={120} /></label><label>Email <small>(optional, not published)</small><input name="email" type="email" /></label><button type="submit" disabled={state === 'saving'}>{state === 'saving' ? 'Adding…' : 'Add'}</button>{state === 'error' && <p role="alert">{message}</p>}</form>}{contactDetails.length > 0 && <section className="contact-details"><h3>Owner and permittee contact information</h3><p className="muted">If you wish to contact the permittee or building owner regarding this building demolition, you may use the information below to do so. We heavily discourage use of this information for harassment but rather hope that it may be used for outreach and research purposes.</p><dl>{contactDetails.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}</aside>;
}
