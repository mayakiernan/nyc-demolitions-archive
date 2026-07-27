const endpoint = 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json';
const demolitionWhere = "job_type = 'DM'";
const importColumns = ':id,borough,bin__,house__,street_name,job__,job_doc___,job_type,block,lot,zip_code,bldg_type,residential,work_type,permit_status,permit_type,permit_sequence__,permit_subtype,filing_date,issuance_date,expiration_date,job_start_date,owner_s_first_name,owner_s_last_name,owner_s_business_name,permittee_s_business_name,permittee_s_phone__,gis_latitude,gis_longitude,gis_council_district,gis_census_tract,bbl,gis_nta_name';

export type DobPermit = Record<string, string | undefined>;

async function request(params: Record<string, string>) {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 0 } });
  if (!response.ok) throw new Error(`NYC Open Data request failed: ${response.status}`);
  return response;
}

export async function demolitionPermitCount(): Promise<number> {
  const response = await request({ '$select': 'count(*) as total', '$where': demolitionWhere });
  const rows = await response.json() as Array<{ total?: string }>;
  const total = Number(rows[0]?.total);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('NYC Open Data returned an invalid demolition permit count');
  return total;
}

export async function fetchDemolitionPermits(offset = 0, limit = 50_000): Promise<DobPermit[]> {
  const response = await request({ '$select': importColumns, '$limit': String(limit), '$offset': String(offset), '$where': demolitionWhere, '$order': ':id ASC' });
  return response.json() as Promise<DobPermit[]>;
}
