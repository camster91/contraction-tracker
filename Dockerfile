FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_RELAY_URL is the only env-injected config. Set at build time:
#   docker build --build-arg VITE_RELAY_URL=https://relay-staging.ashbi.ca .
# Unset → falls back to https://relay.ashbi.ca in src/lib/relay.ts.
ARG VITE_RELAY_URL
ENV VITE_RELAY_URL=$VITE_RELAY_URL
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3000
RUN npm install -g serve
EXPOSE 3000
# `serve -s dist` would rewrite every 404 to index.html (SPA mode), which
# hides the privacy page at /privacy/. The app has no client-side routes
# (deep links use ?share= search params), so SPA fallback isn't needed.
# Unknown paths return a real 404 — the static 404 page at
# public/404/ is served for /404/ explicitly, and `serve` returns its
# default 404 text for everything else. The user-facing error UX comes
# from this static HTML page when explicitly linked.
CMD ["sh", "-c", "serve dist -l 3000 --no-clipboard"]
