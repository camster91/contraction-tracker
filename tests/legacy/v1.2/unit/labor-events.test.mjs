import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLaborEventsCsv } from '../../src/lib/laborEvents.ts';
import { csvCell } from '../../src/lib/csv.ts';

test('labor event CSV is chronological and escapes notes', () => {
  const csv = buildLaborEventsCsv([
    { id: '2', sessionId: 'primary', kind: 'arrived', occurredAt: '2026-08-28T10:00:00.000Z', createdAt: '2026-08-28T10:00:00.000Z' },
    { id: '1', sessionId: 'primary', kind: 'waters', occurredAt: '2026-08-28T09:00:00.000Z', note: 'Clear, "small amount"', createdAt: '2026-08-28T09:00:00.000Z' },
  ]);
  const lines = csv.split('\r\n');
  assert.equal(lines[1], '2026-08-28T09:00:00.000Z,Waters released,"Clear, ""small amount"""');
  assert.equal(lines[2], '2026-08-28T10:00:00.000Z,Arrived at place of care,');
});

test('labor event CSV neutralizes formula-leading notes after whitespace or controls', () => {
  const notes = ['=1+1', '+cmd', '-10+20', '@SUM(A1:A2)', '\t =HYPERLINK("https://example.test")'];
  const csv = buildLaborEventsCsv(notes.map((note, index) => ({
    id: String(index),
    sessionId: 'primary',
    kind: 'note',
    occurredAt: new Date(Date.parse('2026-08-28T09:00:00.000Z') + index * 60_000).toISOString(),
    note,
    createdAt: '2026-08-28T09:00:00.000Z',
  })));
  for (const note of notes) {
    const encoded = csvCell(note);
    const decoded = encoded.startsWith('"') ? encoded.slice(1, -1).replaceAll('""', '"') : encoded;
    assert.equal(decoded, `'${note}`);
  }
  assert.doesNotMatch(csv, /(?:^|,)\s*[=+\-@]/m);
});
