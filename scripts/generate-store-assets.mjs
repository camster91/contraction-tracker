#!/usr/bin/env node

import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const output = new URL('../store-assets/', import.meta.url);
mkdirSync(output, { recursive: true });

const iconSource = new URL('../resources/icon.png', import.meta.url);

const asDataUrl = (url, mime) => `data:${mime};base64,${readFileSync(url).toString('base64')}`;
const icon = asDataUrl(iconSource, 'image/png');
const fraunces = asDataUrl(new URL('../node_modules/@fontsource/fraunces/files/fraunces-latin-500-normal.woff2', import.meta.url), 'font/woff2');
const inter = asDataUrl(new URL('../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2', import.meta.url), 'font/woff2');

const browser = await chromium.launch();
try {
  const renderIcon = async (size, path) => {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#120c10}img{display:block;width:100%;height:100%}</style><body><img src="${icon}" alt=""></body></html>`, { waitUntil: 'load' });
    await page.screenshot({ path });
    await page.close();
  };
  const iconSizes = new Map([
    ['AppIcon-20@2x.png', 40], ['AppIcon-20@3x.png', 60],
    ['AppIcon-29@2x.png', 58], ['AppIcon-29@3x.png', 87],
    ['AppIcon-40@2x.png', 80], ['AppIcon-40@3x.png', 120],
    ['AppIcon-60@2x.png', 120], ['AppIcon-60@3x.png', 180],
    ['AppIcon-76.png', 76], ['AppIcon-76@2x.png', 152],
    ['AppIcon-83.5@2x.png', 167], ['AppIcon-1024.png', 1024],
  ]);
  for (const [filename, size] of iconSizes) {
    const nativePath = new URL(`../ios/App/App/Assets.xcassets/AppIcon.appiconset/${filename}`, import.meta.url).pathname;
    await renderIcon(size, nativePath);
    if (size === 1024) await renderIcon(size, new URL('../store-assets/app-icon-1024.png', import.meta.url).pathname);
  }
  await renderIcon(512, new URL('../store-assets/app-icon-512.png', import.meta.url).pathname);

  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html>
    <html><head><style>
      @font-face { font-family: Fraunces; src: url('${fraunces}') format('woff2'); font-weight: 500; }
      @font-face { font-family: Inter; src: url('${inter}') format('woff2'); font-weight: 500; }
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1024px; height: 500px; overflow: hidden; }
      body {
        display: flex; align-items: center; justify-content: center; padding: 64px 78px;
        color: #faf6f4; background:
          radial-gradient(circle at 16% 20%, rgba(232,149,122,.22), transparent 34%),
          radial-gradient(circle at 92% 84%, rgba(168,184,159,.14), transparent 34%),
          #120c10;
      }
      .copy { min-width: 0; width: 100%; text-align: center; }
      h1 { font: 500 118px/1 Fraunces, Georgia, serif; letter-spacing: -3px; margin: 0 0 24px; }
      p { font: 500 37px/1.28 Inter, system-ui, sans-serif; color: #e8d9d1; margin: 0 auto; max-width: 760px; }
      .rule { width: 86px; height: 5px; margin: 34px auto 0; border-radius: 999px; background: #e8957a; }
    </style></head><body>
      <div class="copy"><h1>Olive</h1><p>Calm, private contraction timing</p><div class="rule"></div></div>
    </body></html>`, { waitUntil: 'load' });
  await page.screenshot({ path: new URL('../store-assets/play-feature-graphic-1024x500.png', import.meta.url).pathname });
} finally {
  await browser.close();
}

console.log(`Generated durable store masters in ${output.pathname}`);
