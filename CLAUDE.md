# CLAUDE.md

Notes that are not recoverable by reading the source. Everything else —
architecture, data sources, deploy steps — is in `README.md` or in comments at
the relevant code.

## Environment trap

This machine has Node 21 at `/usr/local/bin/node` (from the official installer)
and Node 22 under `fnm`. The build needs 22; `.node-version` pins it.

If `fnm` is not active in the shell, `yarn build` fails with an opaque engine
error naming a *dependency* rather than the real problem. `node --version`
before assuming the build is broken.

Node 21 was left in place deliberately rather than being upgraded or replaced —
other things on this machine may depend on it.

## Do not reintroduce runtime country data

Country data is baked at build time on purpose, and this is the single most
important constraint in the repo. REST Countries broke this app three times
(v2 field change, v2 retirement, v3.1 deprecated behind a paywalled v5). If a
field seems to be missing, add it to the build pipeline — do not add a fetch.

Live weather is the one intentional exception.

## Bumping the pinned geometry source

`MLEDOZE_SHA` in `scripts/sources.ts` pins the upstream commit. Bumping it
silently changes national borders and flag artwork, and the diff is 250 files
of coordinates that cannot be meaningfully reviewed. Bump it only deliberately,
and sanity-check disputed territories afterwards — Kosovo in particular ships
as an empty stub upstream and is patched in from Natural Earth.

## The source has no shared borders, so borders will never line up

Adjacent countries in `mledoze` share **zero** vertices. Measured across
France/Germany, France/Spain, France/Belgium, Switzerland/Austria,
Guatemala/Honduras and USA/Canada: not one matching coordinate in any pair.
Each country was derived independently upstream.

This forecloses the obvious fix for the hairline gaps between countries.
Topology-preserving simplification (`topojson-simplify`) works by collapsing
shared arcs, and `topojson.topology()` finds those arcs by exact coordinate
matching — it would find none here. Do not spend time on it.

The only route to matching borders is a source that is a real polygonal
coverage. Natural Earth admin-0 is one, and is already downloaded for the
Kosovo patch: the same six pairs share 43-514 vertices each. Switching to it
would change every border in the app and needs the care described above, so it
is a deliberate project, not a fix.

The current design works around the gaps rather than closing them: the subject
country is an opaque accent fill drawn last, so a neighbour that overlaps goes
underneath and one that falls short leaves an ordinary hairline. An accent
*stroke* on the subject is what made the mismatch conspicuous — it put a bright
line exactly where the two outlines disagree. Do not reintroduce one.

## Ragged coastlines are usually real

Before blaming the simplifier for slivers and specks — the Gironde and Loire
estuaries, the islands off Brittany — render the outline against the
unsimplified source. Those particular ones are real geography, and an attempt
to "fix" them by switching `simplifyRing` to Visvalingam-Whyatt cost 47% more
bytes and silently dropped 31 countries out of `world.json`.

## Verifying visual work

There is no browser tooling configured here. Changes to layout, colour or
animation cannot be self-verified — build, serve with `yarn preview --host`,
and ask rather than claiming a visual change works.

*Geometry* is a different matter, and worth the trouble: `sharp` is already a
dependency, so a throwaway script can rasterise a path into a PNG and read it
back. Better still, measure rather than look — rendering each page's context in
flat black and white and counting land pixels is what found a bug that had put
a fake continent over the whole map on 82 of 221 pages. It had survived
eyeballing precisely because it looked like a plausible landmass. Anything that
can be reduced to a number about the geometry should be.

## The custom domain lives in `CNAME`, not in the GitHub UI

`yarn deploy` runs `gh-pages -t`, which force-pushes and replaces the whole
`gh-pages` branch. Setting a custom domain in the GitHub Pages UI writes a
`CNAME` file to that branch, so the next deploy silently reverts the domain.
The repo's `CNAME` file is the only durable place to set it; `prepare-deploy`
copies it into every build.

## Re-pointing the domain at DreamHost

DNS for `slimatlas.com` is at DreamHost, and it is an *apex* domain, so a
plain CNAME is not legal there. DreamHost supports `ALIAS`, which GitHub Pages
accepts and which is the route used here: an ALIAS at the apex to
`justincoh.github.io.`, tracking whatever IPs GitHub is on rather than pinning
the four `185.199.10[8-11].153` literals. Prefer it to A records for that
reason. It may not synthesize AAAA, so the apex can end up IPv4-only.

DreamHost refuses to point the apex away from its own webservers while the
domain is "Fully Hosted" — it has to be **DNS Only** first. That presents as a
permissions failure rather than a hosting-type conflict, so it is easy to
misread.

`www` is a CNAME to `justincoh.github.io.`; GitHub creates the apex/`www`
redirect itself once both exist.

Changing the domain invalidates the Let's Encrypt certificate, so "Enforce
HTTPS" unticks itself and cannot be re-enabled until the new cert is issued.

## Unfinished business

`src/constants.js` contained a live OpenWeatherMap API key. The rebuild deleted
the file, but the key remains reachable in git history and should be revoked at
the provider.
