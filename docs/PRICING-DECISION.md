> Historical review or plan. Use [RELEASE-PLAN.md](RELEASE-PLAN.md) for current v1.3.0 gates; this record is not current signed-binary, console, or launch evidence.

# Olive launch pricing decision

Status: superseded. Cameron chose free on 2026-09-25. Do not configure a paid price.

Decision date: 2026-09-25 (replaces the 2026-09-01 paid draft)

## Decision

Launch iOS and Android as **free**. No in-app purchase, no subscription, no ads.

The 2026-09-01 CAD $1.99 draft is not the launch price. Store fields in `APP-STORE-CONNECT-FIELDS.txt`, `PLAY-STORE-CONSOLE-FIELDS.txt`, and `SHIPPING.md` already say free. Play cannot turn a free package paid later under the same id; that tradeoff is accepted.

- No subscription.
- No in-app purchase in v1.2.1.
- No ads, account requirement, trial countdown, or labor-time unlock.
- One purchase exposes the complete timer, history, corrections, safety information, exports, native ongoing-timer access, and optional partner sharing.
- No feature prompt may interrupt an active contraction or recovered timer.

This is a launch-price test, not a claim that willingness to pay is already validated. The observed-user pilot must still measure whether participants would choose Olive and what they expect for CAD $1.99.

## Why this direction

The strongest incumbent pricing evidence is free acquisition followed by one-time or lifetime purchases: Contraction Timer & Counter 9m lists a US $2.99 full-version purchase, while ContractionTimer.io lists US $4.99 lifetime access. Several high-download Android competitors instead use ads and in-app purchases. Olive deliberately avoids ads, subscriptions, diagnosis-like prompts, and essential-feature gates.

A CAD $1.99 upfront price is below those observed upgrades, matches the requested one-or-two-dollar model, and keeps the app commercially simple during labor. It also avoids implementing billing code solely to manufacture an upgrade boundary.

## Platform constraint

Google Play's official pricing guidance says a paid app can later become free, but an app that has once been offered free cannot become paid under the same package name. Publishing `com.ashbi.olive` free would therefore permanently remove the clean paid-upfront option on Android. Apple permits app-price changes and scheduled pricing, but requires the Paid Apps Agreement before a non-free price can be offered.

Official references:

- Google Play pricing: https://support.google.com/googleplay/android-developer/answer/6334373
- Apple set-a-price guidance: https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price
- Apple pricing and availability reference: https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability/app-pricing-and-availability

Current comparison references:

- Contraction Timer & Counter 9m: https://apps.apple.com/us/app/contraction-timer-counter-9m/id877303791
- Contraction Timer & Counter IO: https://apps.apple.com/us/app/contraction-timer-counter-io/id1633196366
- Contraction Timer & Counter on Google Play: https://play.google.com/store/apps/details?id=com.wachanga.contractions

## Required console evidence

Before submission:

1. Confirm the Apple Paid Apps Agreement, banking, tax category, Canada base storefront, and CAD $1.99 schedule.
2. Confirm the Google payments profile, tax/compliance answers, paid selection, CAD $1.99 default price, and generated local prices **before any public free rollout**.
3. Verify internal testers are testing the exact paid-configured package without adding an IAP product.
4. Capture dated screenshots or exports of both pricing configurations with the signed-candidate record.
5. Reconcile every public claim with this document and rerun `npm run check:store`.

## Post-launch review

Review price, conversion, refund reasons, support load, and relay operating cost after the earlier of 100 paid installs or 90 days. A future price change may affect new purchasers only; it must not introduce an active-labor paywall or remove already purchased core functionality.
