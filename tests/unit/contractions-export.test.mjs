import test from 'node:test';
import assert from 'node:assert/strict';

import { buildContractionsCsv } from '../../src/lib/contractions.ts';
import { csvCell } from '../../src/lib/csv.ts';

test('CSV export is chronological, portable, and preserves manual-entry metadata', () => {
  const csv = buildContractionsCsv([
    {
      id: 'later', sessionId: 'primary', source: 'timer',
      start: '2026-08-28T12:05:00.000Z', end: '2026-08-28T12:06:00.000Z',
      note: 'contains, comma', tags: ['pressure'], painLocations: ['lower back'],
    },
    {
      id: 'manual', sessionId: 'primary', source: 'manual',
      start: '2026-08-28T12:00:00.000Z', end: '2026-08-28T12:01:15.000Z', intensity: 7,
    },
  ], Date.parse('2026-08-28T12:10:00.000Z'));

  const lines = csv.trim().split('\r\n');
  assert.match(lines[0], /source.*duration_seconds.*interval_seconds/);
  assert.match(lines[1], /^manual,primary,manual,/);
  assert.match(lines[1], /,75,,7,/);
  assert.match(lines[2], /^later,primary,timer,/);
  assert.match(lines[2], /,60,300,/);
  assert.match(lines[2], /"contains, comma"/);
  assert.match(lines[2], /pressure,lower back$/);
});

test('contraction CSV neutralizes formula-leading user content', () => {
  const notes = ['=1+1', '+cmd', '-10+20', '@SUM(A1:A2)', ' \t=HYPERLINK("https://example.test")'];
  const csv = buildContractionsCsv(notes.map((note, index) => ({
    id: `formula-${index}`,
    sessionId: 'primary',
    start: new Date(Date.parse('2026-08-28T12:00:00.000Z') + index * 120_000).toISOString(),
    end: new Date(Date.parse('2026-08-28T12:01:00.000Z') + index * 120_000).toISOString(),
    note,
    tags: index === 0 ? ['=tag'] : [],
  })));
  for (const note of notes) {
    const encoded = csvCell(note);
    const decoded = encoded.startsWith('"') ? encoded.slice(1, -1).replaceAll('""', '"') : encoded;
    assert.equal(decoded, `'${note}`);
  }
  assert.ok(csv.includes("'=tag"));
  assert.doesNotMatch(csv, /(?:^|,)\s*[=+\-@]/m);
});
