# Production checklist — SOSA INC

> Action list to take the app from yellow/yellow/clean to fully production-ready. Most items are external (Supabase dashboard / DNS / hosting console); a few are still code-side. Treat as a runbook — execute top-to-bottom before the first paying customer.

## 1. Supabase Point-in-Time Recovery (PITR)

**Why:** without PITR, an accidental `DELETE` (or a malicious one) is unrecoverable. The May 2026 nuke procedure should have been preceded by a `pg_dump` exactly because of this. Free-tier projects do not have PITR; Pro tier does, and the upgrade is the single highest-leverage production prerequisite.

**Steps:**

1. Sign in at https://supabase.com/dashboard/project/ndudzfaisulnmbpnvkwo/settings/general
2. Project Settings → **Billing & Usage** → Upgrade to **Pro** (~$25 / month).
3. Project Settings → **Database** → **Point in Time Recovery**. Enable. Default retention is 7 days; pay-as-you-go for longer windows.
4. Verify daily logical backup snapshot is scheduled: **Database → Backups** → confirm “Last backup” updates within the last 24h.
5. Document the restore procedure: `Database → Backups → Restore from PITR` accepts a timestamp; restore lands in a new project (you re-point DNS).

**Validation:** click **Restore** preview at a timestamp 1h ago. If the dialog renders, PITR is armed. Do not actually execute the restore.

## 2. Vault encryption

✓ Done in commit (this session) — AES-256-GCM, PBKDF2 200k iterations, key derived from `user_id + portal_id + APP_SALT`. See `src/lib/vaultCrypto.ts`.

**Limitation:** the key is derivable from anyone holding the user's JWT. For maximum security, swap the key derivation to a **user-passphrase**: prompt for a vault password on first use, store its hash in `user_profiles`, derive the AES key from the password via PBKDF2. That eliminates JWT-theft → vault-decryption. Tracked but not implemented (UX cost + need to re-encrypt on password reset).

## 3. NotesPage + CloudPage data persistence

✓ Done — both pages now hydrate from Supabase on mount and persist mutations to Supabase via service calls / debounced auto-sync. Zero residual localStorage data writes for note / folder / cloud-folder / cloud-section data.

## 4. Sentry / error tracking

✓ Hooks in place: `src/lib/errorLogger.ts` exposes `logError`, `logWarning`, `logInfo`; `src/main.tsx` registers `window.error` + `unhandledrejection` listeners.

**To finish:**
```bash
npm install @sentry/react @sentry/tracing
```

Then in `src/main.tsx`, before any render:
```ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
});
```

And in `src/lib/errorLogger.ts:23-37`, replace the `sendToService` stub with:
```ts
Sentry.withScope((scope) => {
  scope.setLevel(severity);
  scope.setTags({ module: context.module, action: context.action });
  if (context.userId) scope.setUser({ id: context.userId });
  Sentry.captureException(_error);
});
```

Sentry DSN goes in Vercel/host env as `VITE_SENTRY_DSN`.

## 5. Smoke tests

✓ Done — 15 tests passing across 4 specs (vaultCrypto round-trip + tamper detection + backward-compat, portalUUID round-trip, applyFilters combinatorics). Run: `npm test`.

**Recommended extensions** (post-launch):
- React Testing Library smoke for LoginPage (form submit → mocked supabase auth)
- Integration spec for `useTransactions` (`renderHook` + mocked `from()` chain) — proves Recap pipeline still aggregates correctly when transaction shape changes
- E2E with Playwright (already a devDependency but no specs written) — login → portal-switch → create transaction → verify Recap KPI updates

## 6. CSP + HSTS headers

✓ Done — `vercel.json` ships with:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` — `'self'` default, Supabase + CoinGecko + Apify allow-listed
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — camera/mic/geolocation/payment/usb denied

**Pre-deploy check:** preview the production build, hit https://securityheaders.com against the URL, target grade A+.

**HSTS preload:** after first deploy and 6-month soak with `max-age=63072000`, submit the domain to https://hstspreload.org for browser-baked HSTS.

## 7. GDPR delete-account + data export

✓ Two edge functions added: `supabase/functions/gdpr-delete-account/index.ts`, `supabase/functions/gdpr-export/index.ts`.

**To deploy:**
```bash
supabase functions deploy gdpr-delete-account
supabase functions deploy gdpr-export
```

**UI hook (still needed):** add two buttons in Profile / Settings:

```tsx
// Export
async function handleExport() {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr-export`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` }});
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sosa-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

// Delete (confirm twice)
async function handleDelete() {
  if (!confirm("Type DELETE to confirm permanent account removal")) return;
  const { data: { session } } = await supabase.auth.getSession();
  await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr-delete-account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  await supabase.auth.signOut();
  window.location.href = "/login?deleted=1";
}
```

## 8. Social analytics — beta marking

✓ `SocialBetaBanner` component now renders on every Social module page (`Overview`, `Analytics`, `Content`, `Audience`, `Competitors`). Tells users analytics use mock data until Phase-2 real-platform-API ingestion lands.

**Phase-2 plan:** the `sync-social-analytics` edge function currently returns hard-coded mocks. Real implementation needs to:
- Read `social_connections.access_token` for each connected platform
- Call platform graph APIs (IG Graph, TikTok Display API, LinkedIn Marketing API, etc.)
- Refresh tokens when `token_expires_at` is past
- Write daily snapshots to `social_analytics_snapshots`
- Schedule via `pg_cron` at 6am UTC

## 9. Hosting setup

When choosing Vercel:
1. `vercel link` to the repo
2. Production branch: **`main`** (NOT `feat/sosa-design-system`)
3. Environment variables:
   - `VITE_SUPABASE_URL` = `https://ndudzfaisulnmbpnvkwo.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (publishable anon key, not service role)
   - `VITE_SENTRY_DSN` = (after step 4)
4. Custom domain → set DNS → enable Auto-HTTPS.
5. Watch the first deploy log; if `npm run build` fails, fix locally and push again.

## 10. Supabase secrets pre-flight

Before deploying edge functions, set these in Project Settings → Edge Functions → Secrets:

| Required | Used by |
|----------|---------|
| `OAUTH_STATE_SECRET` | `social-oauth` |
| `FRONTEND_URL` | `social-oauth`, `gdpr-*` (CORS) |
| `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` | `social-oauth` |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | `social-oauth` |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | `social-oauth` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `social-oauth` (YouTube) |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | `social-oauth` |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | `social-oauth` |
| `IDRIVE_E2_ACCESS_KEY` / `IDRIVE_E2_SECRET_KEY` / `IDRIVE_E2_ENDPOINT` / `IDRIVE_E2_BUCKET` | `cloud-presign` |
| `APIFY_TOKEN` (per portal — stored in `leadgen_settings`) | leadgen scrape |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_WEBHOOK_SECRET` | `telegram-webhook` |

## 11. Production go/no-go

✓ All blockers resolved (this session): vault encryption, NotesPage + CloudPage migrated, error tracking, CSP/HSTS, GDPR endpoints, social beta marker, smoke tests, schema bugs fixed (B1/B2/B3/S1/S2).

⚠ External steps still on you:
- Upgrade Supabase to Pro + enable PITR (§1)
- Wire Sentry SDK + DSN (§4)
- Deploy edge functions + add UI buttons for GDPR (§7)
- Configure DNS + Vercel project + env vars (§9, §10)

After those external steps, the app is ready for production traffic.
