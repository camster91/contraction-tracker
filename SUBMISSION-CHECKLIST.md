# Olive v1.3.0 — Submission Checklist

**Prepared for the v1.3.0 private-by-default, native-only release. Store review timing is controlled by Apple and Google.**

Total work: **~1.5 hours** spread over 2 days.

---

## Day 1 (Today / Tomorrow) — iOS

### Step 1: Accept Xcode license (5 min, ONCE EVER)
```bash
sudo xcodebuild -license
```
Type `agree` when prompted. Only needed once per Mac.

### Step 2: Build the iOS archive (5 min)
```bash
cd ~/projects/contraction-tracker
./scripts/build-ios-archive.sh
```
This creates `ios/build/Runner.xcarchive` (unsigned).

### Step 3: Sign and upload via Xcode (15 min)
1. Open Xcode
2. Window > Organizer (or Cmd+Shift+8)
3. Find "Runner" in the Archives section
4. Click "Distribute App"
5. Select "App Store Connect" > "Upload"
6. Choose your Apple Developer team (Cameron Ashley or Ashbi Design)
7. Distribution options: Upload (skip export)
8. Click "Upload"
9. Wait 5-15 minutes for the upload to complete
10. App Store Connect emails you when the build is processed (~30 min)

### Step 4: Fill in App Store Connect (20 min)
Go to https://appstoreconnect.apple.com → My Apps → Olive

Open `APP-STORE-CONNECT-FIELDS.txt` in this repo and copy/paste every
field. The file is formatted exactly as the fields appear in the UI.

Specifically:
- App name, subtitle, category, price
- Description, keywords, promotional text
- Use the data declarations in `APP-STORE-CONNECT-FIELDS.txt` (Data Not Collected — the app makes no network requests)
- Tracking = "No"
- Screenshots (drag 4 files into order)
- App icon (auto from xcassets)
- Review notes (paste from file)
- Export compliance = "No" (no encryption beyond platform HTTPS defaults)

Click "Submit for Review" at the top right.

### Step 5: Wait for review (1-3 days)
Apple will email you when:
- Build is processed (technical check, ~30 min after upload)
- App is "Ready for Sale" (passed review)

---

## Day 1-2 (parallel) — Android

### Step 1: Create app in Play Console (15 min)
Go to https://play.google.com/console

1. Click "Create app"
2. App name: Olive
3. Default language: English (United States)
4. App or game: App
5. Free or paid: **Free.** The v1.3.0 build has no IAP.
6. Accept declarations, click "Create app"

### Step 2: Set up store listing (20 min)
Go to Grow > Store presence > Main store listing

Open `PLAY-STORE-CONSOLE-FIELDS.txt` in this repo and copy/paste every
field. Specifically:
- Short description (80 chars)
- Full description (4000 chars max)
- App icon: 512x512 from app-icon-master.png
- Feature graphic: 1024x500 from play-feature-graphic-1024x500.png
- 4 phone screenshots from screenshots/6.7_iphone/

### Step 3: Content rating (5 min)
Go to Policy > App content > Content rating
- Click "Start questionnaire"
- Category: App (utilities or health)
- All violence/sexual/language questions: None
- Expected rating: Everyone (E)

### Step 4: Privacy & Data Safety (10 min)
Go to Policy > App content > Data safety
- "Does your app collect or share any of the required user data types?" → No
  (As of v1.3.0 the app makes no network requests and sends nothing
  off-device; see `PLAY-STORE-CONSOLE-FIELDS.txt`.)
- Health app declaration: Yes (we track health-related data locally)
- Target audience: 18+, not for children

### Step 5: Set up internal testing (5 min)
Go to Testing > Internal testing
- Click "Create new release"
- Upload the signed AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- Release name: 1.3.0 (6)
- Release notes: paste from `play-store-release-notes.txt`
- Click "Review release" then "Start rollout to Internal testing"

### Step 6: Wait for review (1-3 days for internal testing, 1-7 days for production)
Internal testing reviews in hours-to-days. Once it passes, you can
promote to production with one click.

---

## Day 2-3 — User testing (parallel with reviews)

Send the recruitment message from `docs/USER-TESTING.md` to:
1. **Bianca** — actual user, most important feedback
2. **Friend who's pregnant or recently gave birth**
3. **Tech-savvy friend** — catches crashes
4. **Midwife or OB nurse** — reviews the care-plan language and handoff summary

For Android testers, send the universal APK at
`android/app/build/outputs/apk/release/app-release.apk`
(~5.1MB, sideloadable to any Android 7.0+ device)

