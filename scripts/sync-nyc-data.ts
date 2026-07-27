import { createId } from '@paralleldrive/cuid2';
import { lt, or, sql } from 'drizzle-orm';
import { buildings, syncRuns } from '../drizzle/schema';
import { db } from '../src/lib/db';
import { demolitionPermitCount, fetchDemolitionPermits } from '../src/lib/nyc-open-data';

const source = 'nyc-dob-permit-issuance';
const text = (value: string | undefined) => value?.trim() || null;
const number = (value: string | undefined) => { const result = Number(value); return Number.isFinite(result) ? result : null; };
const bool = (value: string | undefined) => ['true', 't', 'yes', 'y', '1'].includes(value?.toLowerCase() ?? '');
const fullName = (first: string | undefined, last: string | undefined) => [text(first), text(last)].filter(Boolean).join(' ') || null;
const batchSize = 500;
const pageSize = 10_000;
const currentYear = new Date().getUTCFullYear();
const pad = (value: number) => String(value).padStart(2, '0');

/** Converts DOB's ISO or US-style input into a real ISO calendar date. */
function date(value: string | undefined, maximumYear = currentYear + 1) {
  const raw = value?.trim();
  if (!raw) return null;
  const match = raw.match(/^(?:(\d{4})[-/](\d{1,2})[-/](\d{1,2})|(\d{1,2})\/(\d{1,2})\/(\d{4}))(?:[ T].*)?$/);
  if (!match) return null;
  const year = Number(match[1] ?? match[6]);
  const month = Number(match[2] ?? match[4]);
  const day = Number(match[3] ?? match[5]);
  if (year < 1900 || year > maximumYear || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function cleanedJobStartDate(value: string | undefined, issuanceDate: string | null) {
  const parsed = date(value);
  if (!parsed) return null;
  // A DOB permit normally expires within a year. A start date more than two
  // years after issuance is not credible enough to show as a started job.
  if (issuanceDate && Number(parsed.slice(0, 4)) > Number(issuanceDate.slice(0, 4)) + 2) return null;
  return parsed;
}

function permitId(record: Record<string, string | undefined>, issuanceDate: string | null) {
  // Socrata's row ID is the only identity that distinguishes every official
  // permit row; job/document/sequence fields are not unique in this dataset.
  return record[':id'] || [record.job__ || 'unknown', record.job_doc___ || '0', record.permit_sequence__ || '0', record.permit_type || 'unknown', record.permit_subtype || 'none', record.work_type || 'none', issuanceDate || 'unissued'].join('-');
}

async function main() {
  const runId = createId();
  const snapshotStartedAt = new Date().toISOString();
  await db.insert(syncRuns).values({ id: runId, source, status: 'running' });
  let read = 0; let upserted = 0;
  try {
    const expectedTotal = await demolitionPermitCount();
    for (let offset = 0; offset < expectedTotal; offset += pageSize) {
      const page = await fetchDemolitionPermits(offset, pageSize);
      read += page.length;
      if (!page.length) throw new Error(`NYC Open Data returned an empty page at offset ${offset} before the expected ${expectedTotal} rows`);
      const values = page.map((record) => {
        const issuanceDate = date(record.issuance_date);
        return {
          id: permitId(record, issuanceDate), bbl: text(record.bbl), borough: text(record.borough) ?? 'UNKNOWN', bin: number(record.bin__), houseNumber: text(record.house__), streetName: text(record.street_name), block: number(record.block), lot: number(record.lot), zipCode: text(record.zip_code), jobId: text(record.job__) ?? 'unknown', jobDocId: text(record.job_doc___) ?? '0', permitSequence: text(record.permit_sequence__), permitType: text(record.permit_type), permitSubtype: text(record.permit_subtype), workType: text(record.work_type), ownerFullName: fullName(record.owner_s_first_name, record.owner_s_last_name), ownerBusinessName: text(record.owner_s_business_name), permitteeBusinessName: text(record.permittee_s_business_name), permitteePhone: text(record.permittee_s_phone__), jobType: 'DM' as const, buildingType: text(record.bldg_type), residential: bool(record.residential), filingDate: date(record.filing_date), issuanceDate, expirationDate: date(record.expiration_date, currentYear + 20), jobStartDate: cleanedJobStartDate(record.job_start_date, issuanceDate), permitStatus: text(record.permit_status) ?? 'UNKNOWN', latitude: number(record.gis_latitude), longitude: number(record.gis_longitude), councilDistrict: number(record.gis_council_district), censusTract: text(record.gis_census_tract), ntaName: text(record.gis_nta_name), sourceUpdatedAt: snapshotStartedAt,
        };
      });
      for (let start = 0; start < values.length; start += batchSize) {
        const batch = values.slice(start, start + batchSize);
        await db.insert(buildings).values(batch).onConflictDoUpdate({ target: buildings.id, set: { bbl: sql`excluded.bbl`, borough: sql`excluded.borough`, bin: sql`excluded.bin`, houseNumber: sql`excluded.house_number`, streetName: sql`excluded.street_name`, block: sql`excluded.block`, lot: sql`excluded.lot`, zipCode: sql`excluded.zip_code`, permitSequence: sql`excluded.permit_sequence`, permitType: sql`excluded.permit_type`, permitSubtype: sql`excluded.permit_subtype`, workType: sql`excluded.work_type`, ownerFullName: sql`excluded.owner_full_name`, ownerBusinessName: sql`excluded.owner_business_name`, permitteeBusinessName: sql`excluded.permittee_business_name`, permitteePhone: sql`excluded.permittee_phone`, buildingType: sql`excluded.building_type`, residential: sql`excluded.residential`, filingDate: sql`excluded.filing_date`, issuanceDate: sql`excluded.issuance_date`, expirationDate: sql`excluded.expiration_date`, jobStartDate: sql`excluded.job_start_date`, permitStatus: sql`excluded.permit_status`, latitude: sql`excluded.latitude`, longitude: sql`excluded.longitude`, councilDistrict: sql`excluded.council_district`, censusTract: sql`excluded.census_tract`, ntaName: sql`excluded.nta_name`, sourceUpdatedAt: sql`excluded.source_updated_at`, updatedAt: sql`CURRENT_TIMESTAMP` } });
        upserted += batch.length;
      }
    }
    if (read !== expectedTotal) throw new Error(`Expected ${expectedTotal} demolition permits but read ${read}`);
    // Only after a complete snapshot succeeds, remove prior source records.
    await db.delete(buildings).where(or(lt(buildings.sourceUpdatedAt, snapshotStartedAt), sql`${buildings.sourceUpdatedAt} is null`));
    await db.update(syncRuns).set({ status: 'completed', recordsRead: read, recordsUpserted: upserted, completedAt: new Date().toISOString() }).where(sql`${syncRuns.id} = ${runId}`);
  } catch (error) {
    await db.update(syncRuns).set({ status: 'failed', recordsRead: read, recordsUpserted: upserted, errorMessage: error instanceof Error ? error.message : String(error), completedAt: new Date().toISOString() }).where(sql`${syncRuns.id} = ${runId}`);
    throw error;
  }
}
main();
