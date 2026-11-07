import copy
import json
from pathlib import Path
import plistlib
import tempfile
import unittest
import zipfile
from unittest.mock import patch
import ios_release as release
from apple_build_guard import unused

CONFIG = {'repository': 'camster91/example', 'app_id': '123', 'bundles': ['com.example.app', 'com.example.app.widget'], 'checks': ['Build']}
CONTEXT = {'GITHUB_REPOSITORY': 'camster91/example', 'GITHUB_REF': 'refs/tags/v1.2.3', 'GITHUB_EVENT_NAME': 'push', 'GITHUB_ACTOR': 'camster91', 'GITHUB_ACTOR_ID': '33962910', 'GITHUB_TRIGGERING_ACTOR': 'camster91', 'GITHUB_SHA': 'a'*40, 'GITHUB_RUN_ID': '10', 'GITHUB_RUN_ATTEMPT': '1'}
PROJECT = 'MARKETING_VERSION = 1.2.3; CURRENT_PROJECT_VERSION = 42;'

class ReleaseTests(unittest.TestCase):
    def test_version_resolution(self):
        self.assertEqual(release.resolve(CONFIG, CONTEXT, PROJECT)['build'], '42')
        self.assertEqual(release.resolve(CONFIG, dict(CONTEXT, GITHUB_REF='refs/tags/v1.0'), PROJECT.replace('1.2.3','1.0'))['version'], '1.0')

    def test_context_rejection(self):
        for key, value in [('GITHUB_REF','refs/heads/main'), ('GITHUB_REF','refs/tags/v1.2.3-beta'), ('GITHUB_REPOSITORY','other/example'), ('GITHUB_ACTOR','other'), ('GITHUB_ACTOR_ID','1'), ('GITHUB_TRIGGERING_ACTOR','other'), ('GITHUB_EVENT_NAME','workflow_dispatch'), ('GITHUB_SHA','broken')]:
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                release.resolve(CONFIG, dict(CONTEXT, **{key:value}), PROJECT)

    def test_extension_version_and_build_mismatch(self):
        for extra in ['MARKETING_VERSION = 1.2.4;', 'CURRENT_PROJECT_VERSION = 43;']:
            with self.assertRaises(ValueError): release.resolve(CONFIG, CONTEXT, PROJECT + extra)

    def test_ipa_identity_hash_and_extensions(self):
        metadata = release.resolve(CONFIG, CONTEXT, PROJECT)
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory)/'app.ipa'
            def write(bundles, version='1.2.3'):
                with zipfile.ZipFile(file,'w') as archive:
                    for index, bundle in enumerate(bundles):
                        path='Payload/App.app/'+('Info.plist' if index==0 else 'PlugIns/Widget.appex/Info.plist')
                        archive.writestr(path,plistlib.dumps({'CFBundleIdentifier':bundle,'CFBundleShortVersionString':version,'CFBundleVersion':'42'}))
            write(CONFIG['bundles'])
            original=release.record(metadata,file)
            self.assertEqual(len(original['sha256']),64)
            for bundles, version in [(['com.wrong','com.example.app.widget'],'1.2.3'), (['com.example.app'],'1.2.3'), (CONFIG['bundles'],'1.2.4')]:
                write(bundles, version)
                with self.assertRaises(ValueError): release.record(metadata,file)
            write(CONFIG['bundles'])
            with zipfile.ZipFile(file,'a') as archive: archive.writestr('Payload/App.app/extra','changed')
            self.assertNotEqual(original['sha256'],release.record(metadata,file)['sha256'])

    def test_build_history(self):
        unused({'build':'42'},[{'attributes':{'version':'41'}}])
        for value in ['42','43','1.2']:
            with self.assertRaises(ValueError): unused({'build':'42'},[{'attributes':{'version':value}}])

    def test_checks_reject_latest_failed_and_untrusted(self):
        good={'id':1,'name':'Build','head_sha':'a'*40,'app':{'id':15368},'status':'completed','conclusion':'success'}
        with patch('subprocess.check_output',return_value=json.dumps([{'check_runs':[good]}]).encode()): release.source(CONFIG,'a'*40)
        for check in [dict(good,id=2,conclusion='failure'),dict(good,id=2,app={'id':1}),dict(good,id=2,status='in_progress'),dict(good,id=2,head_sha='b'*40)]:
            with patch('subprocess.check_output',return_value=json.dumps([{'check_runs':[good,check]}]).encode()), self.assertRaises(ValueError): release.source(CONFIG,'a'*40)

    def test_environment_and_tag_restrictions(self):
        policy={'can_admins_bypass':False,'protection_rules':[{'type':'required_reviewers','prevent_self_review':False,'reviewers':[{'type':'User','reviewer':{'id':33962910}}]}],'deployment_branch_policy':{'protected_branches':False,'custom_branch_policies':True}}
        tags={'total_count':1,'branch_policies':[{'type':'tag','name':'v*'}]}
        with patch.object(release,'api',side_effect=[policy,tags]): release.environment(CONFIG,'ios-auto-signing')
        for modified in [dict(tags,total_count=2), {'total_count':1,'branch_policies':[{'type':'branch','name':'main'}]}]:
            with patch.object(release,'api',side_effect=[policy,modified]), self.assertRaises(ValueError): release.environment(CONFIG,'ios-auto-signing')
        with patch.object(release,'api',return_value=dict(policy,can_admins_bypass=True)), self.assertRaises(ValueError): release.environment(CONFIG,'ios-auto-signing')
        broken=copy.deepcopy(policy); broken['protection_rules'][0]['reviewers'][0]['reviewer']['id']=1
        with patch.object(release,'api',return_value=broken), self.assertRaises(ValueError): release.environment(CONFIG,'ios-auto-signing')

if __name__=='__main__': unittest.main()
