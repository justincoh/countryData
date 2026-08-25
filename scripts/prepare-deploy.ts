/**
 * Post-build steps GitHub Pages needs.
 *
 * Pages runs Jekyll over whatever it is given, and Jekyll silently drops paths
 * beginning with an underscore. SvelteKit emits `_app/` and `__data.json`, so
 * without .nojekyll the deployed site loads no JavaScript and no page data —
 * it fails completely rather than degrading.
 *
 * CNAME has to be re-copied because the build directory is wiped each time.
 */
import { copyFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const BUILD = path.resolve('build');

async function main() {
	try {
		await access(BUILD);
	} catch {
		throw new Error('build/ does not exist — run `yarn build` first');
	}

	await writeFile(path.join(BUILD, '.nojekyll'), '');
	await copyFile(path.resolve('CNAME'), path.join(BUILD, 'CNAME'));

	console.log('  build/.nojekyll  (keeps Jekyll from stripping _app/)');
	console.log('  build/CNAME      (slimatlas.com)');
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
