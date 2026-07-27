export type BuildingFilter = {
  fromYear: number;
  search: string;
  startedPastYear: boolean;
};

export type PermitMarker = {
  id: string;
  borough: string;
  houseNumber: string | null;
  streetName: string | null;
  block: number | null;
  lot: number | null;
  jobId: string;
  jobDocId: string;
  issuanceDate: string | null;
  jobStartDate: string | null;
  permitStatus: string;
  ownerFullName: string | null;
  ownerBusinessName: string | null;
  permitteeBusinessName: string | null;
  permitteePhone: string | null;
  latitude: number | null;
  longitude: number | null;
  constructionYear: number | null;
};

/** A unique, searchable address represented by one permit record. */
export type AddressSuggestion = {
  id: string;
  borough: string;
  houseNumber: string;
  streetName: string;
  label: string;
  searchTerm: string;
};

export type GeocodedLocation = {
  latitude: number;
  longitude: number;
  label: string;
  confidence: number | null;
};
