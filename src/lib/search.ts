/**
 * Country search.
 *
 * Matches native names, capitals, ISO codes and common alternates, so
 * "Holland", "Kathmandu", "Cote d'Ivoire" and "NP" all land somewhere sensible.
 * The old build regex-tested the English name only, and stripped parentheses
 * out of the query to stop the regex throwing.
 */
export type Entry = {
	c: string;        // code
	n: string;        // name
	v: string | null; // native name
	p: string | null; // capital
	a: string[];      // alternates + codes
};

export type Hit = Entry & { why: string | null };

const fold = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();

let cache: Entry[] | null = null;
let inflight: Promise<Entry[]> | null = null;

/** Loaded on first interaction, not on page load — most visits never search. */
export function loadIndex(): Promise<Entry[]> {
	if (cache) return Promise.resolve(cache);
	inflight ??= fetch('/data/search.json')
		.then((r) => r.json())
		.then((rows: Entry[]) => (cache = rows));
	return inflight;
}

/** Rank: exact > prefix > word-start > substring, name before other fields. */
function score(entry: Entry, q: string): [number, string | null] {
	const name = fold(entry.n);
	if (name === q) return [0, null];
	if (name.startsWith(q)) return [1, null];

	const wordStart = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
	if (wordStart.test(name)) return [2, null];

	if (entry.v && fold(entry.v).startsWith(q)) return [3, entry.v];
	if (entry.p && fold(entry.p).startsWith(q)) return [4, `Capital: ${entry.p}`];

	for (const alt of entry.a) {
		const f = fold(alt);
		if (f === q) return [1, alt];
		if (f.startsWith(q)) return [5, alt];
	}

	if (name.includes(q)) return [6, null];
	if (entry.p && fold(entry.p).includes(q)) return [7, `Capital: ${entry.p}`];
	if (entry.v && fold(entry.v).includes(q)) return [8, entry.v];

	return [Infinity, null];
}

export function search(rows: Entry[], query: string, limit = 8): Hit[] {
	const q = fold(query);
	if (!q) return [];

	const scored: [number, Hit][] = [];
	for (const entry of rows) {
		const [rank, why] = score(entry, q);
		if (rank !== Infinity) scored.push([rank, { ...entry, why }]);
	}

	return scored
		.sort((a, b) => a[0] - b[0] || a[1].n.localeCompare(b[1].n))
		.slice(0, limit)
		.map(([, hit]) => hit);
}
