/**
 * Flag assets + the palette the UI is themed from.
 *
 * Two formats by necessity. Most flags are geometry (stripes, crosses) and are
 * a few hundred bytes as SVG, where a raster would be ~13kb. A minority carry
 * detailed coats of arms and run to hundreds of kilobytes as SVG — Mexico is
 * 337kb — where a WebP at display resolution is 14kb. Each flag gets whichever
 * format is smaller for it.
 */
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';
import { optimize } from 'svgo';

/** Above this gzipped SVG size, a raster is smaller than the vector. */
const RASTER_THRESHOLD = 12 * 1024;
const RASTER_WIDTH = 900;

export type FlagAsset = {
	ext: 'svg' | 'webp';
	body: Buffer;
	/** Intrinsic aspect ratio, so the layout reserves space and never shifts. */
	ratio: number;
	/**
	 * Whether the flag fills its own bounding box. Nepal is the only national
	 * flag that does not, and an edge treatment drawn on the box would trace a
	 * rectangle that isn't there. Detected rather than hardcoded so it stays
	 * correct if upstream ever adds another.
	 *
	 * Build-time only -- it gates `edge` below rather than shipping to the app.
	 */
	rectangular: boolean;
	/**
	 * Whether the hero needs to draw this flag an edge, per theme. See
	 * `edgeVanishes`.
	 */
	edge: { onLight: boolean; onDark: boolean };
};

/* The two page grounds a flag can sit on, from --paper in app.css. Duplicated
   because the build cannot read the stylesheet; they move about once a year and
   a drift here only softens a hairline, so a shared token is not worth the
   indirection. */
const PAPER_LIGHT: RGB = [0xf4, 0xf5, 0xf7];
const PAPER_DARK: RGB = [0x10, 0x12, 0x16];

/** Below this contrast against the page, a flag's own edge reads as no edge. */
const EDGE_MIN_CONTRAST = 1.5;
/** How much of the perimeter has to vanish before the hero draws one. */
const EDGE_FAINT_SHARE = 0.12;

/**
 * Does this flag's own boundary disappear into `bg`?
 *
 * Angola's lower half is black and vanishes on dark paper; Japan's field is
 * white and vanishes on light. Both need a drawn hairline, and neither needs
 * one in the other theme, so this is asked once per theme.
 *
 * Sampled two pixels in from the bounding box, clear of the antialiased outer
 * edge, and judged on the share of the perimeter that vanishes rather than the
 * average: a flag whose white stripe merely reaches the edge still loses that
 * stretch of its outline. Both thresholds are tuned -- at a 1.5 cut the dark
 * count runs 34 to 97 across cuts from 1.25 to 2.0, so they are not arbitrary
 * and not obvious.
 */
async function edgeVanishes(svg: Buffer, bg: RGB): Promise<boolean> {
	const W = 96, H = 64, INSET = 2;
	const { data, info } = await sharp(svg, { density: 150 })
		.resize({ width: W, height: H, fit: 'fill' })
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	const at = (x: number, y: number): RGB | null => {
		const i = (y * info.width + x) * info.channels;
		// Nepal's transparent corners are not edge, they are absence of flag.
		if (data[i + 3] < 128) return null;
		return [data[i], data[i + 1], data[i + 2]];
	};

	const ring: RGB[] = [];
	for (let x = INSET; x < W - INSET; x++) {
		for (const y of [INSET, H - 1 - INSET]) {
			const p = at(x, y);
			if (p) ring.push(p);
		}
	}
	for (let y = INSET; y < H - INSET; y++) {
		for (const x of [INSET, W - 1 - INSET]) {
			const p = at(x, y);
			if (p) ring.push(p);
		}
	}
	if (!ring.length) return false;

	const faint = ring.filter((c) => contrast(c, bg) < EDGE_MIN_CONTRAST).length;
	return faint / ring.length >= EDGE_FAINT_SHARE;
}

/** True when a meaningful share of the bounding box is transparent. */
async function isRectangular(svg: Buffer): Promise<boolean> {
	const { data, info } = await sharp(svg, { density: 72 })
		.resize({ width: 48, height: 32, fit: 'fill' })
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	let clear = 0;
	const pixels = info.width * info.height;
	for (let i = 0; i < data.length; i += info.channels) {
		if (data[i + 3] < 128) clear++;
	}
	// Antialiased edges leave a sliver transparent on any flag; 2% separates
	// that from a genuinely non-rectangular shape.
	return clear / pixels <= 0.02;
}

export async function buildFlag(svg: Buffer): Promise<FlagAsset> {
	const optimized = optimize(svg.toString('utf8'), {
		multipass: true,
		floatPrecision: 2,
		plugins: ['preset-default']
	}).data;

	const meta = await sharp(svg, { density: 300 }).metadata();
	const ratio = (meta.width ?? 3) / (meta.height ?? 2);
	const rectangular = await isRectangular(svg);

	// A ring is drawn on the bounding box, so a flag that does not fill its own
	// box never gets one however faint its edge is.
	const edge = rectangular
		? {
				onLight: await edgeVanishes(svg, PAPER_LIGHT),
				onDark: await edgeVanishes(svg, PAPER_DARK)
			}
		: { onLight: false, onDark: false };

	if (gzipSync(Buffer.from(optimized)).length <= RASTER_THRESHOLD) {
		return { ext: 'svg', body: Buffer.from(optimized), ratio, rectangular, edge };
	}

	const webp = await sharp(svg, { density: 300 })
		.resize({ width: RASTER_WIDTH })
		// alpha:true so a non-rectangular flag heavy enough to rasterise keeps
		// its shape instead of gaining a black box.
		.webp({ quality: 82, effort: 6, alphaQuality: 100 })
		.toBuffer();
	return { ext: 'webp', body: webp, ratio, rectangular, edge };
}

