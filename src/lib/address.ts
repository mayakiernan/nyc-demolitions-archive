export function normalizeStreetName(streetName: string | null | undefined) {
  return (streetName ?? '')
    .replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, '$1')
    .replace(/\bST\.?\b/gi, 'Street')
    .replace(/\b(?:AVE|AV)\.?\b/gi, 'Avenue')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatAddress(parts: { houseNumber?: string | null; streetName?: string | null; borough?: string | null }) {
  return [parts.houseNumber, normalizeStreetName(parts.streetName), parts.borough].filter(Boolean).join(' ');
}

export function formatStreetAddress(parts: { houseNumber?: string | null; streetName?: string | null }) {
  return [parts.houseNumber, normalizeStreetName(parts.streetName)].filter(Boolean).join(' ');
}
