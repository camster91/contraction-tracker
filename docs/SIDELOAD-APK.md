# Sideload the Olive APK to an Android device for testing

The signed universal APK is ready for sideloading on real Android
devices. Useful for:
- Pre-release testing on real hardware
- Letting 5 testers (family, friends) try the app before Play Store approval
- Demoing the app to anyone without going through the Play Store

## APK location

`~/.hermes/cache/indie-ship/APPS/olive-contractions/downloads/Olive-v1.0.0-universal.apk`

- Size: 4.4MB
- SHA-256: `4c91d2cd4f4a4fc6a148a80b3e9db0774bd38cbd15759c4d4ff5730ae5832a91`
- Signed with: Olive upload key (CN=Cameron Ashley, O=Ashbi Design, C=CA)
- Targets: Android 7.0+ (API 24+)

## Sideload methods (pick one)

### Method 1: ADB over USB (developer-friendly)

1. Enable **Developer Options** on the test device:
   - Settings → About phone → tap "Build number" 7 times
2. Enable **USB Debugging**:
   - Settings → System → Developer options → USB debugging → On
3. Connect device to Mac via USB cable
4. Verify the device is connected:
   ```bash
   adb devices
   # Should show: <serial>  device
   ```
5. Install the APK:
   ```bash
   adb install -r ~/.hermes/cache/indie-ship/APPS/olive-contractions/downloads/Olive-v1.0.0-universal.apk
   ```
6. Launch the app from the device's app drawer

### Method 2: Direct file transfer (no ADB needed)

1. Email the APK to the tester's email
2. Have them open the email on their Android device
3. Tap the APK attachment → "Install" (may need to enable "Install unknown apps" for the email app)
4. Tap "Open" or find "Olive" in the app drawer

### Method 3: Cloud drive (best for non-techy testers)

1. Upload the APK to Google Drive / iCloud / Dropbox
2. Share the link with the tester
3. Tester opens the link, downloads the APK, installs

### Method 4: Quick Share / AirDrop alternative

Some Android devices have Quick Share (Samsung, Xiaomi) or Nearby Share (Pixel). These work for APK files.

## What to test (5-minute smoke test)

1. Open the app → "Olive" branding, "Start" button visible
2. Tap Start → contraction timer starts, screen stays awake
3. Wait 5 seconds, tap Stop → contraction saved
4. Tap the History button (if available) → see the recorded contraction
5. Check the Settings sheet → see "Backup" card with the new Olive branding
6. Quit the app, reopen → contraction is still there (localStorage persistence works)
7. Turn on airplane mode → timer, history, and journey tools all still work (the app makes no network requests)

## What the test data looks like (for testers)

- App name: "Olive"
- Bundle ID: com.ashbi.olive
- 12 required app icons (all sizes from 20x20 to 1024x1024)
- App icon: olive branch on deep plum background
- Launch screen: dark mode first (light mode if user has light theme)
- No login or registration
- No analytics, no tracking
- All data lives on the device

## Known limitations in this build

- The LiveActivity (lock screen widget) is NOT included in this build
  (deferred to v1.1). The main app works as a normal Android app.
- The `npx cap sync` was run with the latest web bundle (as of build time).
  If you make changes to the PWA and want them in the APK, run
  `npm run build && npx cap sync android && cd android && ./gradlew bundleRelease`
  and re-extract.

## Re-extracting the APK from a new build

```bash
cd ~/projects/contraction-tracker
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
cd ..
bundletool build-apks \
  --bundle=android/app/build/outputs/bundle/release/app-release.aab \
  --output=/tmp/olive.apks \
  --mode=universal \
  --ks=android/app/olive-upload.keystore \
  --ks-pass=pass:<from-keystore.properties> \
  --ks-key-alias=olive \
  --key-pass=pass:<from-keystore.properties>
unzip -o /tmp/olive.apks universal.apk -d /tmp/olive-apks/
cp /tmp/olive-apks/universal.apk ~/.hermes/cache/indie-ship/APPS/olive-contractions/downloads/Olive-v1.0.0-universal.apk
```

## Report bugs to

If a tester finds a bug, have them:
1. Take a screenshot
2. Note the time of the bug (so we can match it to localStorage state)
3. Note what they were doing right before the bug
4. Send to cameron@ashbi.ca

We can pull the device's localStorage state via:
```bash
adb shell run-as com.ashbi.olive cat /data/data/com.ashbi.olive/app_webview/Default/Local Storage/leveldb/000003.log
```

(This requires USB debugging enabled on the device.)