/* ---------------------------------------------------------------- palette */

type RGB = [number, number, number];

const srgbToLinear = (c: number) => {
	const s = c / 255;
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance. */
const luminance = ([r, g, b]: RGB) =>
	0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

/** WCAG contrast ratio between two colours. */
export const contrast = (a: RGB, b: RGB) => {
	const la = luminance(a);
	const lb = luminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const toHex = ([r, g, b]: RGB) =>
	'#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
	const R = r / 255, G = g / 255, B = b / 255;
	const max = Math.max(R, G, B), min = Math.min(R, G, B);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h: number;
	if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
	else if (max === G) h = ((B - R) / d + 2) / 6;
	else h = ((R - G) / d + 4) / 6;
	return [h, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): RGB {
	if (s === 0) return [l * 255, l * 255, l * 255];
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	const f = (t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/**
 * Nudge lightness until the colour clears a contrast ratio against `bg`,
 * preserving hue. Flag colours are chosen for symbolism, not legibility —
 * Ukraine's yellow is 1.6:1 on white — so an unadjusted flag colour cannot be
 * used for text or small UI marks.
 */
function ensureContrast(rgb: RGB, bg: RGB, target: number): RGB {
	if (contrast(rgb, bg) >= target) return rgb;
	const [h, s] = rgbToHsl(rgb);
	const darken = luminance(bg) > 0.5;

	let best = rgb;
	for (let i = 1; i <= 100; i++) {
		const l = darken ? 0.5 - (i / 100) * 0.5 : 0.5 + (i / 100) * 0.5;
		const candidate = hslToRgb([h, s, l]);
		best = candidate;
		if (contrast(candidate, bg) >= target) break;
	}
	return best;
}

export type Palette = {
	/** Dominant flag colours, most-used first, unmodified. */
	colors: string[];
	/** The country's signature colour: the most chromatic one in the flag.
	    Currently unused by the UI -- the hero used to tint its background with
	    this, which hid sky-blue-and-white flags like Guatemala's. Kept so that
	    experiment is one line to restore; not dead code to clean up. */
	field: string;
	/** Accent adjusted to clear 4.5:1 on a light surface. */
	onLight: string;
	/** Accent adjusted to clear 4.5:1 on a dark surface. */
	onDark: string;
};

const WHITE: RGB = [255, 255, 255];
const NEAR_BLACK: RGB = [18, 18, 20];

export async function extractPalette(svg: Buffer): Promise<Palette> {
	const { data, info } = await sharp(svg, { density: 150 })
		.resize({ width: 64, height: 40, fit: 'fill' })
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	// Coarse histogram: 5 bits per channel is enough to group flag colours,
	// which are flat fills rather than photographic gradients.
	const buckets = new Map<number, { sum: RGB; n: number }>();
	for (let i = 0; i < data.length; i += info.channels) {
		// Nepal is the only non-rectangular national flag; without this its
		// transparent corners sample as black and take over the palette.
		if (data[i + 3] < 128) continue;
		const rgb: RGB = [data[i], data[i + 1], data[i + 2]];
		const key =
			((rgb[0] >> 3) << 10) | ((rgb[1] >> 3) << 5) | (rgb[2] >> 3);
		const e = buckets.get(key) ?? { sum: [0, 0, 0] as RGB, n: 0 };
		e.sum[0] += rgb[0]; e.sum[1] += rgb[1]; e.sum[2] += rgb[2];
		e.n++;
		buckets.set(key, e);
	}

	const ranked = [...buckets.values()]
		.sort((a, b) => b.n - a.n)
		.map((e) => [e.sum[0] / e.n, e.sum[1] / e.n, e.sum[2] / e.n] as RGB);

	// Keep visually distinct entries so a flag's shading doesn't fill the palette.
	const distinct: RGB[] = [];
	for (const c of ranked) {
		if (distinct.every((d) => Math.hypot(d[0] - c[0], d[1] - c[1], d[2] - c[2]) > 60)) {
			distinct.push(c);
		}
		if (distinct.length === 4) break;
	}

	// Rank by chroma, discounting colours pushed toward black or white, so the
	// accent is a colour someone would actually name when describing the flag.
	const chroma = (c: RGB) => {
		const [, s, l] = rgbToHsl(c);
		return s * (1 - Math.abs(l - 0.5) * 1.2);
	};
	const accent = [...distinct].sort((a, b) => chroma(b) - chroma(a))[0] ?? distinct[0];

	return {
		colors: distinct.map(toHex),
		field: toHex(accent),
		onLight: toHex(ensureContrast(accent, WHITE, 4.5)),
		onDark: toHex(ensureContrast(accent, NEAR_BLACK, 4.5))
	};
}
