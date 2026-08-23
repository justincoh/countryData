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

## Verifying visual work

There is no browser tooling configured here. Changes to layout, colour or
animation cannot be self-verified — build, serve with `yarn preview --host`,
and ask rather than claiming a visual change works.

## Unfinished business on `main`

`src/constants.js` on `main` contains a live OpenWeatherMap API key. This
branch deletes the file, but the key remains in git history and should be
revoked at the provider.
