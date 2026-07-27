'use client';

import { useEffect, useState } from 'react';

type Submission = { id: string; title: string; content: string; submitterName: string | null; submitterEmail: string | null; moderationScore: number | null; moderationReasons: string[]; createdAt: string; buildingId: string };
export function AdminReviewQueue() {
  const [rows, setRows] = useState<Submission[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = () => { setLoading(true); fetch('/api/admin/reviews').then((response) => response.ok ? response.json() : Promise.reject()).then((body) => setRows(body.data)).catch(() => setError('Unable to load the review queue.')).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function review(submissionId: string, decision: 'approve' | 'reject' | 'request_edit') { const response = await fetch('/api/admin/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ submissionId, decision }) }); if (response.ok) setRows((current) => current.filter((row) => row.id !== submissionId)); else setError('That review could not be saved.'); }
  if (loading) return <p>Loading moderation queue…</p>; if (error) return <p role="alert">{error}</p>; if (!rows.length) return <p>No pending submissions.</p>;
  return <div className="review-list">{rows.map((row) => <article className="review-card" key={row.id}><div><h2>{row.title}</h2><p className="muted">Permit: {row.buildingId} · Submitted {new Date(row.createdAt).toLocaleDateString()}</p><p>{row.content}</p>{row.submitterName && <p className="muted">From: {row.submitterName}{row.submitterEmail ? ` (${row.submitterEmail})` : ''}</p>}<p className="moderation">Moderation score: {row.moderationScore?.toFixed(2) ?? 'not available'} {row.moderationReasons?.length ? `· ${row.moderationReasons.join(', ')}` : ''}</p></div><div className="review-actions"><button onClick={() => review(row.id, 'approve')}>Approve</button><button onClick={() => review(row.id, 'request_edit')}>Request edit</button><button className="danger" onClick={() => review(row.id, 'reject')}>Reject</button></div></article>)}</div>;
}