For iOS testers, use the TestFlight build once Apple processes it.
TestFlight is at the top of App Store Connect (My Apps > Olive > TestFlight tab).

**Test plan** (from `tests/USER-TEST-PLAN.md`):
- Open the app, time a fake contraction (Start, wait, Stop)
- Mark intensity, add a note
- Export a backup, then import it on a second device
- Save a care-team reminder, verify that a short cluster does not trigger it, then verify a sustained matching pattern and call action

---

## Day 3-4 — Final review and launch

- [ ] Both stores approved
- [ ] All test feedback collected, any blockers fixed
- [ ] Promote Android from internal testing to production
- [ ] Verify https://olive.ashbi.ca/privacy returns the policy page (stores validate the privacy URL)
- [ ] Update privacy policy if needed

---

## Critical Path Timeline

| Day | Action | Owner | Time |
|---|---|---|---|
| **Day 1** | Run 95 gauntlet tests one more time | Me | 5 min |
| Day 1 | Generate fresh screenshots | Me (done) | 10 min |
| Day 1 | Pre-fill store fields doc | Me (done) | 10 min |
| Day 1 | Send "ready to ship" email with all artifacts | Me | 5 min |
| **Day 2** | iOS: `xcodebuild -license` + archive | Cam | 15 min |
| Day 2 | iOS: sign + upload in Xcode Organizer | Cam | 30 min |
| Day 2 | Android: create Play Console listing, upload AAB | Cam | 45 min |
| Day 2 | Send user-testing recruitment to 5 people | Cam | 15 min |
| **Day 3** | Monitor reviews, fix any critical bugs | Both | ongoing |
| **Day 4** | Both stores in review. Promote Android to production. | Cam | 30 min |
| Day 5-6 | Final verification, no last-minute changes | Both | — |
| **Day 6-7** | LIVE. Push notifications, email list, social media | Cam | — |

---

## Critical files and where they live

| What | Where |
|------|-------|
| App Store Connect pre-filled text | `APP-STORE-CONNECT-FIELDS.txt` (this repo) |
| Play Console pre-filled text | `PLAY-STORE-CONSOLE-FIELDS.txt` (this repo) |
| iOS screenshots (4 sizes × 5 states) | `~/.hermes/cache/indie-ship/APPS/olive-contractions/screenshots/` |
| Android AAB (signed) | `android/app/build/outputs/bundle/release/app-release.aab` |
| Android release APK (for testers) | `android/app/build/outputs/apk/release/app-release.apk` |
| iOS archive build (after running script) | `ios/build/Runner.xcarchive` |
| App icon master | `~/.hermes/cache/indie-ship/APPS/olive-contractions/app-icon-master.png` |
| Play Store feature graphic | `~/.hermes/cache/indie-ship/APPS/olive-contractions/play-feature-graphic-1024x500.png` |
| Release notes (for both stores) | `play-store-release-notes.txt` |
| User testing plan | `docs/USER-TESTING.md` |
| Sideload instructions for testers | `docs/SIDELOAD-APK.md` |
| Privacy page (olive.ashbi.ca) | https://olive.ashbi.ca/privacy |
| Privacy policy | https://olive.ashbi.ca/privacy |

---

## Emergency contacts

- If something breaks in the App Store submission, Apple Developer
  support: https://developer.apple.com/contact
- If something breaks in Play Store, Google Play Console help:
  https://support.google.com/googleplay/android-developer
- For Hermes-related issues (CI/deploy), ping me and I'll fix
- For 3am contractions, you have Olive.

---

## What I did vs. what you do

| Task | Status | Owner |
|------|--------|-------|
| Code, tests, build artifacts | Done | Me |
| Pre-filled store text | Done | Me |
| Screenshots at 4 sizes | Done | Me |
| Feature graphic (1024x500) | Done | Me |
| App icon (all sizes) | Done | Me |
| Privacy policy page | Live | Me |
| Native apps (App Store + Play) | **TODO** | You |
| `xcodebuild -license` | **TODO** | You |
| Sign + upload in Xcode | **TODO** | You |
| Paste App Store Connect fields | **TODO** | You |
| Create Play Console app | **TODO** | You |
| Upload AAB to Play Console | **TODO** | You |
| Send testing recruitment | **TODO** | You |
| Click "Submit for Review" | **TODO** | You |
| Promote to production | **TODO** | You (after reviews) |

You: ~1.5 hours over 2 days. Me: done. Let's ship.
