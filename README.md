# [Slim Atlas](https://slimatlas.com/)

Get a quick overview of any country: flag, map, local time, current weather, languages and
neighbors.

A few examples, with some of my favorite flags:

<img width="24%" alt="panama" src="https://github.com/user-attachments/assets/2239b606-52cb-4274-b936-d57f47fc2b8a" />
<img width="24%" alt="bhutan" src="https://github.com/user-attachments/assets/1dd34536-b927-4271-b546-75fd3d45fb1c" />
<img width="24%" alt="Rwanda — Countries" src="https://github.com/user-attachments/assets/c8e30650-06b6-49d3-9bb8-2fb1e6582773" />
<img width="24%" alt="micronesia" src="https://github.com/user-attachments/assets/f75bfb93-0547-4c1f-a4ae-b4c6ad000202" />


Every country is a prerendered static page — `/np/`, `/br/`, `/xk/` — so a page
arrives as ~4kb of HTML with its content already in the markup, and the whole
app is about 40kb of JavaScript.

## Running it

Needs Node 22. The repo pins it in `.node-version`; with `fnm` installed it is
picked up automatically on `cd`.

```sh
yarn install
yarn dev          # http://localhost:5173
yarn build        # -> build/
yarn preview      # serve the built site
```

`yarn dev --host` exposes it on the LAN, for verification on mobile.

## Data

Nothing about a country is fetched at runtime. Names, flags, borders, geometry
and populations are baked into the build; the only live call the deployed site
makes is for current weather.

```sh
yarn refresh-data   # re-pull sources and rebuild the baked artefacts
```

| Data | Source | Licence |
| --- | --- | --- |
| Names, capital, area, borders, currencies, languages | [mledoze/countries](https://github.com/mledoze/countries) | MIT |
| Flags and boundary geometry | mledoze `data/`, pinned to a commit | MIT |
| Population | [World Bank](https://data.worldbank.org) `SP.POP.TOTL` | Open |
| Capital coordinates | [Natural Earth](https://www.naturalearthdata.com) 50m | Public domain |
| Capital timezone | [`tz-lookup`](https://www.npmjs.com/package/tz-lookup) | CC0 |
| Current weather (live) | [Open-Meteo](https://open-meteo.com) | Free, no key |

Sources are cached in `.cache/`, so reruns are offline and deterministic.
Delete it to force a fresh pull.

### Things worth knowing about the data

- **Weather and map framing use the capital, not the country centroid.** The
  centroid of Russia is 3,579km from Moscow and the centroid of the USA is
  1,740km from Washington, so centroid weather reports conditions in empty
  taiga and rural Kansas.
- **Local time comes from the capital's IANA zone**, so DST is handled and
  quarter-hour offsets are right. Kathmandu really is 45 minutes past.
- **Population is World Bank, currently 2025 figures**, rather than the numbers
  frozen into the country datasets.

## Map

Outlines are projected to Equal Earth at build time and shipped as static SVG
path strings in one shared coordinate space, so the browser runs no projection
math. Flying to a country animates a `viewBox` — four numbers interpolating —
rather than fetching map tiles. The whole world is 46kb, cached once.

## Deploying

```sh
yarn deploy       # builds, prepares, pushes to the gh-pages branch
```

`prepare-deploy` writes two files the build does not produce on its own:

- **`.nojekyll`** — GitHub Pages runs Jekyll, which silently drops paths
  starting with an underscore. SvelteKit emits `_app/` and `__data.json`, so
  without this the deployed site loads no JavaScript and no data at all.
- **`CNAME`** — the build directory is wiped each time.

The `-t` flag on `gh-pages` is load-bearing: without it dotfiles are skipped,
`.nojekyll` never ships, and the deploy breaks in exactly the way `.nojekyll`
exists to prevent.

The custom domain is the only supported target. Serving from
`justincoh.github.io/countryData` as well would need a different base path, and
one build cannot satisfy both.
