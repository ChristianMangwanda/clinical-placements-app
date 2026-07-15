# Operations

Who owns what, how it deploys, and what's known to be broken or missing.

## Accounts and ownership

Everything runs on free tiers. The only variable cost is Claude API usage.

| Thing | What it is | Action needed on handover |
|---|---|---|
| **Vercel** | Hosting. Auto-deploys `main`. Region `iad1` | Transfer project ownership, or add the new maintainer to the team |
| **Supabase** | The Postgres database. Project ref `cmvhimireghzpyzxzyjs` | Transfer or add member. **Rotate the DB password** — see below |
| **Anthropic Console** | Billing for the AI chat. Paid, usage-based | Reissue `ANTHROPIC_API_KEY` under the new owner and revoke the old one |
| **BEA API key** | Free key for the annual GDP import | Re-register at https://apps.bea.gov/API/signup/ |
| **GitHub** | `ChristianMangwanda/clinical-placements-app`, **public** | Transfer repo, or add the new maintainer as admin |

> **Rotate the database password before handing this over.** It was committed
> to this public repo in `scripts/import_data_supabase.py` in commit `8440b40`
> (2026-03-08) and removed on 2026-07-15. Removing it from the current file
> does not remove it from git history, and the repo is public, so it must be
> treated as compromised regardless. Rotate in Supabase, then update
> `.env.local` and the Vercel env var — production breaks until Vercel is
> updated, so do them together.

## Deploying

Push to `main` → Vercel builds and deploys. There is no staging environment.
`npm run build` locally is the same build, so run it before pushing.

Environment variables live in the Vercel dashboard and must match
[`../.env.example`](../.env.example). Vercel does not read `.env.local`.

## The Supabase keepalive

Supabase pauses free-tier projects after inactivity, and **direct Postgres
connections do not count as activity** — only REST API calls do. Since the app
only ever talks to Postgres, the database would pause despite being in use.

`.github/workflows/supabase-keepalive.yml` pings the REST API on Mondays and
Thursdays to prevent this. It uses the `SUPABASE_URL` and `SUPABASE_ANON_KEY`
**repo secrets** (not app env vars). If those secrets go stale after a rotation,
the workflow silently starts failing and the database eventually pauses — check
the Actions tab if the site goes down for no obvious reason.

## Known issues

Honest list. None of these are hard to live with, but you should know them.

### The API secret is not secret

`NEXT_PUBLIC_API_SECRET` is sent by the browser as an `x-api-secret` header and
compared server-side against `INTERNAL_API_SECRET` (`src/lib/api-security.ts`).
The two must hold the same value for the check to pass — and the `NEXT_PUBLIC_`
prefix means Next.js compiles that value into the client JavaScript bundle,
where anyone can read it in devtools.

So the check stops casual scripted access and nothing else. A real fix means
moving the secret server-side (a session, or a server-side proxy), which is a
project rather than a config change.

### Most routes aren't protected at all

`checkApiSecurity` is applied only to `/api/chat`. `/api/sites`, `/api/search`,
`/api/economic`, `/api/population` and `/api/layers` have no check whatsoever.

### There is no authentication, and the app is public

Anyone with the Vercel URL can use it. An earlier README claimed "access is
controlled at the network level"; that was not true, and commit `812f5a9`
explicitly disabled the domain restriction. Per-user login (Clarkson SSO) is the
obvious next step if the audience widens.

This matters most for `/api/chat`, which spends real money per request. What
actually limits abuse today is the rate limiter (`src/lib/rate-limiter.ts`, 20
requests/minute per IP) — that's the only meaningful control.

### `DATABASE_URL` fails silently

If it's unset, `src/lib/db.ts` falls back to `localhost:5432` rather than
erroring. The app boots and then every query fails. Check this first when
nothing loads.

### `npm run lint` fails

5 errors and 7 warnings, all pre-existing and none of them cosmetic:

| Where | Rule |
|---|---|
| `src/hooks/useFavorites.ts:26` | `react-hooks/set-state-in-effect` |
| `src/components/RadiusOverlay.tsx:76,132` | `react-hooks/refs` |
| `src/components/DataTable.tsx:215` | `react-hooks/preserve-manual-memoization` |
| `src/app/error.tsx:66` | `react/no-unescaped-entities` |

These are real React correctness smells, not style nits, which is why they
weren't blanket-fixed during the July 2026 cleanup — each needs its behaviour
reasoned about, and a careless fix could change how favourites or the radius
tool behave. Worth clearing one at a time with the app open in front of you.
The build does not run ESLint, so these never block a deploy.

### No API route test coverage

The Jest suite covers the SQL validator, the distance math and some components.
It does not test a single API route. The bug that broke the schools layer for
months — a query selecting columns that didn't exist — would have been caught by
one test that actually called `/api/sites`.

## AI chat guardrails

These are real and worth understanding before changing anything in
`src/lib/query-validator.ts`:

1. **Read-only enforcement.** The validator rejects anything that isn't a
   `SELECT`/`WITH` and blocks write and DDL keywords.
2. **Row cap.** Every generated query is capped at 500 rows.
3. **Rate limit.** 20 requests/minute per IP.
4. **Auditability.** Every answer returns the exact SQL it ran, so anyone can
   inspect or re-run it.

The database holds no student or personnel records, so there is no FERPA or PII
exposure. `src/lib/agent-system-prompt.ts` is what teaches the model the schema
— if the AI starts giving wrong answers, that file is the place to look, and
it must be updated whenever the schema changes.

## What's not done

- **Program outcomes** (graduation / licensure pass / employment rates). The
  most requested thing. Never collected; see [DATABASE.md](DATABASE.md).
- **Per-user authentication.**
- **Drive-time isochrones.** The radius rings are labelled 30/60/90 minutes but
  are straight-line Haversine distances (20/45/70 miles). Chosen so the tool
  runs instantly client-side with no routing API.
- **Marker clustering.** The map loads by viewport bounds with a 5,000-row cap
  instead. At 74,772 HRSA points this works, but wide zoom is capped rather than
  aggregated. (Some older docs claimed clustering existed. It never did.)
- **Additional professions** (SLP, AT, Nursing), placement tracking,
  affiliation-agreement status.
