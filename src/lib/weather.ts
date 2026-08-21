/**
 * Current conditions from Open-Meteo.
 *
 * Keyless and CORS-open, which matters for a static site: the previous build
 * shipped an OpenWeatherMap key in the bundle, where anyone could read it.
 * There is no key here to leak.
 */
export type Weather = {
	temp: number;
	feelsLike: number;
	code: number;
	isDay: boolean;
	at: number;
};

export type Units = 'c' | 'f';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export async function fetchWeather(
	lat: number,
	lon: number,
	units: Units
): Promise<Weather> {
	const url =
		`${ENDPOINT}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
		`&current=temperature_2m,apparent_temperature,weather_code,is_day` +
		`&temperature_unit=${units === 'f' ? 'fahrenheit' : 'celsius'}`;

	const res = await fetch(url);
	if (!res.ok) throw new Error(`weather -> HTTP ${res.status}`);
	const json = await res.json();
	const c = json.current;

	return {
		temp: c.temperature_2m,
		feelsLike: c.apparent_temperature,
		code: c.weather_code,
		isDay: c.is_day === 1,
		at: Date.now()
	};
}

/**
 * WMO present-weather codes, grouped to the distinctions a reader actually
 * cares about. The full table separates e.g. light/moderate/dense freezing fog;
 * "freezing fog" is the useful part.
 */
const WMO: [number[], string][] = [
	[[0], 'Clear'],
	[[1], 'Mainly clear'],
	[[2], 'Partly cloudy'],
	[[3], 'Overcast'],
	[[45, 48], 'Fog'],
	[[51, 53, 55], 'Drizzle'],
	[[56, 57], 'Freezing drizzle'],
	[[61, 63, 65], 'Rain'],
	[[66, 67], 'Freezing rain'],
	[[71, 73, 75], 'Snow'],
	[[77], 'Snow grains'],
	[[80, 81, 82], 'Rain showers'],
	[[85, 86], 'Snow showers'],
	[[95], 'Thunderstorm'],
	[[96, 99], 'Thunderstorm with hail']
];

export const describe = (code: number) =>
	WMO.find(([codes]) => codes.includes(code))?.[1] ?? 'Unknown';

/** A glyph per condition group, doubling day/night for the clear-sky cases. */
export function glyph(code: number, isDay: boolean) {
	if (code === 0) return isDay ? '☀' : '☾';
	if (code === 1) return isDay ? '☀' : '☾';
	if (code === 2) return '⛅';
	if (code === 3) return '☁';
	if (code === 45 || code === 48) return '≡';
	if (code >= 51 && code <= 67) return '☂';
	if (code >= 71 && code <= 77) return '❄';
	if (code >= 80 && code <= 82) return '☂';
	if (code >= 85 && code <= 86) return '❄';
	if (code >= 95) return '⚡';
	return '·';
}
