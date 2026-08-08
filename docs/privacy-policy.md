# Olive privacy policy

Effective August 7, 2026. App version 1.0.1.

Olive is a contraction timer for expecting parents and their support people. The app stores contraction sessions, optional notes and tags, care-team contacts, and hospital details locally on the user's device.

Sharing is optional. When a user creates a share link, Olive sends shared-session data to the Olive relay at `relay.ashbi.ca`. The relay may store a random share code and client identifier, session and expiry metadata, current stage, contraction timestamps and details, timer state, limited audit events, and optional activity-feed display names, messages, reactions, or images. Care-team contacts, hospital details, and exported files are not uploaded by the sharing feature.

Shared-session data is used only to synchronize the session, provide the activity feed, limit abuse, and support revocation. It is encrypted in transit using HTTPS. It is deleted automatically after expiry; the default share period is seven days. Revocation immediately removes contractions, messages, and client-name bindings. Minimal revocation metadata may remain until expiry so the revoked code stays blocked.

Olive contains no advertising, analytics SDK, or crash-reporting service, and does not sell or license user data. The relay application does not persist IP addresses in its session database, although network infrastructure processes IP addresses and request metadata to deliver and protect the service. People who receive a share link can access the data permitted by that link.

If voice control is enabled, Olive uses speech recognition supplied by the browser or operating system. Processing may be on-device or through that platform's speech service. Olive does not record or retain voice audio or send it to the Olive relay.

Users can delete local data from Olive, revoke shared sessions, export a JSON backup, or contact the developer through `https://contractions.ashbi.ca` for help with a deletion request.

Olive is an informational timing and communication tool, not a medical device. It does not diagnose labor or replace professional medical advice. Pattern notices, including the 5-1-1 pattern, are informational only. Users should follow their healthcare professional's instructions, contact them before making medical decisions, and use local emergency services when urgent help is needed.
