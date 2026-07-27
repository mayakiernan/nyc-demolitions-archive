'use client';

import { useEffect, useRef, useState } from 'react';
import type { AddressSuggestion, BuildingFilter } from '@/types/building';

type Props = { filters: BuildingFilter; onChange(filters: BuildingFilter): void; onSelectAddress(suggestion: AddressSuggestion): void };
const currentYear = new Date().getFullYear(); const earliestYear = 1989;

export function FilterPanel({ filters, onChange, onSelectAddress }: Props) {
  const update = (patch: Partial<BuildingFilter>) => onChange({ ...filters, ...patch });
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false); const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { const query = filters.search.trim(); if (query.length < 2) { setSuggestions([]); return; } const controller = new AbortController(); const timer = setTimeout(() => { fetch(`/api/buildings/search?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : { data: [] }).then((body) => { setSuggestions(body.data); setOpen(true); }).catch(() => {}); }, 180); return () => { clearTimeout(timer); controller.abort(); }; }, [filters.search]);
  const choose = (suggestion: AddressSuggestion) => { if (closeTimer.current) clearTimeout(closeTimer.current); update({ search: suggestion.searchTerm }); onSelectAddress(suggestion); setOpen(false); };
  return <aside className="filter-panel panel" aria-label="Map filters">
    <div><strong>Explore demolition permits</strong><label className="search-label" htmlFor="address-search">Address search<div className="address-combobox"><input id="address-search" role="combobox" aria-autocomplete="list" aria-expanded={open && suggestions.length > 0} value={filters.search} onFocus={() => setOpen(true)} onBlur={() => { closeTimer.current = setTimeout(() => setOpen(false), 150); }} onChange={(event) => update({ search: event.target.value })} placeholder="e.g. 123 Main Street" />{open && suggestions.length > 0 && <ul role="listbox">{suggestions.map((suggestion) => <li key={suggestion.id} role="option"><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(suggestion)}>{suggestion.label}</button></li>)}</ul>}</div></label></div>
    <fieldset><legend>Timeline</legend><label className="range-label" htmlFor="permit-year"><span>Show demolitions with a DOB start date in <strong>{filters.fromYear}</strong> or later</span><input id="permit-year" type="range" min={earliestYear} max={currentYear} value={filters.fromYear} onChange={(event) => update({ fromYear: Number(event.target.value) })} /><span className="range-bounds"><small>{earliestYear}</small><small>{currentYear}</small></span></label></fieldset>
    <label className="check-row"><input type="checkbox" checked={filters.startedPastYear} onChange={(event) => update({ startedPastYear: event.target.checked })} /> Work started in the past year</label>
    <label className="check-row"><input type="checkbox" disabled /> Building age over 50 years <small>(available after PLUTO enrichment)</small></label>
  </aside>;
}
