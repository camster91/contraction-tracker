FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3000
RUN npm install -g serve
EXPOSE 3000
# `serve -s dist` would rewrite every 404 to index.html (SPA mode), which
# hides the privacy page at /privacy/. The app has no client-side routes
# (deep links use ?share= search params), so SPA fallback isn't needed.
# Static files (icons, /privacy/index.html, /share?…=CODE) are served
# from the real paths. Unknown paths return a real 404.
CMD ["sh", "-c", "serve dist -l 3000 --no-clipboard"]
