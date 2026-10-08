> Historical review or plan. Use [RELEASE-PLAN.md](RELEASE-PLAN.md) for current v1.3.0 gates; this record is not current signed-binary, console, or launch evidence.

# Olive public endpoint review

Status: no-go for public store submission until the reviewed artifacts are deployed and reverified.

Evidence captured: 2026-09-01T10:43:27Z

## Declared store destinations

- Support: `https://contractions.ashbi.ca/support`
- Privacy: `https://contractions.ashbi.ca/privacy`

These URLs match the App Store, Play Store, shipping, and submission packets.

## Current production evidence

`npm run check:public-endpoints` currently fails:

- `/support` returns HTTP 404 and therefore exposes no support mailbox, urgent-health boundary, or reviewed deletion guidance.
- `/privacy` returns HTTP 200, but its HTML differs from the reviewed repository artifact.
- The live privacy page is missing the September 1, 2026 policy date, legacy attachment boundary, shared-photo preview disclosure, and other current rights/export details.

This is direct HTTPS evidence, not an inference from repository state. The store support/privacy gate remains unchecked.

## Reviewed deployment artifacts

- `public/support/index.html` SHA-256: `fa6e93c6e1d9b15fb503c8b12eb8810ba5dffee9c4e28bd5c52cefe95b795aa4`
- `public/privacy/index.html` SHA-256: `abded1bf08a6c1a5f86d0ac51083f97b77a5a08a7a3415289b02c54af5371c31`

Local verification proves both pages return HTTP 200 from the production build, include the intended content, and pass focused automated WCAG A/AA checks. It does not prove production publication or email delivery.

## Required closeout

1. Obtain explicit approval for the exact client artifact and production deployment.
2. Deploy the coordinated approved client revision using the documented rollback-capable workflow.
3. Run `npm run check:public-endpoints` until it passes exact normalized HTML parity.
4. Send a real message through the published `mailto:` destination and record receipt, ownership, and the response workflow without including medical data.
5. Reconcile the live policy and support pages with the exact signed store candidates before submission.

Do not mark the support gate complete merely because the files exist in the repository or native payload.
