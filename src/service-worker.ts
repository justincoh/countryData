/// <reference types="@sveltejs/kit" />
/**
 * Offline support.
 *
 * Because the entire dataset is baked, everything except live weather works
 * with no connection. The app shell, fonts, geometry and search index are
 * precached; flags are cached as you visit countries, since precaching all 250
 * would mean a 1.9mb install for a set most readers will never look at.
 */
import { build, files, version } from '$service-worker';

const SHELL = `shell-${version}`;
const RUNTIME = `runtime-${version}`;

/** Shipped assets worth having before the network disappears. */
const PRECACHE = [
	...build,
	...files.filter(
		(f) =>
			f.startsWith('/fonts/') ||
			f === '/data/world.json' ||
			f === '/data/search.json' ||
			f === '/manifest.webmanifest' ||
			f === '/favicon.svg'
	)
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(SHELL)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== SHELL && k !== RUNTIME).map((k) => caches.delete(k))
				)
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Weather is the one genuinely live thing; never serve it from cache.
	if (url.hostname.endsWith('open-meteo.com')) return;
	if (url.origin !== location.origin) return;

	event.respondWith(
		(async () => {
			const cached = await caches.match(request);
			if (cached) return cached;

			try {
				const response = await fetch(request);
				// Cache prerendered pages and flags as they are visited.
				if (response.ok && response.type === 'basic') {
					const cache = await caches.open(RUNTIME);
					cache.put(request, response.clone());
				}
				return response;
			} catch {
				// An uncached page while offline: fall back to anything we have.
				const shell = await caches.match('/');
				if (shell) return shell;
				throw new Error('offline and uncached');
			}
		})()
	);
});
