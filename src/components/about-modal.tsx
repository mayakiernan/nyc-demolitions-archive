'use client';

import { useState } from 'react';

type Props = { onClose(): void };

export function AboutModal({ onClose }: Props) {
  const [showTerms, setShowTerms] = useState(false);
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="about-modal panel" role="dialog" aria-modal="true" aria-labelledby="about-title" onMouseDown={(event) => event.stopPropagation()}><button className="close-button" onClick={onClose} aria-label="Close">×</button>{showTerms ? <><h2 id="about-title">Terms of use</h2><p>This archive is a public-interest research and community-history project. It presents NYC Department of Buildings permit data and user submissions for informational, educational, and archival purposes; it does not verify every record, location, image, or submission.</p><p>Use the archive responsibly. Do not use it to harass, threaten, identify private individuals, or interfere with lawful work. Do not submit unlawful, hateful, defamatory, spam, or personally sensitive material. Submissions may be moderated, edited for safety, or removed; source data and site content may change without notice.</p><p>You remain responsible for material you submit and for complying with applicable law. The archive is provided as-is, without warranties, and is not legal, property, preservation, or safety advice.</p><button className="text-link" onClick={() => setShowTerms(false)}>Back to About</button></> : <><h2 id="about-title">About</h2><p>NYC Building Demolitions Archive maps New York City demolition permits alongside community stories and links to historical sources, helping residents research buildings before and after demolition.</p><p>Designed and built by <a href="https://www.samzgrunebaum.org" target="_blank" rel="noreferrer">Sam Grunebaum</a>.</p><button className="text-link" onClick={() => setShowTerms(true)}>Terms of use</button></>}</section></div>;
}
