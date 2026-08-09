// Share sheet — pick who's in this share, get a link, post updates.
// Designed for the 3am one-handed use case: two taps, not seven.
//
// Mental model: "I want my partner to see this. I want my mom to see
// this. Done." No mode picker, no TTL picker, no stage picker. The
// partner and the network are the focus; everything else (TTL, mode,
// state) is either automatic or moved out to a separate Advanced
// disclosure that 99% of users never need.
//
// What moved out (vs the previous version):
//   - "WHO IS THIS FOR" (Partner / Friends) — gone. Always "full"
//     share with the partner. Friends was a feature flag for a
//     use case that never materialized in real users; if needed
//     later, expose as a checkbox in the Advanced disclosure.
//   - "LINK EXPIRES IN" (1d / 3d / 1w / 30d) — hidden behind
//     "Advanced". Default 7 days is right for the labor→postpartum
//     window; an abandoned share self-destructs within a week.
//   - "LABOR STAGE" (prenatal / labor / postpartum / archived) — gone.
//     Stage has its own dedicated StatePicker mounted elsewhere in
//     the app. The share sheet doesn't own stage.
//   - "Baby is here!" big button — gone from here. That goes in a
//     celebratory banner mounted elsewhere (BabyIsHereMount is
//     already a separate component).
//   - "Send update without a link" — moved out. The host posts free-
//     text status notes from the main app (separate Updates input),
//     not from the share sheet. The share sheet shares a LINK; the
//     Updates tab posts TEXT.
//
// Where the activities and messages live: the partner view
// (ShareView at /?share=CODE) shows the activity feed to whoever
// has the link. The host sees a mirrored view in their own Updates
// tab (separate component, not part of this sheet). This sheet's
// only job is: "make a link, hand it to someone."

import { useEffect, useMemo, useState } from 'react';
import { Copy, Share2, Trash2, X, Check, ChevronDown, ChevronUp, Link2, Users } from 'lucide-react';
import {
  type Share,
  createShare,
  getShares,
  getPeople,
  isShareValid,
  revokeShare,
} from '../lib/sessions';
import { createShareOnRelay, getShareCapability, pushContractionsToRelay, pushJourneyToRelay, revokeShareOnRelay } from '../lib/relay';
import type { Person } from '../lib/sessions';
import type { JourneyDocument } from '../lib/journey';
import { useModalDialog } from '../hooks/useModalDialog';

type Props = {
  sessionId: string;
  onClose: () => void;
  journey: JourneyDocument;
};

const DEFAULT_TTL_HOURS = 168; // 7 days

