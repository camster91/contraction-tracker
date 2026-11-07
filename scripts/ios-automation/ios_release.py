"""Fail-closed release identity and IPA checks. No credential storage in the repo."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import zipfile


def resolve(config, context, project):
    if context.get('GITHUB_REPOSITORY') != config['repository']:
        raise ValueError('Unexpected repository')
    ref = context.get('GITHUB_REF', '')
    match = re.fullmatch(r'refs/tags/v(\d+\.\d+(?:\.\d+)?)', ref)
    if not match or context.get('GITHUB_EVENT_NAME') != 'push':
        raise ValueError('A version tag push is required')
    if any(context.get(k) != v for k, v in {
        'GITHUB_ACTOR': 'camster91', 'GITHUB_ACTOR_ID': '33962910',
        'GITHUB_TRIGGERING_ACTOR': 'camster91',
    }.items()):
        raise ValueError('Only the owner may start a release')
    version = match[1]
    versions = set(re.findall(r'MARKETING_VERSION = ([\d.]+);', project))
    builds = set(re.findall(r'CURRENT_PROJECT_VERSION = (\d+);', project))
    if versions != {version} or len(builds) != 1:
        raise ValueError('Committed app and extension versions must match the release tag')
    build = builds.pop()
    if int(build) < 1:
        raise ValueError('Build number must be positive')
    sha = context.get('GITHUB_SHA', '')
    if not re.fullmatch('[0-9a-f]{40}', sha):
        raise ValueError('Invalid source identity')
    return {'repository': config['repository'], 'source': sha, 'tag': ref,
            'version': version, 'build': build, 'app_id': config['app_id'],
            'bundles': config['bundles'], 'run': context['GITHUB_RUN_ID'],
            'attempt': context['GITHUB_RUN_ATTEMPT']}


def record(metadata, artifact):
    with zipfile.ZipFile(artifact) as archive:
        roots = [n for n in archive.namelist() if re.fullmatch(r'Payload/[^/]+\.app/Info.plist', n)]
        if len(roots) != 1:
            raise ValueError('Exactly one application is required')
        names = roots + [n for n in archive.namelist() if n.startswith(roots[0].rsplit('/', 1)[0] + '/PlugIns/') and n.endswith('.appex/Info.plist')]
        actual = []
        for name in names:
            info = plistlib.loads(archive.read(name))
            if str(info.get('CFBundleShortVersionString')) != metadata['version'] or str(info.get('CFBundleVersion')) != metadata['build']:
                raise ValueError('App and extension versions differ from the approved source')
            actual.append(info['CFBundleIdentifier'])
        if sorted(actual) != sorted(metadata['bundles']):
            raise ValueError('Unexpected or missing app or extension')
        if actual[0] != metadata['bundles'][0]:
            raise ValueError('Unexpected main application')
    return dict(metadata, sha256=hashlib.sha256(Path(artifact).read_bytes()).hexdigest())


def api(endpoint):
    return json.loads(subprocess.check_output(['gh', 'api', endpoint], stderr=subprocess.PIPE))


def source(config, sha):
    # Paginate so an unrelated busy CI cannot conceal required check results.
    pages = json.loads(subprocess.check_output(['gh', 'api', '--paginate', '--slurp',
        f"repos/{config['repository']}/commits/{sha}/check-runs?per_page=100"], stderr=subprocess.PIPE))
    checks = [c for page in pages for c in page['check_runs']]
    for name in config['checks']:
        found = [c for c in checks if c['name'] == name]
        if not found:
            raise ValueError('Required source checks are missing; run existing CI on this commit')
        latest = max(found, key=lambda c: c['id'])
        if latest.get('app', {}).get('id') != 15368 or latest.get('head_sha') != sha or latest.get('status') != 'completed' or latest.get('conclusion') != 'success':
            raise ValueError('Required exact-source checks must succeed')


def environment(config, name):
    payload = api(f"repos/{config['repository']}/environments/{name}")
    if payload.get('can_admins_bypass') is not False:
        raise ValueError('Administrator bypass must be disabled')
    rules = [r for r in payload['protection_rules'] if r['type'] == 'required_reviewers']
    if len(rules) != 1 or rules[0].get('prevent_self_review') is not False:
        raise ValueError('Solo owner review is required')
    reviewers = rules[0].get('reviewers', [])
    if len(reviewers) != 1 or reviewers[0].get('type') != 'User' or reviewers[0].get('reviewer', {}).get('id') != 33962910:
        raise ValueError('Cameron must be the only reviewer')
    if payload.get('deployment_branch_policy') != {'protected_branches': False, 'custom_branch_policies': True}:
        raise ValueError('Explicit release-tag policy is required')
    policy = api(f"repos/{config['repository']}/environments/{name}/deployment-branch-policies?per_page=100")
    if policy.get('total_count') != 1 or len(policy.get('branch_policies', [])) != 1 or any(p.get('type') != 'tag' or p.get('name') != 'v*' for p in policy['branch_policies']):
        raise ValueError('Only version tags may access signing credentials')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['resolve', 'source', 'environment', 'record'])
    parser.add_argument('--environment', choices=['ios-auto-signing', 'ios-auto-upload'])
    parser.add_argument('--artifact')
    parser.add_argument('--metadata', default='native-version.json')
    parser.add_argument('--output', default='native-artifact.json')
    args = parser.parse_args()
    config = json.loads(Path('ios-release.json').read_text())
    if args.mode == 'resolve':
        value = resolve(config, os.environ, Path(config['project']).read_text())
        Path(args.metadata).write_text(json.dumps(value, sort_keys=True, indent=2) + '\n')
        if os.environ.get('GITHUB_ENV'):
            with open(os.environ['GITHUB_ENV'], 'a') as output:
                output.write(f"MARKETING_VERSION={value['version']}\nCURRENT_PROJECT_VERSION={value['build']}\n")
    elif args.mode == 'source':
        source(config, os.environ['GITHUB_SHA'])
    elif args.mode == 'environment':
        if not args.environment:
            raise ValueError('Environment is required')
        environment(config, args.environment)
    else:
        value = record(json.loads(Path(args.metadata).read_text()), args.artifact)
        Path(args.output).write_text(json.dumps(value, sort_keys=True, indent=2) + '\n')

if __name__ == '__main__':
    main()
