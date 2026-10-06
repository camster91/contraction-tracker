import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const userTemplatePath = path.join(root, 'validation/templates/user-session.json');
const clinicalTemplatePath = path.join(root, 'validation/templates/clinical-review.json');
const taskIds = Array.from({ length: 12 }, (_, index) => index + 1);
const surfaceIds = ['urgent-help', 'saved-reminder', 'pattern-building', 'care-plan-settings', 'spoken-reminder', 'shared-status', 'labor-events', 'hospital-exams', 'postpartum-boundary', 'support-escalation', 'privacy-boundary', 'store-copy', 'screenshots'];
const expectedSources = {
  'urgent-help': ['src/App.tsx'], 'saved-reminder': ['src/App.tsx'], 'pattern-building': ['src/App.tsx'],
  'care-plan-settings': ['src/components/SettingsSheet.tsx'], 'spoken-reminder': ['src/App.tsx'],
  'shared-status': ['src/lib/shareStateCopy.ts', 'src/components/ShareView.tsx', 'src/components/JourneySheet.tsx', 'src/App.tsx'],
  'labor-events': ['src/components/LaborEventsSheet.tsx', 'src/lib/laborEvents.ts'],
  'hospital-exams': ['src/components/HospitalSheet.tsx', 'src/lib/i18n.ts'],
  'postpartum-boundary': ['src/components/PostpartumTimelinePanel.tsx'], 'support-escalation': ['public/support/index.html'],
  'privacy-boundary': ['docs/privacy-policy.md', 'public/privacy/index.html'],
  'store-copy': ['APP-STORE-CONNECT-FIELDS.txt', 'PLAY-STORE-CONSOLE-FIELDS.txt'],
  screenshots: ['docs/STORE-ASSET-REVIEW.md'],
};
const groups = new Set(['third-trimester-first-pregnancy', 'third-trimester-subsequent-pregnancy', 'partner-or-doula', 'labored-within-previous-year', 'low-vision', 'large-text', 'reduced-motor', 'reduced-motion']);
const interpretations = new Set(['none', 'diagnosis', 'all-clear', 'travel-direction', 'other']);

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const sameIds = (values, expected) => JSON.stringify([...values].sort()) === JSON.stringify([...expected].sort());
const placeholder = (value) => !nonEmpty(value) || /^(anonymous-|app-|build-|ios-build-|android-build-|full-git-|artifact-|ios-artifact-|android-artifact-|device-|os-|facilitator-|independent-|registration-|practice-|restricted-|annotated-|record-the-|release-evidence-)|YYYY-MM-DD|testflight-or-play|annotated-screenshot|candidate-source-sha256|rendered-artifact-sha256/i.test(value);
const realDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && date.valueOf() <= Date.now();
};
const candidateIdentity = (candidate) => JSON.stringify({ version: candidate.version, build: candidate.build, iosBuild: candidate.iosBuild, androidBuild: candidate.androidBuild, sourceRevision: candidate.sourceRevision, iosArtifactSha256: candidate.iosArtifactSha256, androidArtifactSha256: candidate.androidArtifactSha256, releaseEvidenceId: candidate.releaseEvidenceId });

function validateCandidate(candidate, label, errors, template) {
  if (!isObject(candidate)) return errors.push(`${label}: candidate is required`);
  for (const field of ['version', 'build', 'iosBuild', 'androidBuild', 'sourceRevision', 'iosArtifactSha256', 'androidArtifactSha256']) {
    if (!nonEmpty(candidate[field])) errors.push(`${label}: candidate.${field} is required`);
    else if (!template && placeholder(candidate[field])) errors.push(`${label}: candidate.${field} is still a placeholder`);
  }
  if (!nonEmpty(candidate.releaseEvidenceId)) errors.push(`${label}: candidate.releaseEvidenceId is required`);
  else if (!template && placeholder(candidate.releaseEvidenceId)) errors.push(`${label}: candidate.releaseEvidenceId is still a placeholder`);
  if (!template && !/^[0-9a-f]{40}$/i.test(candidate.sourceRevision ?? '')) errors.push(`${label}: sourceRevision must be a full 40-character git SHA`);
  if (!template && !/^[0-9a-f]{64}$/i.test(candidate.iosArtifactSha256 ?? '')) errors.push(`${label}: iosArtifactSha256 must be a 64-character SHA-256`);
  if (!template && !/^[0-9a-f]{64}$/i.test(candidate.androidArtifactSha256 ?? '')) errors.push(`${label}: androidArtifactSha256 must be a 64-character SHA-256`);
}