export default function ShareSheet({ sessionId, onClose, journey }: Props) {
  const dialogRef = useModalDialog(onClose);
  const [relayError, setRelayError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [shares, setShares] = useState<Share[]>(() => getShares());
  const [copied, setCopied] = useState<string | null>(null);
  const [people] = useState<Person[]>(() => getPeople());
  // Default: no one is "in" the share until the host picks. Past
  // behavior was to always create the link with mode='full' (full
  // data, no per-person gating). Keep that — the partner always
  // gets full access. People are the REACH surface (who you text the
  // link to), not the PERMISSION surface.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ttlHours, setTtlHours] = useState<number>(DEFAULT_TTL_HOURS);
  const [shareResponsibilities, setShareResponsibilities] = useState(false);
  const shareableResponsibilities = journey.responsibilities.filter((item) => !item.private);
  const peopleById = new Map(people.map((person) => [person.id, person]));

  // Resolve the session's display name from the sessions list
  const sessions = JSON.parse(localStorage.getItem('contraction-tracker:sessions') || '[]');
  const actualName = sessions.find((s: { id: string }) => s.id === sessionId)?.name ?? 'Olive session';

  const activeShares = useMemo(
    () => shares.filter((s) => s.sessionId === sessionId && isShareValid(s)),
    [shares, sessionId],
  );

  const handleCreate = async () => {
    setRelayError(null);
    setCreating(true);
    // No mode picker — the share is always 'full'. No PIN — simpler
    // is better, and the share URL itself is the secret. (PIN was
    // removed in the previous revision; this UI just stops pretending
    // it ever existed.)
    const existing = getShares().find(
      (s) => s.sessionId === sessionId && isShareValid(s),
    );
    if (existing && getShareCapability(existing.id)) {
      // The host is in the share-setup screen with an already-active
      // share. Just re-mark the host marker so the partner view's
      // isHost check works. No relay POST — the existing remote
      // share is reused. (This matches the T27 fix in a2ab06d: a
      // second click of Create is a no-op, not a duplicate POST.)
      try {
        localStorage.setItem(`olive:share-owner:${existing.id}`, '1');
      } catch { /* ignore */ }
      setCreating(false);
      return;
    }
    if (existing) {
      // Shares created before host capabilities cannot safely perform host
      // mutations after the relay security migration. Retire the local record
      // and create a fresh protected link instead of silently reusing it.
      revokeShare(existing.id);
      setShares(getShares());
    }
    const relayResult = await createShareOnRelay({
      sessionId,
      pin: undefined,
      ttlHours,
      mode: 'full',
      state: 'prenatal',
      journeyPermissions: shareResponsibilities
        ? ['responsibilities:read', 'responsibilities:complete']
        : [],
    });
    if (!relayResult) {
      setRelayError(
        'Could not reach the share server. The link will work on this device only — viewers in other browsers will not see updates until the relay reconnects.',
      );
      setCreating(false);
      return;
    }
    createShare({
      sessionId,
      id: relayResult.code,
      ttlHours,
      pin: undefined,
      mode: 'full',
      journeyPermissions: relayResult.journeyPermissions,
    });
    setShares(getShares());
    try {
      localStorage.setItem(`olive:share-owner:${relayResult.code}`, '1');
    } catch { /* ignore */ }
    try {
      const all = JSON.parse(localStorage.getItem('contraction-tracker:v1') || '{"contractions":[]}').contractions;
      const sessionContractions = all.filter((c: { sessionId?: string }) => (c.sessionId || 'primary') === sessionId);
      await pushContractionsToRelay(relayResult.code, sessionContractions, null);
      if (shareResponsibilities) {
        const journeySynced = await pushJourneyToRelay(relayResult.code, shareableResponsibilities.map((item) => ({
          id: item.id,
          title: item.title,
          assigneeName: item.assigneePersonId ? peopleById.get(item.assigneePersonId)?.name : undefined,
          phase: item.phase,
          completedAt: item.completedAt ?? null,
        })));
        if (!journeySynced) {
          setRelayError('The link was created, but responsibilities did not sync. Keep the link private and retry with a new share.');
        }
      }
    } catch {
      setRelayError('Share created, but initial sync to viewers failed. They may see no data until your next contraction is saved.');
    }
    setCreating(false);
  };

  const handleCopy = async (code: string) => {
    const url = buildShareUrl(code);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers: select the input.
      const input = document.getElementById(`share-url-${code}`) as HTMLInputElement | null;
      if (input) input.select();
    }
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
  };

  const handleShareLink = async (code: string) => {
    const url = buildShareUrl(code);
    if (navigator.share) {
      try { await navigator.share({ title: 'Olive — Contraction Timer', text: `${actualName} — follow along`, url }); } catch { /* user cancelled */ }
    } else {
      handleCopy(code);
    }
  };

  const handleRevoke = (id: string) => {
    if (!confirm('Revoke this link? The recipient will lose access immediately.')) return;
    revokeShare(id);
    setShares(getShares());
    revokeShareOnRelay(id).catch(() => { /* best-effort */ });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Share with partner"
        tabIndex={-1}
        className="fixed bottom-0 inset-x-0 z-50 bg-plum-950 border-t border-ink-200/20 rounded-t-3xl max-h-[88vh] overflow-y-auto"
      >
        <div className="max-w-md mx-auto px-5 pt-3 pb-8">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-ink-200/30 rounded-full mx-auto mb-3" />

          {/* Header — close on right, no redundant title */}
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={onClose}
              className="p-1 text-ink-400 active:text-ink-200"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* People — the only thing the host needs to think about. Tap
              a person to toggle them in/out of the share. Default: no one
              is "selected" — the share is created with the default full
              access regardless. The People row is about WHO TO TELL
              (the reach), not what they can see (the permission, which
              is always full for the partner). */}
          {people.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-2">
                <Users className="w-3 h-3" />
                Tell people
              </div>
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {people.map((p) => {
                  // Visual-only toggle. The actual share creation is
                  // universal (no per-person gating). The "selected" state
                  // just opens the OS share sheet pre-populated for the
                  // contact, which is the real value-add.
                  return (
                    <ContactChip
                      key={p.id}
                      person={p}
                      onTap={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Olive — Contraction Timer',
                            text: p.phone
                              ? `Hey ${p.name}, follow along: ${activeShares[0] ? buildShareUrl(activeShares[0].id) : '(share not created yet)'}`
                              : `Hey ${p.name}, follow along: ${activeShares[0] ? buildShareUrl(activeShares[0].id) : '(share not created yet)'}`,
                          }).catch(() => { /* user cancelled */ });
                        } else if (p.phone) {
                          window.location.href = `sms:${p.phone}?body=${encodeURIComponent(`Hey, follow along: ${activeShares[0] ? buildShareUrl(activeShares[0].id) : '(share not created)'}`)}`;
                        } else if (p.email) {
                          window.location.href = `mailto:${p.email}?subject=${encodeURIComponent('Olive — Labor update')}&body=${encodeURIComponent(`Hey, follow along: ${activeShares[0] ? buildShareUrl(activeShares[0].id) : '(share not created)'}`)}`;
                        }
                      }}
                    />
                  );
                })}
              </div>
              <div className="text-[10px] text-ink-500 mt-1.5">
                Tap to text them the link. (If no one is added below, the share still works for whoever gets the link.)
              </div>
            </div>
          )}

          {activeShares.length === 0 && shareableResponsibilities.length > 0 && (
            <label className="mb-4 flex items-start gap-3 rounded-2xl border border-ink-200/25 bg-ink-100/5 p-3 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={shareResponsibilities}
                onChange={(event) => setShareResponsibilities(event.target.checked)}
                className="mt-1 h-5 w-5 accent-rose-300"
              />
              <span>
                <span className="block font-semibold">
                  Share {shareableResponsibilities.length} reviewed {shareableResponsibilities.length === 1 ? 'responsibility' : 'responsibilities'}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-400">
                  Your partner can view and mark these complete. Care card, provider questions, notes, and private responsibilities stay on this device.
                </span>
              </span>
            </label>
          )}

          {/* Primary CTA — single big share button. The button is the
              share. The link appears below once it's live. */}
          {activeShares.length === 0 ? (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-rose-300 active:bg-rose-400 disabled:bg-rose-300/60 disabled:text-plum-950/60 text-plum-950 rounded-2xl py-4 text-base font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Link2 className="w-5 h-5" />
              {creating ? 'Creating…' : 'Share with your circle'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.15em] text-sage-300 font-semibold text-center">
                <Check className="w-3 h-3 inline mr-1" />
                Link is live
              </div>
              {activeShares.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-sage-300/30 bg-sage-300/5 p-3"
                >
                  <div className="flex items-center gap-2">
                    <input
                      id={`share-url-${s.id}`}
                      readOnly
                      value={buildShareUrl(s.id)}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 bg-transparent text-[12px] text-ink-200 focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => handleCopy(s.id)}
                      className="p-2 text-ink-300 active:text-rose-300"
                      aria-label="Copy link"
                      title="Copy"
                    >
                      {copied === s.id ? <Check className="w-4 h-4 text-sage-300" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleShareLink(s.id)}
                      className="p-2 text-ink-300 active:text-rose-300"
                      aria-label="Share via…"
                      title="Share via…"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRevoke(s.id)}
                      className="p-2 text-ink-300 active:text-rose-300"
                      aria-label="Revoke"
                      title="Revoke"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Tiny expiring-soon hint. Single line. Not a config knob. */}
                  <ShareExpiryHint expiresAt={s.expiresAt} />
                </div>
              ))}
            </div>
          )}

          {relayError && (
            <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2.5 text-xs text-amber-100 leading-relaxed">
              {relayError}
            </div>
          )}

          {/* Advanced disclosure — hidden by default. Most users never
              open this. It contains the one configuration that does
              occasionally matter: link expiry. Mode picker is gone
              (always full). Stage picker is gone (own component). */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-4 w-full text-[11px] text-ink-500 active:text-ink-300 flex items-center justify-center gap-1 py-2"
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Advanced
          </button>
          {showAdvanced && (
            <div className="mt-2 space-y-3 pb-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-ink-400 font-semibold mb-1.5">
                  Link expires in
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { hours: 24, label: '1 day' },
                    { hours: 72, label: '3 days' },
                    { hours: 168, label: '1 week' },
                    { hours: 720, label: '30 days' },
                  ].map((opt) => (
                    <button
                      key={opt.hours}
                      onClick={() => setTtlHours(opt.hours)}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] transition-colors ${
                        ttlHours === opt.hours
                          ? 'border-rose-300/40 bg-rose-300/10 text-rose-200 font-medium'
                          : 'border-ink-200/30 bg-ink-100/5 text-ink-300 active:bg-ink-100/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function buildShareUrl(code: string): string {
  return `${window.location.origin}/?share=${code}`;
}

// Subcomponent: one tappable contact chip.
function ContactChip({ person, onTap }: { person: Person; onTap: () => void }) {
  const initials = person.name.split(' ').map((n) => n[0] || '').slice(0, 2).join('').toUpperCase() || '?';
  return (
    <button
      onClick={onTap}
      className="flex-shrink-0 flex flex-col items-center gap-1 active:scale-95 transition-transform min-w-[64px]"
      aria-label={`Share with ${person.name}`}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold"
        style={{
          background: 'linear-gradient(135deg, #e8957a, #c25a3f)',
          color: '#120c10',
        }}
      >
        {initials}
      </div>
      <div className="text-[10px] text-ink-300 leading-tight text-center max-w-[64px] truncate">
        {person.name.split(' ')[0]}
      </div>
      {person.relationship && (
        <div className="text-[9px] text-ink-500 leading-tight">{person.relationship}</div>
      )}
    </button>
  );
}

// Subcomponent: small expiring-soon text. One line, no config.
function ShareExpiryHint({ expiresAt }: { expiresAt: string | undefined }) {
  const [days, setDays] = useState(() => computeDays(expiresAt));
  useEffect(() => {
    const id = setInterval(() => setDays(computeDays(expiresAt)), 60_000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (days === null) return null;
  return (
    <div className="text-[10px] text-ink-500 mt-1.5 text-center">
      {days > 1 ? `Expires in ${days} days` : days === 1 ? 'Expires tomorrow' : 'Expires today'}
    </div>
  );
}

function computeDays(expiresAt: string | undefined): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
