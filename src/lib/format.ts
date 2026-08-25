import type { Units } from './weather.ts';

/**
 * Local time at the capital.
 *
 * Formatted straight from the IANA zone, so daylight saving is handled by the
 * platform rather than by parsing a fixed offset, which would ignore DST.
 */
export const timeAt = (timezone: string, date = new Date()) =>
	new Intl.DateTimeFormat(undefined, {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: timezone
	}).format(date);

export const dayAt = (timezone: string, date = new Date()) =>
	new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: timezone }).format(date);

/** Offset from the reader's own clock, which is the thing worth knowing. */
export function offsetFrom(timezone: string, date = new Date()): string {
	const there = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
	const here = new Date(date.toLocaleString('en-US'));
	const hours = (there.getTime() - here.getTime()) / 3_600_000;
	const rounded = Math.round(hours * 2) / 2;
	if (Math.abs(rounded) < 0.25) return 'same as you';
	const sign = rounded > 0 ? '+' : '−';
	const abs = Math.abs(rounded);
	const label = Number.isInteger(abs) ? `${abs}` : `${Math.floor(abs)}½`;
	return `${sign}${label}h from you`;
}

export const number = (n: number) => n.toLocaleString();

export const area = (km2: number, units: Units) =>
	units === 'f'
		? `${Math.round(km2 * 0.386102).toLocaleString()} sq mi`
		: `${Math.round(km2).toLocaleString()} km²`;

export const temperature = (t: number, units: Units) =>
	`${Math.round(t)}°${units === 'f' ? 'F' : 'C'}`;

/** Coordinates in the form a map reader expects. */
export function coords([lat, lon]: [number, number]) {
	const fmt = (v: number, pos: string, neg: string) =>
		`${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;
	return `${fmt(lat, 'N', 'S')}, ${fmt(lon, 'E', 'W')}`;
}
