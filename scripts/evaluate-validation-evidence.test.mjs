import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const evaluator = path.join(root, 'scripts/evaluate-validation-evidence.mjs');
const clinicalTemplatePath = path.join(root, 'validation/templates/clinical-review.json');

function runEvaluator(args = [], environment = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [evaluator, ...args], {
      cwd: root,
      env: { ...process.env, ...environment },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

test('current v1.3 templates and source inventory are structurally valid', async () => {
  const result = await runEvaluator(['--check-templates']);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /structurally valid/);
});

test('empty evidence remains a deliberate red result', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'olive-validation-empty-'));
  try {
    const user = path.join(temp, 'user');
    const clinical = path.join(temp, 'clinical');
    await mkdir(user);
    await mkdir(clinical);
    const result = await runEvaluator([], { OLIVE_USER_EVIDENCE_DIR: user, OLIVE_CLINICAL_EVIDENCE_DIR: clinical });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /No real user-session JSON records found/);
    assert.match(result.stderr, /No independent clinical-review JSON records found/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('retired clinical surface IDs cannot pass as current v1.3 inventory', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'olive-validation-retired-'));
  try {
    const user = path.join(temp, 'user');
    const clinical = path.join(temp, 'clinical');
    await mkdir(user);
    await mkdir(clinical);
    const record = JSON.parse(await readFile(clinicalTemplatePath, 'utf8'));
    record.surfaces[0].id = 'shared-status';
    await writeFile(path.join(clinical, 'retired.json'), `${JSON.stringify(record)}\n`);
    const result = await runEvaluator([], { OLIVE_USER_EVIDENCE_DIR: user, OLIVE_CLINICAL_EVIDENCE_DIR: clinical });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /retired surface IDs are not valid/);
    assert.match(result.stderr, /shared-status/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