function validateUser(record, label, template = false) {
  const errors = [];
  if (record?.schemaVersion !== 1) errors.push(`${label}: schemaVersion must be 1`);
  if (!nonEmpty(record?.participantId)) errors.push(`${label}: participantId is required`);
  else if (!template && placeholder(record.participantId)) errors.push(`${label}: participantId is still a placeholder`);
  if (!Array.isArray(record?.groups) || !record.groups.length || record.groups.some((group) => !groups.has(group))) errors.push(`${label}: groups contain an unsupported value or are empty`);
  const primaryGroups = record?.groups?.filter((group) => ['third-trimester-first-pregnancy', 'third-trimester-subsequent-pregnancy', 'partner-or-doula', 'labored-within-previous-year'].includes(group)) ?? [];
  if (primaryGroups.length !== 1) errors.push(`${label}: exactly one primary cohort is required; accessibility groups may overlap`);
  if (!['lived-experience', 'simulated-setting', 'not-applicable'].includes(record?.accessibilityEvidence)) errors.push(`${label}: accessibilityEvidence is invalid`);
  if (!isObject(record?.consent) || typeof record.consent.observed !== 'boolean' || !nonEmpty(record.consent.date)) errors.push(`${label}: complete consent record is required`);
  if (!template && record?.consent?.observed !== true) errors.push(`${label}: observed consent is required`);
  if (!template && !realDate(record?.consent?.date)) errors.push(`${label}: consent date must be a valid, non-future date`);
  validateCandidate(record?.candidate, label, errors, template);
  if (!nonEmpty(record?.candidate?.installSource)) errors.push(`${label}: candidate.installSource is required`);
  if (!isObject(record?.device) || !['ios', 'android'].includes(record.device.platform)) errors.push(`${label}: device.platform must be ios or android`);
  else if (!template) {
    for (const field of ['model', 'osVersion', 'locale', 'textScale']) if (placeholder(record.device[field])) errors.push(`${label}: device.${field} is missing or still a placeholder`);
    if (!Array.isArray(record.device.accessibilitySettings)) errors.push(`${label}: device.accessibilitySettings must be an array`);
    if (record.accessibilityEvidence === 'lived-experience' && record.device.accessibilitySettings.length === 0) errors.push(`${label}: lived-experience accessibility evidence needs the actual settings or assistive technology used`);
  }
  if (!nonEmpty(record?.facilitatorId)) errors.push(`${label}: facilitatorId is required`);
  else if (!template && placeholder(record.facilitatorId)) errors.push(`${label}: facilitatorId is still a placeholder`);
  if (!template && placeholder(record?.candidate?.installSource)) errors.push(`${label}: candidate.installSource is still a placeholder`);
  if (!Array.isArray(record?.tasks) || !sameIds(record.tasks.map((task) => task.id), taskIds)) errors.push(`${label}: tasks must contain IDs 1 through 12 exactly once`);
  else record.tasks.forEach((task) => {
    if (typeof task.completed !== 'boolean' || typeof task.assistance !== 'boolean') errors.push(`${label}: task ${task.id} needs boolean completed and assistance fields`);
    if (!(task.seconds === null || (typeof task.seconds === 'number' && task.seconds >= 0))) errors.push(`${label}: task ${task.id} seconds must be null or non-negative`);
    if (!template && (!task.completed || !Number.isFinite(task.seconds))) errors.push(`${label}: task ${task.id} must be completed with a finite recorded duration for the launch gate`);
    if (!Array.isArray(task.errors) || !Number.isInteger(task.confidence) || task.confidence < 1 || task.confidence > 5 || !interpretations.has(task.safetyInterpretation)) errors.push(`${label}: task ${task.id} has invalid observation fields`);
    if (task.id === 4 && (!isObject(task.componentResults) || !['edit', 'delete', 'undo'].every((key) => typeof task.componentResults[key] === 'boolean'))) errors.push(`${label}: task 4 needs edit, delete, and undo component results`);
    if (task.id === 9 && (!isObject(task.componentResults) || !['backup', 'spreadsheetHistory', 'readableSummary'].every((key) => typeof task.componentResults[key] === 'boolean'))) errors.push(`${label}: task 9 needs all three export component results`);
    if (!template && task.id === 4 && !Object.values(task.componentResults).every(Boolean)) errors.push(`${label}: task 4 edit, delete, and undo subchecks must all pass`);
    if (!template && task.id === 9 && !Object.values(task.componentResults).every(Boolean)) errors.push(`${label}: task 9 backup, spreadsheet, and readable-summary subchecks must all pass`);
  });
  if (typeof record?.wouldChooseOlive !== 'boolean' || !Array.isArray(record?.findings)) errors.push(`${label}: choice and findings fields are required`);
  record?.findings?.forEach((finding, index) => {
    if (!['P0', 'P1', 'P2'].includes(finding?.severity) || !['open', 'resolved'].includes(finding?.status) || !nonEmpty(finding?.description) || !nonEmpty(finding?.category)) errors.push(`${label}: finding ${index + 1} needs severity, status, category, and description`);
    if (['P0', 'P1'].includes(finding?.severity) && finding.status === 'resolved' && (!nonEmpty(finding?.issue) || !isObject(finding?.resolution) || finding.resolution.fixCandidateRevision !== record.candidate?.sourceRevision || !['ios', 'android', 'both'].includes(finding.resolution.affectedPlatform) || finding.resolution.retestPassed !== true || placeholder(finding.resolution.retestEvidence))) errors.push(`${label}: resolved P0/P1 finding ${index + 1} needs the tested candidate revision, affected platform, passed retest, and non-placeholder evidence`);
  });
  if (!isObject(record?.cleanup) || typeof record.cleanup.linksRevoked !== 'boolean' || typeof record.cleanup.testDataDeleted !== 'boolean' || typeof record.cleanup.accidentalExternalCall !== 'boolean') errors.push(`${label}: cleanup record is incomplete`);
  return errors;
}

