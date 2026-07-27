'use client';

import { useState } from 'react';
import { FilterPanel } from './filter-panel';
import { MapView } from './map-view';
import { SubmissionPanel } from './submission-panel';
import { AboutModal } from './about-modal';
import type { AddressSuggestion, BuildingFilter, PermitMarker } from '@/types/building';

export function MapShell() {
  const [filters, setFilters] = useState<BuildingFilter>({ fromYear: 1989, search: '', startedPastYear: false });
  const [selectedPermit, setSelectedPermit] = useState<PermitMarker | null>(null);
  const [focusedSuggestion, setFocusedSuggestion] = useState<AddressSuggestion | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  return <main className="shell">
    <header className="topbar"><strong>NYC Building Demolitions Archive</strong><button className="text-link" onClick={() => setAboutOpen(true)}>About</button></header>
    <section className="map-stage">
      <MapView filters={filters} focusedSuggestion={focusedSuggestion} selectedPermitId={selectedPermit?.id ?? null} onSelectPermit={setSelectedPermit} />
      <FilterPanel filters={filters} onChange={setFilters} onSelectAddress={setFocusedSuggestion} />
      {selectedPermit && <SubmissionPanel permit={selectedPermit} onClose={() => { setSelectedPermit(null); setFocusedSuggestion(null); }} />}
      <a className="map-admin-link" href="/admin">Admin</a>
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </section>
    <footer className="footer">Data: NYC Department of Buildings via <a href="https://data.cityofnewyork.us/Housing-Development/DOB-Permit-Issuance/ipu4-2q9a">NYC Open Data</a>. Permit status may change before demolition; data updates monthly.</footer>
  </main>;
}
