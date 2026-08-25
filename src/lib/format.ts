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

/**
 * The year-round UTC offset, for text baked into the build.
 *
 * `offsetFrom` is relative to the reader and so cannot be prerendered; a live
 * absolute offset cannot either, because a share card is scraped once and
 * cached, and would then read an hour wrong for half the year. This reports
 * standard time instead. DST only ever moves clocks forward, so the standard
 * offset is the smaller of the January and July offsets — which holds in the
 * southern hemisphere too, where January is the DST half.
 */
export function standardOffset(timezone: string): string {
	const at = (month: number) => {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			timeZoneName: 'shortOffset'
		}).formatToParts(new Date(Date.UTC(2024, month, 1, 12)));
		const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
		const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
		if (!m) return 0;
		return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
	};

	const mins = Math.min(at(0), at(6));
	if (mins === 0) return 'UTC';
	const sign = mins > 0 ? '+' : '\u2212';
	const abs = Math.abs(mins);
	const h = Math.floor(abs / 60);
	const m = abs % 60;
	return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}
