/**
 * The page grain.
 *
 * `assets/concrete-seamless.png` is a tileable photograph of concrete, carried
 * over from the previous version of this app. It is a light-grey image with a
 * mean of 238 and a standard deviation of 4.3 — barely more than a percent of
 * the range — so laying it over the page directly would tint the paper grey
 * long before it read as texture, and would wash out the dark theme entirely.
 *
 * Baked instead into an alpha mask: each pixel records how far *below* the
 * tile's mean it sits, and carries no colour of its own. The stylesheet paints
 * it with `--texture`, which lets the same asset be dark speckle on light paper
 * and light speckle on dark. The spatial pattern — the part that reads as
 * concrete — is the same either way; only the polarity flips.
 *
 * Not wired into a build script, in the same way as fonts.ts and icons.ts: run
 * it when the source changes, commit the result.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/** Deviations beyond this many standard deviations saturate the mask. Set so a
    typical pixel lands mid-range rather than near zero: normalising against the
    single darkest pixel instead would leave the whole tile in the bottom eighth
    of the range, and no opacity that made it visible would look like grain. */
const SPAN_SIGMA = 3;

/** Alpha steps kept. The mask is painted at a few percent opacity, so anything
    finer than this is quantised away by the compositor regardless — and noise
    is incompressible, so the step count is most of the file size. Measured at
    400x400: 8 levels 19.1kb, 12 levels 20.9kb, 16 levels 25.0kb, 24 levels
    25.1kb. 12 is the knee, and lossy encoding is not an option — this is pure
    high-frequency noise, which webp q60 stores *larger* than lossless. */
const LEVELS = 12;

export async function buildTexture() {
	const src = path.resolve('assets/concrete-seamless.png');
	const { data, info } = await sharp(await readFile(src))
		.greyscale()
		.raw()
		.toBuffer({ resolveWithObject: true });

	let mean = 0;
	for (const v of data) mean += v;
	mean /= data.length;

	let variance = 0;
	for (const v of data) variance += (v - mean) ** 2;
	const sigma = Math.sqrt(variance / data.length);

	const span = SPAN_SIGMA * sigma;
	const mask = Buffer.from(
		Uint8Array.from(data, (v) => {
			const below = Math.max(0, mean - v) / span;
			const stepped = Math.round(Math.min(1, below) * (LEVELS - 1)) / (LEVELS - 1);
			return Math.round(stepped * 255);
		})
	);

	const webp = await sharp(mask, {
		raw: { width: info.width, height: info.height, channels: 1 }
	})
		.webp({ lossless: true, effort: 6 })
		.toBuffer();

	const out = path.resolve('static/texture.webp');
	await writeFile(out, webp);
	console.log(
		`  texture.webp  ${info.width}x${info.height}  ${(webp.length / 1024).toFixed(1)}kb` +
			`  (mean ${mean.toFixed(1)}, sigma ${sigma.toFixed(2)}, ${LEVELS} levels)`
	);
}

if (import.meta.filename === process.argv[1]) await buildTexture();
