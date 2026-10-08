#!/usr/bin/env python3
"""Mechanical exports of approved imagegen masters. Requires Pillow; no new artwork."""
import json
import base64
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASTERS = ROOT / 'resources/branding'
WEB = ROOT / 'public/branding'
WEB.mkdir(exist_ok=True)
wordmark = Image.open(MASTERS / 'wordmark-olive-transparent.png').convert('RGBA')
wordmark = wordmark.crop(wordmark.getchannel('A').getbbox())
wordmark.thumbnail((800, 320), Image.Resampling.LANCZOS)
wordmark.save(WEB / 'wordmark.png', optimize=True)
for name in ['support', 'timing', 'care', 'records']:
    image = Image.open(MASTERS / f'illustration-{name}.png').convert('RGB')
    image.thumbnail((360, 360), Image.Resampling.LANCZOS)
    image.save(WEB / f'illustration-{name}.webp', quality=86)

icon = Image.open(MASTERS / 'app-icon-artwork.png').convert('RGB')
def export_icon(path, size):
    icon.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)

for name, size in [('icon.png', 1024), ('icon-192.png', 192), ('icon-512.png', 512), ('icon-512-maskable.png', 512), ('favicon.png', 48)]:
    export_icon(ROOT / 'public' / name, size)
export_icon(ROOT / 'resources/icon.png', 1024)
for name in ['icon.svg', 'favicon.svg']:
    embedded = base64.b64encode((ROOT / 'resources/icon.png').read_bytes()).decode()
    (ROOT / 'public' / name).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><image width="1024" height="1024" href="data:image/png;base64,{embedded}"/></svg>\n')
export_icon(ROOT / 'store-assets/app-icon-1024.png', 1024)
export_icon(ROOT / 'store-assets/app-icon-512.png', 512)
catalog = ROOT / 'ios/App/App/Assets.xcassets/AppIcon.appiconset'
for entry in json.loads((catalog / 'Contents.json').read_text())['images']:
    size = round(float(entry['size'].split('x')[0]) * float(entry['scale'][:-1]))
    export_icon(catalog / entry['filename'], size)

# Center the integrated wordmark on a plain Olive canvas at launch. A white
# mask is the same alpha silhouette, not a second generated logo variation.
launch = Image.new('RGB', (2732, 2732), '#26382C')
mask = wordmark.getchannel('A')
launch.paste(Image.new('RGB', wordmark.size, '#F5F1E7'), ((2732-wordmark.width)//2, (2732-wordmark.height)//2), mask)
for path in (ROOT / 'ios/App/App/Assets.xcassets/Splash.imageset').glob('*.png'):
    launch.save(path, optimize=True)
launch.save(ROOT / 'resources/splash.png', optimize=True)
print('Exported web illustrations, integrated wordmark, opaque iOS icons and launch assets.')
