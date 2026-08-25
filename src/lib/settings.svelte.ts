import type { Units } from './weather.ts';

/**
 * Reader preferences, persisted locally.
 *
 * Units default from the browser's locale rather than being hardcoded: this is
 * a reference tool about the whole world, and almost none of it is on
 * Fahrenheit.
 */
function defaultUnits(): Units {
	if (typeof navigator === 'undefined') return 'c';
	const region = new Intl.Locale(navigator.language).maximize().region;
	// The three holdouts still on Fahrenheit for weather.
	return ['US', 'LR', 'MM'].includes(region ?? '') ? 'f' : 'c';
}

const read = <T extends string>(key: string, fallback: T): T => {
	if (typeof localStorage === 'undefined') return fallback;
	try {
		return (localStorage.getItem(key) as T) ?? fallback;
	} catch {
		return fallback;
	}
};

export const settings = $state({
	units: 'c' as Units,
	theme: 'system' as 'system' | 'light' | 'dark',
	ready: false
});

/** Called once on mount; before this the server-rendered defaults stand. */
export function hydrateSettings() {
	settings.units = read<Units>('units', defaultUnits());
	settings.theme = read('theme', 'system');
	settings.ready = true;
}

export function setUnits(units: Units) {
	settings.units = units;
	try {
		localStorage.setItem('units', units);
	} catch {}
}

export function setTheme(theme: 'system' | 'light' | 'dark') {
	settings.theme = theme;
	try {
		if (theme === 'system') {
			localStorage.removeItem('theme');
			delete document.documentElement.dataset.theme;
		} else {
			localStorage.setItem('theme', theme);
			document.documentElement.dataset.theme = theme;
		}
	} catch {}
}
