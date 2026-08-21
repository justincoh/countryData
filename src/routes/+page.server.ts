import { allCountries } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = () => ({
	// Every code is inlined so the landing page can pick one before paint,
	// without loading the app bundle or the search index first.
	codes: allCountries.map((c) => c.code),
	// A server-picked country renders for anyone without JavaScript.
	fallback: allCountries[Math.floor(Math.random() * allCountries.length)]
});
