# Olive UX and Apple review — October 8

Current review source: `13017b17d7191f29238706af51b0cc24775150de`, locally committed after uploaded build 13. This change is not in build 13 and has not been published or native-tested.

Fixed: private backup cancellation/fallback, explicit full-backup scope, modal background isolation and Safari opener restoration, damaged retired reminder startup state, immediate Stop summary counts and the crash-screen support route. Lint/typecheck/web build, 37 unit tests and 82 affected Chromium/WebKit tests passed; zero skipped. Metadata/offline asset checks passed; asset dimensions remain distinct from accurate final screenshots.

Required public support/privacy briefly returned 503. Read-only inspection found missing Olive static container and proxy route with reviewed HTML intact. Restored only that service and a separate watched proxy route under earlier deployment authorization. HTTPS bodies now return 200 and match source. Backup: `/var/backups/olive-static-restore-20261008T192919Z`. Neither DNS/firewall nor other existing proxy files/services were changed.

Full fresh screenshot report: task `outputs/approval-ux-review-2026-10-08/review.html`; detailed findings, hashes, verification and rollback are in the same directory. Browser screenshots are not native listing images or proof of physical accessibility.

Release sequence: finish build-13 processing/beta verification after owner sign-in; gather exact-candidate physical iPhone/iPad/assistive/share/recovery evidence and repository professional/observed-user acceptance; publish/verify corrected source CI; consolidate a fresh signed binary; refresh affected native listing images; complete owner/store declarations; then submit public review. The existing Android key/Google verification remain separate. No public review acceptance is claimed.

Apple source: https://developer.apple.com/app-store/review/guidelines/ (reviewed October 8). Relevant sections are 1.4.1, 2.1, 2.3, 4.2/4.3 and 5.1. Professional studies are repository gates, not prescribed Apple questionnaires. Features and local pass results do not guarantee Apple approval.
