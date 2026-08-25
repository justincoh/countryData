/**
 * Self-hosted webfonts.
 *
 * The app is installable and works offline, so it cannot depend on a request to
 * fonts.gstatic.com at paint time. Downloads the woff2 files once into
 * static/fonts and emits a local @font-face stylesheet.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FAMILIES = [
	'IBM+Plex+Sans+Condensed:wght@500;600;700',
	'IBM+Plex+Sans:wght@400;500',
	'IBM+Plex+Mono:wght@400;500;600'
];

// Modern UA so Google serves woff2 with unicode-range subsets.
const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
	'(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export async function buildFonts() {
	const outDir = path.resolve('static/fonts');
	await mkdir(outDir, { recursive: true });

	const url =
		'https://fonts.googleapis.com/css2?' +
		FAMILIES.map((f) => `family=${f}`).join('&') +
		'&display=swap';

	const res = await fetch(url, { headers: { 'User-Agent': UA } });
	if (!res.ok) throw new Error(`google fonts -> HTTP ${res.status}`);
	let css = await res.text();

	// Latin and latin-ext only. Native names in other scripts fall back to the
	// system font, which already has better coverage for them than any subset
	// we could ship.
	const blocks = css.split('/*').filter((b) => /^\s*(latin|latin-ext)\s*\*/.test(b));
	css = blocks.map((b) => '/*' + b).join('');

	const seen = new Map<string, string>();
	const urls = [...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]);

	let downloaded = 0;
	for (const remote of new Set(urls)) {
		const name = remote.split('/').slice(-2).join('-');
		if (!seen.has(remote)) {
			const bin = await fetch(remote, { headers: { 'User-Agent': UA } });
			await writeFile(path.join(outDir, name), Buffer.from(await bin.arrayBuffer()));
			seen.set(remote, `/fonts/${name}`);
			downloaded++;
		}
		css = css.replaceAll(remote, seen.get(remote)!);
	}

	await writeFile(path.join(outDir, 'fonts.css'), css);
	console.log(`  ${downloaded} woff2 files, ${(css.length / 1024).toFixed(1)}kb css`);
}
