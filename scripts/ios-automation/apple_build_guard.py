"""Read Apple metadata to reject reused build numbers. Never logs authentication."""
import base64
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.parse
import urllib.request


def encode(value):
    return base64.urlsafe_b64encode(value).rstrip(b'=')


def jwt():
    now = int(time.time())
    header = {'alg': 'ES256', 'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'}
    payload = {'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 300, 'aud': 'appstoreconnect-v1'}
    message = encode(json.dumps(header).encode()) + b'.' + encode(json.dumps(payload).encode())
    signature = subprocess.check_output(['openssl', 'dgst', '-sha256', '-sign', os.environ['ASC_KEY_PATH']], input=message, stderr=subprocess.PIPE)
    if signature[0] != 48 or signature[1] != len(signature) - 2:
        raise ValueError('Unexpected Apple signature format')
    pos, raw = 2, b''
    for _ in range(2):
        if signature[pos] != 2:
            raise ValueError('Unexpected Apple signature integer')
        length = signature[pos + 1]
        raw += int.from_bytes(signature[pos + 2:pos + 2 + length], 'big').to_bytes(32, 'big')
        pos += 2 + length
    return (message + b'.' + encode(raw)).decode()


def get(url):
    if not url.startswith('https://api.appstoreconnect.apple.com/v1/'):
        raise ValueError('Unexpected Apple API destination')
    request = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + jwt()})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def unused(metadata, builds):
    # Apple can reject a number lower than an earlier upload in this version train.
    versions = [b['attributes']['version'] for b in builds]
    if any(not str(v).isdigit() for v in versions):
        raise ValueError('Non-numeric Apple build history needs owner reconciliation')
    if any(int(v) >= int(metadata['build']) for v in versions):
        raise ValueError('Commit a new unused build number before releasing')


def main():
    metadata = json.loads(Path('native-version.json').read_text())
    base = 'https://api.appstoreconnect.apple.com/v1/'
    app = get(base + 'apps/' + metadata['app_id'])
    if app['data']['attributes']['bundleId'] != metadata['bundles'][0]:
        raise ValueError('Apple app does not match the repository bundle')
    query = urllib.parse.urlencode({'filter[app]': metadata['app_id'], 'filter[preReleaseVersion.version]': metadata['version'], 'filter[preReleaseVersion.platform]': 'IOS', 'limit': '200'})
    url, builds, seen = base + 'builds?' + query, [], set()
    while url:
        if url in seen:
            raise ValueError('Apple pagination did not advance')
        seen.add(url)
        page = get(url)
        builds.extend(page['data'])
        url = page.get('links', {}).get('next')
    unused(metadata, builds)
    print('Apple identity and unused build number verified. No Apple state changed.')

if __name__ == '__main__':
    main()
