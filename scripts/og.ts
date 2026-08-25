/**
 * Bakes one OpenGraph share card per country into `static/og/<cc>.png`.
 *
 * og:image cannot be an SVG — Slack, Facebook, iMessage and X all reject it —
 * so the flag has to be rasterised at build time like everything else here.
 *
 * The ground is a fixed dark rather than the country's own `palette.field`.
 * field is derived *from* the flag, so any flag whose outer edge is its
 * dominant colour bleeds into its own background: France's right stripe
 * vanishes and the flag reads two-thirds width. A constant ground makes that
 * predictable, and `flag.edge.onDark` — already computed for the site's dark
 * theme — names the 68 flags that still need a hairline.
 *
 * Type is not the site's IBM Plex. librsvg ignores font-family (every family
 * tested rendered byte-identical output) and cannot load the woff2 subsets in
 * static/fonts, so this is whatever fontconfig hands back. Cards therefore
 * only reproduce on a machine with the same fonts installed.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('static/og');

const W = 1200;
const H = 630;
const MARGIN = 90;
const FLAG_W = 420;
const GUTTER = 60;

const GROUND = '#101216';
const INK = '#ffffff';
const MUTED = '#9aa3ad';
/** Matches --edge-ink in app.css: the ink at 22% over the ground. */
const EDGE = 'rgba(255,255,255,0.22)';

const TEXT_X = MARGIN + FLAG_W + GUTTER;
const TEXT_W = W - TEXT_X - MARGIN;

const esc = (s: string) =>
	s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!);

const label = (text: string, size: number, weight: number, fill: string) =>
	`<text font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`;

/**
 * Actual rendered width, measured rather than estimated from a per-character
 * average — the fallback font is not knowable here, so guessing its metrics
 * would silently overflow the long names.
 */
async function widthOf(text: string, size: number, weight: number): Promise<number> {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 3}" height="${size * 2}">
		<g transform="translate(10 ${size})">${label(text, size, weight, '#fff')}</g></svg>`;
	const { info } = await sharp(Buffer.from(svg)).trim().toBuffer({ resolveWithObject: true });
	return info.width;
}

/** Largest size at or below `max` that fits `text` into TEXT_W. */
async function fit(text: string, max: number, weight: number): Promise<number> {
	const probe = 100;
	const w = await widthOf(text, probe, weight);
	if (w === 0) return max;
	// Glyph advances scale linearly with font-size, so one probe is exact.
	return Math.min(max, Math.floor((TEXT_W / w) * probe));
}

/** Split into two lines at the break that leaves them most even. */
function wrap(text: string): [string, string] | null {
	const words = text.split(' ');
	if (words.length < 2) return null;
	let best: [string, string] | null = null;
	let bestDelta = Infinity;
	for (let i = 1; i < words.length; i++) {
		const a = words.slice(0, i).join(' ');
		const b = words.slice(i).join(' ');
		const delta = Math.abs(a.length - b.length);
		if (delta < bestDelta) [best, bestDelta] = [[a, b], delta];
	}
	return best;
}

export async function buildOgCards(
	countries: {
		code: string;
		name: string;
		capital: string | null;
		flag: { src: string; ratio: number; edge: { onDark: boolean } };
	}[]
) {
	await rm(OUT, { recursive: true, force: true });
	await mkdir(OUT, { recursive: true });

	let wrapped = 0;
	let edged = 0;

	for (const c of countries) {
		const flagH = Math.round(FLAG_W / c.flag.ratio);
		const flagTop = Math.round((H - flagH) / 2);

		// buildFlag emits webp where the source SVG will not rasterise cleanly,
		// so the extension varies; flag.src is the one that is always right.
		const source = await readFile(path.resolve('static', `.${c.flag.src}`));
		const flag = await sharp(source, { density: 300 })
			.resize(FLAG_W, flagH, { fit: 'fill' })
			.png()
			.toBuffer();

		// One line if it fits at a size that still reads as a title, else two.
		let lines: string[];
		let size = await fit(c.name, 76, 700);
		if (size < 48) {
			const pair = wrap(c.name);
			if (pair) {
				lines = pair;
				size = Math.min(await fit(pair[0], 60, 700), await fit(pair[1], 60, 700));
				wrapped++;
			} else {
				lines = [c.name];
			}
		} else {
			lines = [c.name];
		}

		const capSize = await fit(c.capital ?? '', 38, 400);
		const block = lines.length * size * 1.1 + (c.capital ? capSize * 1.6 : 0);
		let y = Math.round((H - block) / 2 + size);

		const text = lines
			.map((line) => {
				const el = `<g transform="translate(${TEXT_X} ${y})">${label(line, size, 700, INK)}</g>`;
				y += Math.round(size * 1.1);
				return el;
			})
			.join('');
		const capital = c.capital
			? `<g transform="translate(${TEXT_X} ${y + Math.round(capSize * 0.6)})">${label(c.capital, capSize, 400, MUTED)}</g>`
			: '';

		// Only where the flag's own edge would disappear into the ground.
		const hairline = c.flag.edge.onDark
			? `<rect x="${MARGIN - 0.5}" y="${flagTop - 0.5}" width="${FLAG_W + 1}" height="${flagH + 1}"
			     rx="3" fill="none" stroke="${EDGE}" stroke-width="1"/>`
			: '';
		if (c.flag.edge.onDark) edged++;

		const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
			<rect width="${W}" height="${H}" fill="${GROUND}"/>
			${hairline}${text}${capital}
		</svg>`;

		const png = await sharp(Buffer.from(canvas))
			.composite([{ input: flag, top: flagTop, left: MARGIN }])
			// Flat colour quantises hard; full-depth PNG roughly triples the size.
			.png({ palette: true, quality: 90, effort: 7 })
			.toBuffer();

		await writeFile(path.join(OUT, `${c.code}.png`), png);
	}

	console.log(`  ${countries.length} cards  (${wrapped} wrapped to two lines, ${edged} with an edge)`);
}
