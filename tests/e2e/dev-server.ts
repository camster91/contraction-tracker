// Vite middleware-mode preview server that:
// 1. Serves the dist/ build at /
// 2. Serves a custom 404 page (dist/404/index.html) at /404 with HTTP 404
// 3. Serves the privacy page at /privacy (dist/privacy/index.html)
// 4. Returns 404 for any other unknown path with the 404 page
//
// Used in CI / dev for testing the 404 UX. Production uses the static
// `serve` binary which only serves files; the 404 page is available at
// /404/ but unknown paths get the default 404 text response.
import express from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
const dist = path.resolve(process.cwd(), 'dist');
const notFoundPage = path.join(dist, '404/index.html');
const privacyPage = path.join(dist, 'privacy/index.html');

// Static asset serving
app.use(express.static(dist));

// 404 handler
app.use((req, res) => {
  if (fs.existsSync(notFoundPage)) {
    res.status(404).type('html').sendFile(notFoundPage);
  } else {
    res.status(404).type('text').send('Not found');
  }
});

const port = Number(process.env.PORT) || 8765;
app.listen(port, () => {
  console.log(`Olive dev server with 404: http://127.0.0.1:${port}`);
});
