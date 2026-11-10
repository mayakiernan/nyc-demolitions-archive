import assert from 'node:assert/strict';
import { test } from 'node:test';
import { archiveRecordIds, findArchivePhoto, matchArchiveRecord, normalizeArchiveAddress } from './municipal-archive';

const property = { borough: 'MANHATTAN', houseNumber: '404', streetName: 'WEST 20TH ST', block: 717, lot: 46 };
const id = 'IO_a61f860b-e2b8-4273-8575-2231e4d1937b';
// Metadata structure and values from a live Municipal Archives record.
const entry = (label: string, value: string) => `<p tabindex="0" class="metadata-entry"><span class="metadata-title">${label}</span><span class="metadata-field-separator">:</span><span class="metadata-content">${value}</span></p>`;
const record = entry('Identifier', 'nynyma_rec0040_1_00717_0046') + entry('Title', '404 West 20 Street') + entry('Start Date', '1939') + entry('End Date', '1941') + entry('Type', 'Still Image ');

test('matches an exact 1940s address and historic parcel', () => {
  assert.equal(matchArchiveRecord(record, id, property)?.date, '1939–1941');
});
test('rejects wrong house number, street, borough, block, lot, and absent parcel data', () => {
  for (const change of [{ houseNumber: '40' }, { streetName: 'EAST 20 STREET' }, { borough: 'BROOKLYN' }, { block: 718 }, { lot: 47 }, { block: null }]) {
    assert.equal(matchArchiveRecord(record, id, { ...property, ...change }), null);
  }
});
test('rejects newer collection records and missing dates', () => {
  assert.equal(matchArchiveRecord(record.replace('rec0040', 'rec0041'), id, property), null);
  assert.equal(matchArchiveRecord(record.replace('1939', ''), id, property), null);
});
test('does not confuse Queens hyphenated numbers or partial street names', () => {
  assert.notEqual(normalizeArchiveAddress('34-46 91 Street'), normalizeArchiveAddress('3446 91 Street'));
  assert.notEqual(normalizeArchiveAddress('404 West 20 Street'), normalizeArchiveAddress('404 West 20 Street Extension'));
});
test('extracts all record links, preserving later results and removing duplicates', () => {
  const second = 'IO_4872e6f2-625f-4c2a-b7ff-08c4de5c8f3c';
  const link = (value: string) => `<h5><a href="https://nycrecords.access.preservica.com/uncategorized/${value}/">Title</a></h5>`;
  assert.deepEqual(archiveRecordIds(link(second) + link(id) + link(id)), [second, id]);
});

test('skips an incorrect first result and chooses the oldest confirmed photo', async () => {
  const original = globalThis.fetch;
  const ids = [id, 'IO_4872e6f2-625f-4c2a-b7ff-08c4de5c8f3c', 'IO_6308e7c9-3d50-4ccf-a530-b7b88af12f10'];
  const search = ids.map(value => `<h5><a href="https://nycrecords.access.preservica.com/uncategorized/${value}/">Photo</a></h5>`).join('');
  globalThis.fetch = async input => {
    const url = String(input);
    const body = url.includes('/?') ? search : url.includes(ids[0]) ? record.replace('404 West', '405 West') : url.includes(ids[1]) ? record.replace('1939', '1940') : record;
    return new Response(body);
  };
  try {
    assert.equal((await findArchivePhoto(property))?.sourcePageUrl, `https://nycrecords.access.preservica.com/uncategorized/${ids[2]}/`);
  } finally { globalThis.fetch = original; }
});