function validateClinical(record, label, template = false) {
  const errors = [];
  if (record?.schemaVersion !== 1) errors.push(`${label}: schemaVersion must be 1`);
  if (!isObject(record?.reviewer)) errors.push(`${label}: reviewer is required`);
  else {
    for (const field of ['id', 'credential', 'jurisdiction', 'practiceContext', 'conflicts', 'reviewDate']) if (!nonEmpty(record.reviewer[field])) errors.push(`${label}: reviewer.${field} is required`);
    if (!['registered-midwife', 'labor-and-delivery-nurse', 'obstetrician', 'family-physician', 'maternity-professional-other'].includes(record.reviewer.credentialType)) errors.push(`${label}: reviewer.credentialType is invalid`);
    if (record.reviewer.independentFromOtherReviewer !== true) errors.push(`${label}: reviewer must be independent`);
    if (!template && placeholder(record.reviewer.id)) errors.push(`${label}: reviewer.id is still a placeholder`);
    if (!template && (!realDate(record.reviewer.reviewDate) || placeholder(record.reviewer.jurisdiction) || placeholder(record.reviewer.practiceContext))) errors.push(`${label}: reviewer context or review date is incomplete`);
  }
  validateCandidate(record?.candidate, label, errors, template);
  if (!isObject(record?.credentialVerification)) errors.push(`${label}: credentialVerification is required`);
  else {
    for (const field of ['restrictedReference', 'checkedDate', 'verifierId']) if (!nonEmpty(record.credentialVerification[field])) errors.push(`${label}: credentialVerification.${field} is required`);
    if (!template && (!record.credentialVerification.separateSubmissionConfirmed || !record.credentialVerification.noSharedAuthorshipConfirmed || !record.credentialVerification.currentRegistrationVerified)) errors.push(`${label}: registration, independent submission, and authorship checks are not confirmed`);
    if (!template && placeholder(record.credentialVerification.restrictedReference)) errors.push(`${label}: credential verification reference is still a placeholder`);
    if (!template && (!realDate(record.credentialVerification.checkedDate) || placeholder(record.credentialVerification.verifierId))) errors.push(`${label}: credential verification date or verifier is invalid`);
  }
  if (!Array.isArray(record?.surfaces) || !sameIds(record.surfaces.map((surface) => surface.id), surfaceIds)) errors.push(`${label}: all 13 review surfaces must appear exactly once`);
  else record.surfaces.forEach((surface) => {
    if (!['approve', 'change', 'remove'].includes(surface.decision) || !['none', 'P0', 'P1', 'P2'].includes(surface.severity)) errors.push(`${label}: ${surface.id} has an invalid decision or severity`);
    if (typeof surface.requiresRenderedRereview !== 'boolean' || typeof surface.rereviewComplete !== 'boolean') errors.push(`${label}: ${surface.id} needs re-review booleans`);
    if (surface.decision !== 'approve' && (!nonEmpty(surface.rationale) || !nonEmpty(surface.replacementWording))) errors.push(`${label}: ${surface.id} change/remove needs rationale and replacement wording`);
    if (!template && surface.decision === 'approve' && surface.severity !== 'none') errors.push(`${label}: ${surface.id} cannot be approved with a safety severity`);
    if (!template && surface.decision !== 'approve' && !nonEmpty(surface.resolutionEvidence)) errors.push(`${label}: ${surface.id} change/remove lacks linked resolution evidence`);
    if (!template && surface.requiresRenderedRereview && (!surface.rereviewComplete || !nonEmpty(surface.resolutionEvidence))) errors.push(`${label}: ${surface.id} required rendered re-review is incomplete`);
    if (!template && ['P0', 'P1'].includes(surface.severity) && surface.decision !== 'approve' && !surface.requiresRenderedRereview) errors.push(`${label}: ${surface.id} P0/P1 change must require rendered re-review`);
  });
  if (!Array.isArray(record?.reviewedItems)) errors.push(`${label}: reviewedItems is required`);
  else {
    record.reviewedItems.forEach((item, index) => {
      if (!surfaceIds.includes(item?.surfaceId) || !nonEmpty(item?.sourcePath) || !nonEmpty(item?.exactText) || !nonEmpty(item?.sourceSha256) || !nonEmpty(item?.renderedArtifactReference) || !nonEmpty(item?.renderedArtifactSha256)) errors.push(`${label}: reviewed item ${index + 1} lacks surface, source, exact text, source hash, or rendered artifact evidence`);
    });
    if (!template) {
      for (const id of surfaceIds) if (!record.reviewedItems.some((item) => item.surfaceId === id)) errors.push(`${label}: reviewedItems has no exact wording evidence for ${id}`);
      for (const [surfaceId, sources] of Object.entries(expectedSources)) for (const source of sources) if (!record.reviewedItems.some((item) => item.surfaceId === surfaceId && item.sourcePath === source)) errors.push(`${label}: ${surfaceId} lacks exact review evidence from ${source}`);
      record.reviewedItems.forEach((item, index) => {
        if (placeholder(item.renderedArtifactReference)) errors.push(`${label}: reviewed item ${index + 1} rendered artifact is still a placeholder`);
      });
    }
  }
  if (!Array.isArray(record?.conflictResolutions)) errors.push(`${label}: conflictResolutions must be an array`);
  else if (!template) record.conflictResolutions.forEach((resolution, index) => {
    if (!surfaceIds.includes(resolution?.surfaceId) || !nonEmpty(resolution?.decisionOwner) || !nonEmpty(resolution?.finalWording) || !nonEmpty(resolution?.rationale) || !nonEmpty(resolution?.linkedDiff) || resolution?.renderedRereviewComplete !== true || !nonEmpty(resolution?.renderedRereviewEvidence)) errors.push(`${label}: conflict resolution ${index + 1} is incomplete`);
  });
  if (!['approve', 'changes-required', 'reject'].includes(record?.overallDisposition)) errors.push(`${label}: overallDisposition is invalid`);
  if (!nonEmpty(record?.signedAttestationReference)) errors.push(`${label}: signedAttestationReference is required`);
  else if (!template && placeholder(record.signedAttestationReference)) errors.push(`${label}: signedAttestationReference is still a placeholder`);
  return errors;
}

