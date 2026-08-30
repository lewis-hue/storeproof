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
some stores, and lyrics often never propagate.

When that happens today, the artist is stuck:

- There is **no report** of what is missing where. The distributor's dashboard shows "delivered," not
  "actually present on each store."
- Checking 30+ stores by hand, per song, is infeasible.
- **Support cannot generate the list either.** (This tool exists because of a real case: a catalogue
  went partly missing from stores, and after a long back-and-forth, support could not produce a list of
  which songs were missing where.) Without that list, nothing can be re-delivered.

The bottleneck is not fixing the delivery. It is **knowing precisely what is broken.** Every day a song
is missing from a store is lost streams, lost royalties, and promotion pointing listeners to a page that
does not exist.

## What StoreProof does

1. You enter your artist name and song titles (paste or type).
2. StoreProof checks **each song against each store** using targeted web search, and marks it `live`
   (with a link as proof), `missing`, or `unverified`.
3. It rolls this up into the headline deliverable: **missing songs, grouped by store.**
4. It **auto-generates the support email**: an itemised re-distribution request naming each missing song
   under each store, ready to copy or open in your email app.

That is the whole loop the artist could not close before: *find the gaps → hand support the exact list →
get the songs re-delivered.*

## How it improves the way this is handled today

| Today | With StoreProof |
| --- | --- |
| Trust "delivered"; discover gaps by accident | Verify actual presence on each store, with proof links |
| Check stores one by one, by hand | One run covers every song across every store |
| Support cannot produce a missing-songs list | The list is the output |
| Describe the problem vaguely in a support ticket | Send an itemised, per-store re-distribution request |

## Run it

Reproducible, no accounts required. **Demo mode works with zero setup.**

```bash
npm install
npm run dev
# open http://localhost:3000  (a real sample catalogue is pre-filled — just click "Verify my catalogue")
```

- **Demo mode (default):** with no API key, StoreProof serves a built-in sample catalogue so a judge can
  see the full flow (missing list + generated email) instantly.
- **Live mode:** for real checks against live search results, add a free [Serper](https://serper.dev) key:

  ```bash
  cp .env.example .env
  # set SERPER_API_KEY=... in .env, then:
  npm run dev
  ```

Run the tests:

```bash
npm test        # unit tests for the verification engine + email generator
npm run typecheck
```

## How it works

- `lib/verify.ts` — the engine. For each `(song, store)` it runs a targeted `"<artist> <title>
  site:<store-domain>"` search and marks the store **live only** when a result on the store's own domain
  also matches the exact title and artist. **Precision over recall:** a store is `missing` only when a
  targeted search finds nothing, and a failed search is `unverified`, never a false "missing" (a false
  alarm would send an artist chasing a problem that is not there).
- `lib/search.ts` — a pluggable `SearchBackend`: the live Serper backend, or a deterministic fixture
  backend used for demo mode and tests. The API key never reaches the browser.
- `lib/email.ts` — turns the per-store missing list into the itemised support request.
- `app/api/verify/route.ts` — server route that runs the engine (live or demo).
- `app/page.tsx` — the UI: verify, read the report, copy or send the email.

## Honest limitations

- Web search reflects what search engines have indexed; a brand-new release may lag. Live mode inherits
  Serper's rate limits (a paid tier is needed for large catalogues).
- Precision is favoured over recall, so a genuinely-live song a search cannot surface reads as `missing`
  rather than being wrongly marked absent everywhere; the evidence links let you confirm each verdict.

## Notes

Built with AI coding agents, which is the point of this challenge; every design decision (the
precision-over-recall rule, the pluggable backend, the demo mode, the email generation) is documented
here and in the code so it can be reproduced and explained.
