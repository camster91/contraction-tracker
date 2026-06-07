#!/usr/bin/env python3
"""
Upload Olive AAB to Google Play Console via the Play Developer API.

This is the FULL automation path. Requires:
1. A Google Cloud project with the Play Android Developer API enabled
2. A service account JSON key with the "Play Android Developer" role
3. The Play Console must have a "Service accounts" page linked

Setup (one-time):
1. Go to https://play.google.com/console → Setup → API access
2. Create a service account or link an existing Google Cloud project
3. Grant the service account "Release manager" or "Editor" permissions
4. Download the JSON key to ~/secrets/play-store-key.json (or set env var)

Run:
  GOOGLE_APPLICATION_CREDENTIALS=~/secrets/play-store-key.json \\
  python3 scripts/upload-play-store.py \\
    --bundle android/app/build/outputs/bundle/release/app-release.aab \\
    --track internal
"""
import argparse
import json
import os
import sys
from pathlib import Path

# This script requires google-api-python-client. Install with:
#   pip install google-api-python-client google-auth

def upload_aab_to_play_store(bundle_path: str, track: str, package_name: str):
    """Upload an AAB to Google Play Console via the Play Developer API."""
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    # Get credentials
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path or not Path(creds_path).exists():
        sys.exit(
            f"GOOGLE_APPLICATION_CREDENTIALS must point to a service account "
            f"JSON key with Play Android Developer API access.\n"
            f"Set: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json"
        )

    credentials = service_account.Credentials.from_service_account_file(
        creds_path, scopes=["https://www.googleapis.com/auth/androidpublisher"]
    )

    # Build the API client
    service = build("androidpublisher", "v3", credentials=credentials, cache_discovery=False)

    # Create a new edit
    print(f"Creating new edit on {package_name}...")
    edit = service.edits().insert(body={}).execute()
    edit_id = edit["id"]

    # Upload the AAB
    print(f"Uploading {bundle_path} (this can take a while for large bundles)...")
    upload = service.edits().bundles().upload(
        editId=edit_id,
        packageName=package_name,
        media_body=MediaFileUpload(bundle_path, mimetype="application/octet-stream", resumable=True),
    )
    bundle = upload.execute()
    print(f"Uploaded. versionCode = {bundle.get('versionCode')}, sha256 = {bundle.get('sha256')[:16]}...")

    # Assign to the track
    print(f"Assigning to track: {track}")
    track_body = {
        "releases": [
            {
                "name": f"Olive v1.0.0 build {bundle.get('versionCode')}",
                "versionCodes": [str(bundle.get("versionCode"))],
                "status": "completed",
                "releaseNotes": [
                    {
                        "language": "en-US",
                        "text": (
                            "First public release of Olive, the contraction timer for "
                            "expecting couples. Built by a dad for his wife — now for you."
                        ),
                    }
                ],
            }
        ]
    }
    service.edits().tracks().update(
        editId=edit_id, packageName=package_name, track=track, body=track_body
    ).execute()

    # Commit the edit
    print("Committing edit...")
    service.edits().commit(editId=edit_id, packageName=package_name).execute()
    print(f"\n✓ Uploaded to {track} track.")
    print(f"  Bundle: {bundle_path}")
    print(f"  Size:   {Path(bundle_path).stat().st_size:,} bytes")
    print(f"  Track:  {track}")
    print(f"  Review time: typically 1-7 days for first app on internal track")
    print(f"\nNext: open https://play.google.com/console → Olive → {track.capitalize()} → review and promote.")


def main():
    parser = argparse.ArgumentParser(description="Upload Olive AAB to Google Play Console")
    parser.add_argument("--bundle", required=True, help="Path to the .aab file")
    parser.add_argument("--track", default="internal", choices=["internal", "alpha", "beta", "production"],
                        help="Play Store track (default: internal)")
    parser.add_argument("--package", default="com.ashbi.olive",
                        help="Android package name (default: com.ashbi.olive)")
    args = parser.parse_args()

    if not Path(args.bundle).exists():
        sys.exit(f"AAB not found: {args.bundle}")

    upload_aab_to_play_store(args.bundle, args.track, args.package)


if __name__ == "__main__":
    main()
