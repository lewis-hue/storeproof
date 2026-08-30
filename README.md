# StoreProof

**Is your music actually on the stores?** StoreProof gives an independent artist the one thing their
distributor cannot: a per-store list of which of their songs are **missing** from which stores, backed
by evidence, and a ready-to-send **re-distribution request** for support.

Built for the micro1 Frontier Engineering Challenge 2026.

---

## Who has this problem, and why it matters

Independent artists distribute through services like DistroKid, which push a release out to 30+ stores
(Spotify, Apple Music, YouTube Music, Amazon, Deezer, Tidal, Audiomack, Boomplay, and more). The
dashboard says "delivered." But **delivered is not the same as live**: songs silently fail to appear on
some stores.

When that happens today, the artist is stuck:

- There is **no report** of what is missing where. The dashboard shows "delivered," not "present on
  each store."
- Checking 30+ stores by hand, per song, is infeasible.
- **Support cannot generate the list either.** (This tool exists because of a real case: a catalogue
  went partly missing from stores, and after a long back-and-forth, support could not produce a list of
  which songs were missing where.) Without that list, nothing can be re-delivered.

The bottleneck is not fixing the delivery. It is **knowing precisely what is broken.** Every day a song
is missing from a store is lost streams, lost royalties, and promotion pointing to a page that does not
exist.

## What StoreProof does

1. You enter your artist name and song titles.
2. StoreProof checks **each song against each store** using targeted web search, and marks it `live`
   (with a link as proof), `missing`, or `unverified`.
3. It rolls this up into the headline deliverable: **missing songs, grouped by store.**
4. It **auto-generates the support email**: an itemised re-distribution request naming each missing song
   under each store, ready to copy or open in your email app.

That is the whole loop the artist could not close before: *find the gaps → hand support the exact list →
get the songs re-delivered.*

## Architecture

StoreProof is deliberately **decoupled into three tiers** so the slow, rate-limited verification never
blocks the web request and can scale on its own, the same shape as the production system it is modelled
on:

```
Browser ──POST /api/verify──▶  Web (Next.js)  ──enqueue──▶  Redis  ──▶  Worker(s)
   ▲                               │  (returns jobId, 202)   (BullMQ)      │  per-store search
   └───────poll /api/verify/:id────┘ ◀──────────── job result ◀────────────┘
```

- **Web tier** (`app/api/verify`) validates input and enqueues a job. It never runs the search, so it
  stays responsive under load. It returns a `jobId`; the client polls for the result.
- **Queue** (`lib/queue.ts`) is BullMQ on Redis, with automatic retries, exponential backoff, and
  self-expiring jobs.
- **Worker tier** (`worker/index.ts`) is a separate process that consumes jobs and does the verification.
  Add replicas to add throughput; the web tier is untouched.
- **Shared core** (`lib/verify.ts`, `lib/email.ts`) is pure, backend-agnostic, and unit-tested
  independently of the infrastructure.

This is the same web → BullMQ/Redis → worker pipeline as the large Catalog Sentinel, in miniature. In
Python this role is Celery; in this TypeScript stack the idiomatic equivalent is BullMQ.

## Run it

The whole decoupled stack (web + Redis + worker) starts with one command. **Demo mode needs zero setup.**

```bash
docker compose up --build
# open http://localhost:3000  (a real sample catalogue is pre-filled — click "Verify my catalogue")
```

Scale the compute tier independently of the web:

```bash
docker compose up --build --scale worker=3
```

- **Demo mode (default):** no key needed; the worker serves a built-in sample catalogue.
- **Live mode:** put a free [Serper](https://serper.dev) key in `.env` (`SERPER_API_KEY=...`) first.

### Local, without Docker

Needs a Redis on `localhost:6379` (`docker run -p 6379:6379 redis:7-alpine`). Then, in two terminals:

```bash
npm ci
npm run worker      # the consumer
npm run dev         # the web tier
```

### Tests + checks (no Redis needed; the core is pure)

```bash
npm ci
npm test && npm run typecheck && npm run lint && npm run build
```

## How it works

- `lib/verify.ts` — the engine. For each `(song, store)` it runs a targeted `"<artist> <title>
  site:<store-domain>"` search and marks the store **live only** when a result on the store's own domain
  also matches the exact title and artist. **Precision over recall:** a store is `missing` only when a
  targeted search finds nothing, and a failed search is `unverified`, never a false "missing."
- `lib/search.ts` — a pluggable `SearchBackend`: the live Serper backend, or a deterministic fixture
  backend for demo mode and tests. The API key never reaches the browser.
- `lib/queue.ts` / `worker/index.ts` — the BullMQ producer and the worker consumer.
- `lib/email.ts` — turns the per-store missing list into the itemised support request.

## Honest limitations

- Web search reflects what search engines have indexed; a brand-new release may lag. Live mode inherits
  Serper's rate limits (a paid tier is needed for large catalogues).
- Precision is favoured over recall, so a genuinely-live song a search cannot surface reads as `missing`
  rather than being wrongly marked absent everywhere; the evidence links let you confirm each verdict.

## Notes

Built with AI coding agents, which is the point of this challenge; every design decision (the
decoupled queue/worker pipeline, the precision-over-recall rule, the pluggable backend, the demo mode,
the email generation) is documented here and in the code so it can be reproduced and explained.
