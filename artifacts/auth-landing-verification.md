# Landing, demo and Google authentication verification

Date: 2026-11-16 (Asia/Seoul)

## Implemented

- `/`: explanatory landing page with Google sign-in at the top, hero and bottom; existing approved illustrations; Korean/English and light/dark controls.
- `/demo/*`: retained activity workspaces, five-step hands-on tour, role exploration and earlier device data.
- `/login`: Google sign-in and demo entry. Existing activity URLs redirect to their demo equivalents.
- `/app/*`: server-verified Firebase session required; teacher/admin route access uses only the trusted `reading_role` claim.
- Google popup → ID token verification with revocation check → five-day HttpOnly session cookie → account workspace. Persistent Firebase browser tokens are not used.
- Demo and each account use distinct device storage keys. Backup and restore use the same scope. No automatic cloud synchronization is claimed.
- Logout flushes pending device writes. When saving fails, the user can keep the screen to back up or choose to log out without saving.

## Verified locally

- `npm test`: **106 passed, 0 failed**. Includes 11 authentication/security tests and 3 workspace routing/storage separation tests.
- `npm run build`: passed, including TypeScript.
- Desktop 1440px, mobile 375px and English 320px: no horizontal overflow. Language/theme/grade example/FAQ controls work; no browser page errors observed.
- `/`, `/demo`, `/login`: HTTP 200.
- Anonymous `/app`: HTTP 307 to `/login?next=%2Fapp`.
- `/api/auth/session`: HTTP 200 with `session:null, enabled:true` on the configured local development server.
- Missing-origin and cross-origin login POSTs: 403, no cookie.
- Malformed token POST: 400, no cookie.
- Logout POST from the configured local origin: 200 with cookie removal.
- In the actual browser, the Google button opened **accounts.google.com**, using the configured Firebase OAuth redirect and OpenID/email/profile scope. No credentials were entered and no end-user login was completed.

## External configuration inspection

- Firebase project guard: `chatnovel-e2ccb`.
- Authentication type: `FIREBASE_AUTH`; Google provider enabled.
- `localhost` and `reading-bice-six.vercel.app` were already authorized; no provider/domain changes were made.
- No blocking authentication triggers reported. Cloud Billing and Cloud Functions inventory reads lacked IAM permission; no billing change or backend creation was attempted.
- Existing Vercel project: `jejuai/reading`, `prj_tEa5OhXkSYDAlIo3xDS4SDgcORnc`.
- Twelve authentication/web-configuration variables were installed in **reading Production**, including the server-only sensitive Admin private key. No values are included in this report. No Firestore, Storage, Analytics or paid AI activation was added.

## Deployment failure and recovery

- At **2026-11-16 16:04 KST**, approved source `7b66690` was deployed as `dpl_CGQKE6wnVVwUWfwMtcsziVDSPrW4` to `jejuai/reading`.
- The build reached `READY`, but production requests returned **HTTP 500**. Runtime logs identified `ERR_REQUIRE_ESM`: `firebase-admin@14.5.1` loads `jwks-rsa@4.1.0`, whose CommonJS code requires ESM-only `jose@6.2.17`.
- The failure was independently reproduced locally with `node --no-experimental-require-module -e "require('firebase-admin/auth')"`. A successful build did not establish runtime health.
- **Instant Rollback**, without a new build, restored the previous deployment `dpl_Ex4hkhbqeHiGrSxrxrrSiUicgpvL` / source `6aa8393`. The existing root UI was verified restored at [the public site](https://reading-bice-six.vercel.app).
- At that point the public site served the previous application while the fix was prepared. The subsequent successful release below supersedes that temporary rollback state.
- Matching upstream reports are [Firebase Admin #3181](https://github.com/firebase/firebase-admin-node/issues/3181) and [node-jwks-rsa #507](https://github.com/auth0/node-jwks-rsa/issues/507). The diagnosis here is supported by this deployment's logs and local reproduction, not only those reports.

## Fix and offline production verification

- `next.config.ts` explicitly bundles `firebase-admin`, `jwks-rsa` and `jose` with `transpilePackages`. All installed package versions and authentication/revocation rules are retained.
- After the fix: **106 tests passed, 0 failed**; production build passed.
- `npm run test:auth-runtime`, run after the build, starts the built application on loopback with **`--no-experimental-require-module`** and a freshly generated offline test key. No real end-user identity, real token, or remote authentication request is used.
- **Nine checks passed**: `/`, `/demo`, `/demo/library`, `/login` return 200; anonymous session endpoint returns enabled/null with no-store; `/app` redirects to login; malformed-token POST initializes the Admin SDK then returns 400 without a cookie; cross-origin POST returns 403 without a cookie; logout removes the Secure HttpOnly cookie. No module-loading error was observed.
- This checks the compiled server path that failed in production. It does not prove a complete real Google token exchange or Vercel runtime success.

```powershell
npm test
npm run build
npm run test:auth-runtime
```

## Approved release and public verification

- The user explicitly approved **one additional deployment** of source `e865b71`.
- Deployment `dpl_FEzgtxiRmJNEog4TpfHU1BxLP4sU` was created at **2026-11-16 16:18:59 KST** and reached `READY`. Its unique URL is `https://reading-q2g8jpj8b-jejuai.vercel.app`.
- Before promotion, the protected deployment returned the new root HTML and an enabled anonymous authentication session. The **same build**, without a second build, was then successfully promoted to [reading-bice-six.vercel.app](https://reading-bice-six.vercel.app).
- **Ten public HTTP checks passed**: `/`, `/demo`, `/demo/library`, `/login` returned 200; the session endpoint returned `session:null, enabled:true` with no-store; `/app` redirected to login with 307; a legacy activity route redirected to its demo equivalent with 307; malformed-token POST returned 400 without a cookie; cross-origin POST returned 403 without a cookie; logout returned 200 and removed the Secure HttpOnly session cookie.
- The browser displayed the complete new landing page with enabled Google buttons at the top and bottom. A button opened a real `accounts.google.com` login tab with production context and the Firebase redirect. Inspection inside the popup timed out in automatic review; this was not an unsafe-action determination. No credentials were entered and no end-user login was completed.
- Public production now serves **`e865b71`**, not the temporarily restored `6aa8393`. Git auto-deployment remains disabled; the subsequent documentation-only commit does not create another deployment.

## Temporary access cleanup

- Vercel CLI `curl` automatically created one project automation-bypass token while inspecting the protected deployment. Its creation time was **2026-11-16 16:21:03.766 KST** (`1794813663766`). No token value was printed or committed.
- After verification, the guarded cleanup matched the reading project/team and exact recent creation time, revoked only that token with `regenerate:false`, and re-read the project state.
- Confirmed **zero remaining bypass tokens** and unchanged SSO, password-protection and trusted-IP settings. After revocation, the public session endpoint was checked again: HTTP 200, `session:null, enabled:true`. No replacement token, protection relaxation, new subscription, database, Storage or AI call was added.

## Verification limits

The server cookie exchange/recovery/revocation behavior was tested with injected test adapters. The module-loading fix has passed local production-runtime checks and the public deployment checks above. Actual Google account authentication through a production cookie, session recovery and subsequent authenticated logout remain unverified; opening the Google sign-in tab does not establish those outcomes. Firestore/Storage, cross-device synchronization, school enrollment, and real-time collaboration remain separate and unconnected. Existing saved narration remains part of the released application; no paid AI/image generation was invoked.

Screenshots: `landing-desktop-full.png`, `landing-mobile.png`, `landing-mobile-en.png`, `landing-dark-mobile.png` in this artifacts directory (local-only, excluded from Git).
