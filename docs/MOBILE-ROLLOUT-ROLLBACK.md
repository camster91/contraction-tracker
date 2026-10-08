> Historical review or plan. Use [RELEASE-PLAN.md](RELEASE-PLAN.md) for current v1.3.0 gates; this record is not current signed-binary, console, or launch evidence.

# Olive mobile rollout and rollback runbook

Status: required procedure for internal testing and any later public rollout. This document does not authorize an upload, release, or production change.

## Release identity

Before any upload, record all of the following in one `olive-release-evidence-v2` file:

- clean Git source revision;
- Olive marketing version and iOS/Android build numbers;
- IPA and AAB SHA-256 hashes;
- embedded `olive-build-provenance.json` from each artifact;
- identical embedded web-payload SHA-256 across IPA and AAB;
- iOS signing/team identity and Android upload-certificate SHA-256;
- service-worker cache identity and production relay URL;
- approval owner, approved destination, and approval timestamp.

If any uploaded artifact differs from that evidence, stop. Generate new evidence for the actual bytes; never amend hashes to make an old approval appear applicable.

## Internal rollout

1. Obtain explicit approval for the exact IPA/AAB hashes and internal destination.
2. Upload only to TestFlight internal testing and Play internal testing.
3. Install the store-delivered build on the physical-device matrix; do not rely on a locally installed archive.
4. Verify first launch, upgrade with existing records, offline cold launch, start/stop recovery, background/lock/call interruption, reboot, notification/Live Activity permission denial, export, deletion, share revocation, expiry, and support/privacy links.
5. Attach device/OS, install source, result, logs, and artifact evidence to the validation record.
6. Keep public availability disabled until the paid-launch gate is complete and separately approved.

## Stop conditions

Stop distribution and investigate if any tester observes:

- lost, duplicated, cross-session, or impossible contraction records;
- a stopped timer continuing on the lock screen, or an active timer becoming unrecoverable;
- revoked or expired shared information remaining visible;
- a safety message implying diagnosis, reassurance, or permission to delay care;
- backup import partially replacing existing data;
- deletion claiming success while recoverable Olive data remains;
- crashes, blank startup, inaccessible primary controls, or support/privacy destinations failing;
- artifact identity, signer, relay URL, or embedded provenance differing from the approved evidence.

## Rollback and containment

Mobile binaries already installed on devices cannot be remotely replaced instantly. Rollback therefore means containment plus a verified replacement:

1. Pause the affected TestFlight/Play track or public rollout and record the time, version, build, artifact hashes, and reason.
2. If sharing is implicated, disable only the affected relay capability or route when a tested reversible containment exists; preserve timer/export/deletion access.
3. Select the most recent known-good source and artifact evidence. Never reuse an older binary whose current store-policy compatibility or relay contract has not been rechecked.
4. Increment the native build number, rebuild from a clean revision, rerun `verify:release-candidate`, generate new release evidence, and repeat internal physical-device validation.
5. Obtain explicit approval for the replacement upload and affected track.
6. Provide customer communication only after separate approval; never instruct a pregnant user to rely on Olive while a timer, safety, privacy, or data-integrity defect is unresolved.

## Public staged rollout

Public release remains unavailable until every item in `PAID-LAUNCH-GATE.md` is satisfied. If approved later, begin with the smallest store-supported staged cohort, monitor crash/startup, relay error and latency, support, deletion, and data-integrity signals, and expand only after the predefined observation window has no stop-condition event. Any expansion is a new external-state action requiring approval.

## Evidence closure

A rollout is complete only when the store-delivered artifact hashes/build identities match the approved evidence, the physical-device matrix passes, monitoring is recorded, and the accountable owner signs the post-release verification. “Upload succeeded” and “processing completed” are not release verification.
