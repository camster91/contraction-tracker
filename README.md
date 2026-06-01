# Contraction Tracker

Mobile-first contraction timer built as a Telegram Mini App. Tap when a contraction starts, tap when it stops, and the app tracks duration, interval, and detects the 5-1-1 pattern.

- Persistent across closes (localStorage)
- 5-1-1 hospital rule auto-detection
- Intensity + note per contraction
- Share to Telegram or download as .txt for the midwife
- 100% client-side, no backend

## Run

```
npm install
npm run dev
```

## Deploy

Pushes to `main` auto-deploy via Coolify to `https://contractions.ashbi.ca/`.
