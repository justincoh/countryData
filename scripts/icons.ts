/** Rasterises the favicon into the PWA install sizes. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export async function buildIcons() {
	const src = await readFile(path.resolve('static/favicon.svg'));
	const outDir = path.resolve('static/icons');
	await mkdir(outDir, { recursive: true });

	for (const size of [192, 512]) {
		await sharp(src, { density: 384 })
			.resize(size, size)
			.png()
			.toFile(path.join(outDir, `icon-${size}.png`));
	}

	// Maskable needs the mark inset inside the safe zone, or launchers crop it.
	const pad = Math.round(512 * 0.1);
	await sharp({
		create: { width: 512, height: 512, channels: 4, background: '#14161a' }
	})
		.composite([
			{
				input: await sharp(src, { density: 384 })
					.resize(512 - pad * 2, 512 - pad * 2)
					.png()
					.toBuffer(),
				top: pad,
				left: pad
			}
		])
		.png()
		.toFile(path.join(outDir, 'icon-maskable.png'));

	console.log('  3 icons');
}
