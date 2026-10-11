# Olive: pregnancy, birth, recovery, and the Lull handoff

Research and implementation checkpoint: October 11, 2026. Cameron requested support from discovering pregnancy through birth, with Lull for baby sleep and diapers afterward. This expands the previous final-weeks positioning. This document governs that expansion; `SHIPPING-COMPLETION-PLAN.md` continues to govern the existing release. New work is a separate candidate, not a change to uploaded build 16.

## Product decision

Olive helps the parent prepare, remember, communicate, and get practical support. Lull helps caregivers record the baby's sleep, feeds, and diapers. Olive remains useful for the parent's recovery after birth. The transition should feel like continued support, not abandonment or mandatory migration.

The strongest opportunity is a private, practical answer to “What do I need to remember or arrange next?” We should not try to beat mature pregnancy apps by adding a larger article feed, fetus illustrations, or more tracking categories. Those are established competitor capabilities. Useful local records, gentle organization, and a reliable birth-day experience are a more credible focus.

Primary early segment: a person newly pregnant who wants to prepare for care conversations without building a spreadsheet or entering a large health profile. The app must also support experienced parents, unknown due dates, changing plans, planned caesareans, pregnancy loss, single parents, and chosen support people. No assumption that a partner, a term birth, or a vaginal birth is present.

## Evidence and its limits

This is desk research and a source audit, not interviews with Olive users. Study results inform hypotheses; they do not establish Olive retention, clinical effectiveness, or market demand. App reviews are selected anecdotes, not representative complaint rates. Country-specific care schedules must not become universal app instructions. Source summaries below are intentionally brief; linked originals remain authoritative.