async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }

async function verifyClinicalSourceEvidence(record, label, errors) {
  if (!Array.isArray(record?.reviewedItems) || !/^[0-9a-f]{40}$/i.test(record?.candidate?.sourceRevision ?? '')) return;
  for (const [index, item] of record.reviewedItems.entries()) {
    if (!surfaceIds.includes(item?.surfaceId) || !expectedSources[item.surfaceId]?.includes(item.sourcePath)) continue;
    if (!/^[0-9a-f]{64}$/i.test(item.sourceSha256 ?? '')) {
      errors.push(`${label}: reviewed item ${index + 1} needs the candidate source SHA-256`);
      continue;
    }
    let source;
    try {
      source = execFileSync('git', ['show', `${record.candidate.sourceRevision}:${item.sourcePath}`], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    } catch (error) {
      errors.push(`${label}: reviewed item ${index + 1} source is absent from the candidate revision`);
      continue;
    }
    const sourceHash = createHash('sha256').update(source).digest('hex');
    if (sourceHash !== item.sourceSha256) errors.push(`${label}: reviewed item ${index + 1} source hash does not match the candidate revision`);
    if (!source.includes(item.exactText)) errors.push(`${label}: reviewed item ${index + 1} exact text is not present in the candidate source`);
    if (item.sourcePath === 'src/lib/i18n.ts') {
      if (!nonEmpty(item.messageId)) errors.push(`${label}: reviewed item ${index + 1} from the message catalog needs a messageId`);
      else if (!source.includes(`'${item.messageId}'`) && !source.includes(`"${item.messageId}"`)) errors.push(`${label}: reviewed item ${index + 1} messageId is absent from the candidate catalog`);
    }
    if (!/^[0-9a-f]{64}$/i.test(item.renderedArtifactSha256 ?? '')) {
      errors.push(`${label}: reviewed item ${index + 1} needs a rendered artifact SHA-256`);
      continue;
    }
    const renderedPath = path.resolve(root, item.renderedArtifactReference);
    if (!(renderedPath.startsWith(`${root}${path.sep}`))) {
      errors.push(`${label}: reviewed item ${index + 1} rendered artifact must resolve inside the repository`);
      continue;
    }
    try {
      const rendered = await readFile(renderedPath);
      if (createHash('sha256').update(rendered).digest('hex') !== item.renderedArtifactSha256) errors.push(`${label}: reviewed item ${index + 1} rendered artifact hash does not match`);
    } catch (error) {
      errors.push(`${label}: reviewed item ${index + 1} rendered artifact cannot be verified (${error.message})`);
    }
  }
}

async function verifyReleaseEvidence(candidate, label, errors) {
  const evidencePath = path.resolve(root, candidate.releaseEvidenceId);
  if (!(evidencePath === root || evidencePath.startsWith(`${root}${path.sep}`))) return errors.push(`${label}: releaseEvidenceId must resolve inside the repository`);
  try {
    const evidence = await readJson(evidencePath);
    if (evidence?.schema !== 'olive-release-evidence-v2' || evidence?.source?.clean !== true) errors.push(`${label}: release evidence is not a clean Olive v2 record`);
    if (evidence?.attestations?.internalTrackArtifactHashMatchedSeparately !== true) errors.push(`${label}: release artifact has not been independently matched to the installed internal-track binary`);
    if (evidence?.source?.revision !== candidate.sourceRevision || evidence?.app?.version !== candidate.version || String(evidence?.app?.build) !== String(candidate.build)) errors.push(`${label}: candidate revision/version/build does not match release evidence`);
    const iosBuild = evidence?.app?.nativeBuilds?.ios;
    const androidBuild = evidence?.app?.nativeBuilds?.android;
    if (String(iosBuild?.currentProjectVersion) !== String(candidate.iosBuild) || iosBuild?.marketingVersion !== candidate.version) errors.push(`${label}: iOS native version/build does not match the tested candidate`);
    if (String(androidBuild?.versionCode) !== String(candidate.androidBuild) || androidBuild?.versionName !== candidate.version) errors.push(`${label}: Android native version/build does not match the tested candidate`);
    try { execFileSync('git', ['cat-file', '-e', `${candidate.sourceRevision}^{commit}`], { cwd: root, stdio: 'ignore' }); } catch { errors.push(`${label}: source revision is not a commit in this repository`); }
    for (const [platform, platformKey, artifactHash] of [['iOS', 'ios', candidate.iosArtifactSha256], ['Android', 'android', candidate.androidArtifactSha256]]) {
      const artifact = evidence?.artifacts?.find((item) => item.platform === platformKey && item.sha256 === artifactHash);
      if (!artifact) {
        errors.push(`${label}: ${platform} candidate artifact hash is absent from release evidence`);
        continue;
      }
      try {
        const bytes = await readFile(artifact.path);
        const actualHash = createHash('sha256').update(bytes).digest('hex');
        if (actualHash !== artifact.sha256 || bytes.byteLength !== artifact.bytes) errors.push(`${label}: ${platform} release artifact bytes no longer match the evidence record`);
      } catch (error) { errors.push(`${label}: cannot verify ${platform} release artifact (${error.message})`); }
    }
  } catch (error) { errors.push(`${label}: cannot read release evidence (${error.message})`); }
}
async function readJsonDirectory(directory) {
  try {
    const files = (await readdir(directory)).filter((file) => file.endsWith('.json')).sort();
    return Promise.all(files.map(async (file) => ({ label: path.join(directory, file), record: await readJson(path.join(directory, file)) })));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}
const ratio = (records, predicate) => records.length ? records.filter(predicate).length / records.length : 0;

async function checkTemplates() {
  const user = await readJson(userTemplatePath);
  const clinical = await readJson(clinicalTemplatePath);
  const errors = [...validateUser(user, 'user-session template', true), ...validateClinical(clinical, 'clinical-review template', true)];
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('PASS validation templates: user session and clinical review contracts are structurally valid.');
}

async function evaluate() {
  const userDirectory = path.resolve(process.env.OLIVE_USER_EVIDENCE_DIR || path.join(root, 'validation/evidence/user'));
  const clinicalDirectory = path.resolve(process.env.OLIVE_CLINICAL_EVIDENCE_DIR || path.join(root, 'validation/evidence/clinical'));
  const users = await readJsonDirectory(userDirectory);
  const clinicians = await readJsonDirectory(clinicalDirectory);
  const errors = [];
  if (!users.length) errors.push(`No real user-session JSON records found in ${userDirectory}`);
  if (!clinicians.length) errors.push(`No independent clinical-review JSON records found in ${clinicalDirectory}`);
  users.forEach(({ record, label }) => errors.push(...validateUser(record, label)));
  clinicians.forEach(({ record, label }) => errors.push(...validateClinical(record, label)));
  await Promise.all(clinicians.map(({ record, label }) => verifyClinicalSourceEvidence(record, label, errors)));
  await Promise.all([...users, ...clinicians].filter(({ record }) => isObject(record?.candidate) && nonEmpty(record.candidate.releaseEvidenceId) && !placeholder(record.candidate.releaseEvidenceId)).map(({ record, label }) => verifyReleaseEvidence(record.candidate, label, errors)));
  if (!errors.length) {
    const count = (group) => users.filter(({ record }) => record.groups.includes(group)).length;
    const thirdTrimester = users.filter(({ record }) => record.groups.some((group) => group.startsWith('third-trimester-'))).length;
    if (users.length < 16) errors.push('User sample needs at least 16 unique participants across non-overlapping primary cohorts.');
    if (new Set(users.map(({ record }) => record.participantId)).size !== users.length) errors.push('User evidence contains duplicate participant IDs.');
    const allCandidates = [...users, ...clinicians].map(({ record }) => candidateIdentity(record.candidate));
    if (new Set(allCandidates).size !== 1) errors.push('All user and clinical evidence must reference the identical release candidate.');
    if (thirdTrimester < 10 || count('third-trimester-first-pregnancy') < 1 || count('third-trimester-subsequent-pregnancy') < 1) errors.push('User sample needs 10 third-trimester participants, including first and subsequent pregnancies.');
    if (count('partner-or-doula') < 3) errors.push('User sample needs at least 3 partners or doulas.');
    if (count('labored-within-previous-year') < 3) errors.push('User sample needs at least 3 people who labored within the previous year.');
    const accessibilityGroups = ['low-vision', 'large-text', 'reduced-motor', 'reduced-motion'];
    for (const group of accessibilityGroups) if (!users.some(({ record }) => record.groups.includes(group) && record.accessibilityEvidence === 'lived-experience')) errors.push(`User sample needs at least one lived-experience ${group} run; simulated settings do not satisfy this gate.`);
    const accessibilityParticipants = new Set(users.filter(({ record }) => record.accessibilityEvidence === 'lived-experience' && record.groups.some((group) => accessibilityGroups.includes(group))).map(({ record }) => record.participantId));
    if (accessibilityParticipants.size < 4) errors.push('Accessibility evidence needs at least four distinct lived-experience participants; one person cannot satisfy every category gate.');
    for (const platform of ['ios', 'android']) if (!users.some(({ record }) => record.device.platform === platform)) errors.push(`User evidence needs at least one ${platform} session.`);
    const task = (record, id) => record.tasks.find((item) => item.id === id);
    if (ratio(users, ({ record }) => { const result = task(record, 1); return result.completed && Number.isFinite(result.seconds) && result.seconds <= 10 && !result.assistance; }) < 0.7) errors.push('Task 1 threshold failed: 70% must complete within 10 seconds without help.');
    if (ratio(users, ({ record }) => { const result = task(record, 3); return result.completed && !result.assistance; }) < 0.8) errors.push('Task 3 threshold failed: 80% must correct a missed or late tap without help.');
    if (ratio(users, ({ record }) => { const result = task(record, 5); return result.completed && Number.isFinite(result.seconds) && result.seconds <= 10 && !result.assistance; }) < 0.8) errors.push('Task 5 threshold failed: 80% must find the saved care-team call action within 10 seconds without help.');
    if (users.some(({ record }) => record.tasks.some((item) => item.safetyInterpretation !== 'none'))) errors.push('Safety threshold failed: at least one participant inferred diagnosis, reassurance, travel direction, or another unsafe meaning.');
    if (ratio(users, ({ record }) => record.wouldChooseOlive) < 0.8) errors.push('Choice threshold failed: fewer than 80% would choose Olive.');
    if (users.some(({ record }) => record.findings.some((finding) => ['P0', 'P1'].includes(finding.severity) && finding.status !== 'resolved'))) errors.push('At least one P0/P1 user finding remains open.');
    if (users.some(({ record }) => !record.cleanup.linksRevoked || !record.cleanup.testDataDeleted || record.cleanup.accidentalExternalCall)) errors.push('A user session has incomplete cleanup or an accidental external call.');
    if (clinicians.length < 2 || new Set(clinicians.map(({ record }) => record.reviewer.id)).size < 2) errors.push('Clinical evidence needs two distinct independent reviewers.');
    if (!clinicians.some(({ record }) => ['registered-midwife', 'labor-and-delivery-nurse'].includes(record.reviewer.credentialType) && record.credentialVerification.currentRegistrationVerified)) errors.push('At least one reviewer must be a verified, currently registered midwife or labor-and-delivery nurse.');
    const candidateKeys = new Set(clinicians.map(({ record }) => candidateIdentity(record.candidate)));
    if (candidateKeys.size !== 1) errors.push('Clinical reviewers did not assess the identical candidate.');
    if (clinicians.some(({ record }) => record.overallDisposition !== 'approve')) errors.push('Every clinical reviewer must record an approve disposition after required changes are resolved.');
    for (const surfaceId of surfaceIds) {
      const judgments = new Set(clinicians.map(({ record }) => { const surface = record.surfaces.find((item) => item.id === surfaceId); return JSON.stringify({ decision: surface.decision, replacementWording: surface.replacementWording }); }));
      if (judgments.size > 1 && !clinicians.some(({ record }) => record.conflictResolutions.some((resolution) => resolution.surfaceId === surfaceId))) errors.push(`Conflicting clinical judgments for ${surfaceId} lack a documented resolution.`);
    }
    const hospitalMessageIds = [...(await readFile(path.join(root, 'src/lib/i18n.ts'), 'utf8')).matchAll(/'((?:hospital)\.[^']+)'\s*:/g)].map((match) => match[1]);
    clinicians.forEach(({ record, label }) => {
      const reviewedIds = new Set(record.reviewedItems.filter((item) => item.surfaceId === 'hospital-exams').map((item) => item.messageId));
      for (const id of hospitalMessageIds) if (!reviewedIds.has(id)) errors.push(`${label}: hospital message ${id} lacks exact review evidence`);
    });
  }
  console.log(`User sessions: ${users.length}; independent clinical reviews: ${clinicians.length}`);
  if (errors.length) {
    for (const error of errors) console.error(`FAIL ${error}`);
    process.exitCode = 1;
  } else console.log('PASS real-user and independent-clinical evidence gates for the matched internal-track candidate.');
}

try {
  if (process.argv.includes('--check-templates')) await checkTemplates();
  else await evaluate();
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
}
