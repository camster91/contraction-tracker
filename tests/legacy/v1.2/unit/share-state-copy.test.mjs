import assert from 'node:assert/strict';
import test from 'node:test';

import { getSharedStateCopy } from '../../src/lib/shareStateCopy.ts';

test('preparing status is factual and never an all-clear', () => {
  const copy = getSharedStateCopy('prenatal', 0);
  assert.equal(copy.title, 'Shared status: Preparing');
  assert.match(copy.detail, /not a clinical assessment/i);
  assert.doesNotMatch(`${copy.title} ${copy.detail}`, /all quiet|safe|nothing happening/i);
});

test('labor status attributes the label to Olive rather than diagnosis', () => {
  const copy = getSharedStateCopy('labor', 3);
  assert.match(copy.detail, /3 contractions recorded/i);
  assert.match(copy.detail, /selected in Olive/i);
  assert.match(copy.detail, /not a diagnosis/i);
});

test('postpartum and archived statuses remain user-state facts', () => {
  assert.match(getSharedStateCopy('postpartum', 0).detail, /selected in Olive/i);
  assert.match(getSharedStateCopy('archived', 0).detail, /read-only/i);
});