| Evidence | Finding relevant to Olive | Implication and limitation |
| --- | --- | --- |
| [BrightSelf qualitative design study, 2018](https://mental.jmir.org/2018/4/e10007/) | Design sessions with 38 participants identified anxiety around discovering pregnancy and waiting for the first care appointment. | Offer a practical first-care starting point and a place for questions. Older UK qualitative evidence, not a prevalence estimate or proof that an app reduces anxiety. |
| [Maternal journey adoption study, 2024](https://humanfactors.jmir.org/2024/1/e59269) | Interviews with 44 women highlighted usefulness, credibility, ease of use, and burdens from setup and multiple apps. | Require little setup and make the Olive/Lull boundary clear. A Singapore study; test the two-app experience with our own users. |
| [Perinatal navigator pilot, 2026](https://www.jmir.org/2026/1/e88015) | The short German high-risk-pregnancy pilot identified orientation and information-overload problems; authors distinguish information access from actually using services. | Connect information to an action such as saving a contact or an appointment. Short exposure, selective sample, and no long-term outcome proof. |
| [Maternal/infant app review analysis, 2021](https://www.jmir.org/2021/9/e27403/) | Analyzed 2,422 reviews; functionality, technical reliability, and content were prominent themes. Its review dataset ended in 2018. | Reliability and recovery are features. Use as historical context, not a current competitor ranking. |
| [Perinatal mental-health acceptability study, 2023](https://formative.jmir.org/2023/1/e44500/) | Discussions with 20 women and interviews with 8 providers raised customization and privacy concerns. | Optional personal notes and controllable reminders; avoid default screening scores or automatic partner disclosure. Acceptability does not prove treatment efficacy. |
| [NHS first pregnancy steps](https://www.nhs.uk/pregnancy/finding-out/what-to-do-when-you-find-out-you-are-pregnant/) | Early access to pregnancy care and discussing existing conditions or medicines are practical first steps. | Provider conversation prompts, not medicine recommendations. NHS referral details apply to the UK. |
| [PHAC healthy pregnancy guide](https://www.canada.ca/en/public-health/services/health-promotion/healthy-pregnancy/healthy-pregnancy-guide.html) | Authoritative Canadian general pregnancy information. | Link a credible starting resource and keep the person's own care instructions distinct. No copied generic prescription or schedule. |
| [NHS birth-plan guidance](https://www.nhs.uk/best-start-in-life/pregnancy/preparing-for-labour-and-birth/what-to-include-in-your-birth-plan/) | Preferences include support people and choices when birth circumstances change. | A short, editable preferences brief with a contingency section, rather than a promise that a plan will happen. |
| [ACOG postpartum care guidance](https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2018/05/optimizing-postpartum-care) | Postpartum care is an ongoing process covering physical, psychological, and social needs. | Retain parent recovery, support, and appointments in Olive; Lull baby logs do not replace them. US guidance, not a globally generated appointment schedule. |
| [PHAC postpartum care](https://www.canada.ca/en/public-health/services/publications/healthy-living/maternity-newborn-care-guidelines-chapter-5.html) | Family-centred postpartum care includes continuing support and recovery. | Practical support planning and continuity with professionals, not only baby tracking. |
| [CDC urgent maternal warning signs](https://www.cdc.gov/hearher/maternal-warning-signs/index.html) | Serious warning signs can occur during pregnancy and the year after delivery. | Reviewed urgent-help content must remain accessible after the 12-week planning window. A checklist must never give an all-clear or require logging before contacting care. |

## Competitor comparison

Reviewed official product descriptions and selected store reviews on October 11. These are capability comparisons, not hands-on usability tests. Exact regional prices were not sampled; no pricing decision is implied.

| Product / alternative | Current advertised strengths | Olive opportunity |
| --- | --- | --- |
| [Pregnancy+](https://info.philips-digital.com/TermsOfUse?country=US&locale=en) | Educational content; premium preparation tools including birth plan, packing checklist, and contraction timer. | Preparation tools alone are not differentiating. Focus on fewer steps, offline records, and calm transitions. |
| [Pregnancy+ store review](https://apps.apple.com/us/app/pregnancy-tracker-app/id505864483) | A January 2025 review and developer response describe difficulty starting a new pregnancy after loss while preserving history. | A strong design signal for pause/archive/new-journey flows. It does not establish current frequency or that the same limitation persists today. |
| [Ovia](https://apps.apple.com/us/app/ovia-cycle-pregnancy-tracker/id570244389) | Broad reproductive-life coverage and detailed tracking and pregnancy content. | Avoid competing on number of data fields. Make a visit brief and practical next action easier to use. |
| [Flo](https://flo.health/privacy-portal/faq) | Pregnancy and other health tracking; optional identification and Anonymous Mode. | Explain exactly what stays local and what is shared. Privacy is a baseline expectation, not an unsupported claim that competitors lack it. |
| [BabyCenter](https://play.google.com/store/apps/details?hl=en&id=com.babycenter.pregnancytracker) | Free pregnancy information and continuing baby-development tools after birth. | Our separate apps must earn their transition through clear roles and minimal repeated setup. |
| [Huckleberry](https://huckleberrycare.com/product/tracking) and [official free-tier support](https://huckleberry.zendesk.com/hc/en-us/articles/1500007701041-Is-the-app-free) | Core baby tracking includes sleep, feeding, diapers, and caregiver coordination; enhanced guidance is a separate tier. | Lull must provide trustworthy, quick baby logging and clear access rules. Do not add competing baby logs to Olive. |
| Notes, calendar, messages, and paper | Already familiar; quick to start and easy to show someone. | Beat these on finding the right information and preparing a factual visit brief, not feature count. |

## What is actually implemented

Olive source audited at the existing `d7da943` base: one private journey document; manually selected preparing/labor/postpartum/archived phases; optional due date and care details; provider questions with editing; responsibilities; dated timeline entries; hospital bag; contacts; exams; contraction timing; backups and factual sharing. The main screen remains timer-first. It does not implement a first-trimester home, week-by-week educational programme, pregnancy symptom interpretation, multiple pregnancy archives, or cross-app data transfer.

Lull main inspected at `1af708f2617a269ca369d61b15e85d48500debad`: baby profile, sleep-start/end, feed and diaper events, local care storage, optional caregiver sync, backups, and guided sleep content. `Setup.tsx` preselects a birth date 28 days before today. That remote-main observation is historical: the current local `design/quiet-quilt-app` branch at `b791e9e76e8f016952b204fe75af0e837ac375ca` already replaces that setup with `BabyProfileForm`, starts new birth dates blank, rejects missing/invalid/future dates, and preserves an existing confirmed date. Its two targeted profile tests passed October 11. Main/released reconciliation remains separate. For a seamless newborn handoff, birth date should be explicitly chosen or confirmed, never guessed. No Olive handoff import is present in the inspected setup/configuration. Sleep guidance readiness requires its own current validation; an implemented algorithm is not proof of prediction quality.

`https://lull.ashbi.ca` returned HTTP 200 and a Lull-titled HTML shell on October 11. This establishes the link destination, not installed-app availability, login, paid access, clinical suitability, or end-to-end functionality. Existing native test and professional review gates remain open unless separately verified.

## Journey and feature design

| Stage | Main job / pain | Experience to build |
| --- | --- | --- |
| Just discovered pregnancy | “Where do I start? What should I ask?” | Optional pregnancy setup, first care contact, appointment organizer, and selectable conversation prompts. Neutral welcome; no required due date or congratulations. |
| During pregnancy | Information and practical tasks become scattered. | Today shows the next user-entered appointment, pinned questions, and one chosen responsibility. A small source-labelled learning card is optional. No automatic clinical care schedule. |
| Preparing for birth | Preferences, packing, transport, and responsibilities are in separate places. | Short birth-preferences brief; saved location/contact; editable packing/support lists; a contingency section for induction or caesarean discussions. No medical recommendations. |
| Birth day | Reduced attention and interruptions make navigation costly. | Start/Stop first; saved care contact, factual timing share, and practical support close by. Pregnancy content and keepsakes remain secondary. |
| Recovery | The baby becomes the focus while the parent's needs get lost. | Own appointments, questions, recovery notes, food/visit/rest support, and optional private feelings notes. No recovery score, streak, or medical all-clear. |
| Baby care in Lull | “When was the last feed, diaper, or sleep?” | A clear optional handoff; factual logs and caregiver continuity in Lull. The parent can return to Olive anytime. |
| Pause, loss, or another pregnancy | Continuing countdowns can hurt; resetting can erase valued records. | Immediately pause pregnancy prompts without explaining why. Preserve/export a record, archive it, and start a separate new journey deliberately. Do not assume loss or infer it from dates. |

Navigation target: **Today / Prepare / Birth / My record**. Before birth, Today carries appointments/questions/support; Birth is always accessible. During active timing, the timer overrides any other view and Stop remains reachable. After birth, Today supports recovery and offers Lull, while all birth records remain available. First slice below stays within the existing sheet; the wider home redesign still requires implementation and rendered review.

## Prioritized execution and acceptance

Effort bands are comparative: small = bounded component, medium = multi-component flow, large = migration or cross-repository/native work. They are not schedule commitments.

| Priority / item | Status | Acceptance and dependencies |
| --- | --- | --- |
| P0: first-care pregnancy planner | Implemented and host-verified locally; evidence below | Works without due date/account/network; opens existing appointment, care, and question tools; chosen questions persist once; failed writes retain the prompt; no automatic care advice. Small. |
| P0: optional Lull website handoff | Implemented and host-verified locally; evidence below | Appears only in manually chosen postpartum view; destination is clearly a website; no health data in URL; no transfer or installation claim; parent recovery stays available. Small. |
| P0: pause and separate pregnancy records | Planned | Silence prompts immediately; archive/export before new record; migration preserves existing journey and timing associations; cancel never deletes. Requires a versioned multi-journey design and backup migration. Large, data-loss risk. |
| P0: professional and real-user validation | Existing release gates, not complete | Two independent maternity-professional copy reviews; observed parent tasks including early pregnancy, birth, recovery, changed plans, accessibility. Do not invent participant results or contact recruits without authorization. |
| P1: stage-appropriate Today home | Implemented locally; host verification recorded below | Optional entry stage, unknown date supported; no automatic pregnancy-status change; at most three next actions; active Stop overrides layout; day/night and large text tested. Medium. |
| P1: appointment preparation and factual visit share | Foundation exists; enhancement planned | Link questions and notes to chosen appointment, edit/reschedule, choose included fields, review system-share text. No PDF revival; no automatic contact or sharing. Medium. |
| P1: birth preferences brief | Planned | Optional prompts, skipped fields stay absent; user-entered wishes distinct from professional instructions; change-plan section; concise reviewed text share. Medium; professional copy review. |
| P1: practical support templates | Foundation exists; templates planned | User chooses meal/transport/visit/household/rest tasks, can edit/delete/assign; no silent sharing; no completion percentage suggesting readiness. Small/medium. |
| P1: postpartum parent support | Foundation exists; enhancement planned | Optional private notes, next follow-up, support tasks; reminder opt-in and quiet hours; urgent-help route independent of 12-week window. No clinical screening without a separately governed design. Medium. |
| P1: Lull newborn setup correction | Existing local fix verified with 2 profile tests; remote main/release not reconciled | Require valid actual birth date or explicit unknown-date mode; no 4-week default used for advice. Test cancellation, offline setup, neonatal age boundaries, and restored records. Medium; Lull owner coordinates. |
| P2: reviewed stage learning cards | Planned | Original concise content, citations, country scope, reviewer/date/version; disable without losing tools; cached essentials offline. Do not prescribe screening/supplements or diagnose symptoms. Medium plus ongoing editorial ownership. |
| P2: consented Olive-to-Lull setup | Planned; website link is the current first step | Preview only baby nickname and confirmed birth date; explicit selection and local validated import; deduplication and rollback; existing Lull child never overwritten; no private parent notes transferred. Native links/share-file support must be implemented in both repositories and device-tested. Large. |

Defer fetal-growth animation, diagnostic chat, symptom scoring, fetal movement reassurance, wearable work, public community, broad shopping lists, and automatic medical schedules. They add clinical/editorial/operational burden before the core continuity flow is validated. A movement logger must never reassure someone concerned about movement; any future proposal needs separate professional review.

## Cross-app handoff contract

Phase 1: optional website link, no transferred data. Lull may require its own setup and has independent access rules. Never imply that an Olive purchase includes Lull paid features or that both apps share an account.

Phase 2 proposed: a versioned local setup envelope, previewed and explicitly shared/imported by the parent. Allowed fields: optional baby nickname and explicitly confirmed birth date. No contraction history, pregnancy loss state, parent recovery/mood notes, medication questions, contacts, billing credentials, or device identifiers. Store only enough import metadata to prevent accidental duplication. Validate source, schema, length, and date; do not evaluate executable content. Avoid personal data in query strings, URL fragments, analytics, or clipboard by default.

Lull should provide “Return to Olive for your recovery plan” after a verified link route exists. Declining either app leaves the original records intact. Shared caregivers require separate explicit permissions; pregnancy status is never automatically relayed.

## Validation protocol and decision rules

First observe 8–12 consenting people across early pregnancy, late preparation, recent postpartum, and support-person roles, with both first-time and experienced parents and varied digital comfort. Include a voluntary, sensitively facilitated changed/loss-journey task using fabricated data; nobody must disclose lived loss. Aim for at least two independent maternity-professional reviewers. These are proposed recruitment targets, not statistical outcome claims.

Tasks: find what to do after discovering pregnancy; save a first appointment and two questions; update a date without changing phase; find a care contact; time/stop with interruptions; share only selected information; pause without deleting; recover a backup; find parent recovery after opening Lull. Test iOS/Android, offline, large text, screen reader, one-handed use, and midnight/timezone boundaries where relevant.

Provisional acceptance targets: at least 80% unassisted completion of the first appointment/question task; first useful saved item within two minutes; no observed irreversible data loss or surprise sharing; all participants can distinguish Olive from Lull; no participant interprets a progress indicator as clinical reassurance. Small-sample targets are iteration gates, not marketing claims. Pause or redesign any misleading health interpretation even if task scores pass.

Measure voluntary adoption of appointment/questions/support features and task success, not daily streaks. Tracking frequency should reflect usefulness, not pressure. Any production analytics proposal requires a separate privacy decision; this round adds no telemetry. Real interview consent and outreach remain separate from implementing the app.

## Current implementation checkpoint

Local candidate adds a Pregnancy planner entry under Preparing, provider-contact and optional-details paths, upcoming user-entered appointment display, selectable deduplicated starter questions, a pregnancy context for the existing dated timeline, and a postpartum Lull website link that sends no Olive data. No new schema, cloud service, notification schedule, purchase flow, or native handoff was added. Lull was read-only audited.

Verification completed October 11: lint, TypeScript, and production build passed; 49 unit tests passed; 27 targeted Chromium mobile browser tests passed in the final combined run. Coverage includes chosen-question persistence/deduplication, rejected writes, appointment persistence and next-visit display, provider-contact persistence, offline interaction and saving in an already-open app, 320px overflow checks, existing editing/undo/backup journeys, and postpartum-only Lull link scope. Browser reopening was performed online; this is not proof of native offline startup. Phone-sized screenshots were inspected. WebKit and physical iOS/Android checks were not run for this increment; native installation, maternity-professional review, and store upload remain separate.

Next increment after verification: pause/archive and separate-pregnancy record design. The current Archived home only quiets the entry screen; it does not create separate pregnancy records or pause all reminders. Preserve the uploaded build 16 and the previous help/date improvements; freeze a new candidate only after its added journeys are independently checked.


### Stage-based home verification, October 11

- Preparing home opens pregnancy planner, appointments/notes, and provider questions directly; no due date is required. Postpartum home opens recovery, questions, and support/baby-care routes. Archived home offers saved records. These use existing tools and storage, not a new pregnancy migration.
- Active timing, manually chosen Labor, or timing within the last hour retain the dominant timer. Starting never silently changes the saved stage. A compact, labelled contraction timer remains available from other stages.
- `npm run verify` passed (lint, types, production build); 49 unit checks passed. 29 journey/planner/care browser checks and 11 timing/text/home browser checks passed; the final home layout passed all 3 dedicated checks again after its label/layout adjustment. These suites overlap; do not sum them as distinct coverage.
- Rendered screenshots inspected at 320 pixels in the default appearance and 375 pixels with Daylight and Big text. The 200% text settings/manual-entry regression passed. Verified direct-tool focus return, explicit phase persistence, active Stop, and open-app offline interaction. No physical-device, fresh native build, clinical-copy approval, or store acceptance is claimed.
- Lull's existing local birth-date form passed its two targeted profile tests. No Lull code was changed or published in this increment.
- Evidence: task workspace `outputs/pregnancy-journey-research-2026-10-11/today-home/`. Local changes are separate from the previously uploaded Olive build 16. Native packaging is currently constrained by very low available disk space.
