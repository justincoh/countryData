/**
 * Capital coordinates.
 *
 * Weather and map framing key off the capital, not the country centroid. That
 * distinction matters: the centroid of Russia sits 3,579km from Moscow and the
 * centroid of the USA is 1,740km from Washington, so centroid-based weather is
 * reporting conditions in empty taiga / rural Kansas.
 *
 * Natural Earth flags sovereign capitals with `adm0cap`, which covers 194
 * countries. The rest are dependencies and territories, resolved by falling
 * back through progressively looser strategies.
 */

type Feature = {
	properties: Record<string, any>;
	geometry: { coordinates: [number, number] };
};

export type CapitalFix = {
	latlng: [number, number];
	/** How the coordinate was resolved — surfaced in the build report. */
	via: 'override' | 'adm0cap' | 'name' | 'territory' | 'centroid';
};

const norm = (s: unknown) =>
	String(s ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');

export function buildCapitalIndex(places: { features: Feature[] }) {
	const byA3 = new Map<string, Feature>();
	const byName = new Map<string, Feature[]>();
	/** Every place sitting inside a given territory, for the territory fallback. */
	const byTerritory = new Map<string, Feature[]>();

	for (const f of places.features) {
		const p = f.properties;
		if (p.adm0cap === 1 && p.adm0_a3) byA3.set(p.adm0_a3, f);

		for (const n of [p.name, p.nameascii, p.namealt, p.ls_name]) {
			if (!n) continue;
			for (const part of String(n).split('|')) {
				const k = norm(part);
				if (!k) continue;
				if (!byName.has(k)) byName.set(k, []);
				byName.get(k)!.push(f);
			}
		}

		for (const code of [p.adm0_a3, p.sov_a3]) {
			if (!code) continue;
			if (!byTerritory.has(code)) byTerritory.set(code, []);
			byTerritory.get(code)!.push(f);
		}
	}

	return { byA3, byName, byTerritory };
}

/**
 * Hand-checked coordinates for the few entries the automatic chain gets wrong.
 * Kept deliberately tiny: every other territory resolves within ~30km, which is
 * inside the resolution of the weather data anyway.
 */
const OVERRIDES: Record<string, [number, number]> = {
	// Large, sparsely settled territory whose centroid falls ~295km inland of
	// the actual seat of government.
	ESH: [27.1536, -13.2033], // El Aaiún
	// Kerguelen research station; the island centroid sits ~75km offshore of it.
	ATF: [-49.3492, 70.2197] // Port-aux-Français
};

const coordsOf = (f: Feature): [number, number] => [
	f.geometry.coordinates[1],
	f.geometry.coordinates[0]
];

export function resolveCapital(
	country: any,
	idx: ReturnType<typeof buildCapitalIndex>
): CapitalFix | null {
	const a3 = country.cca3;
	const capital: string | undefined = country.capital?.[0];

	const override = OVERRIDES[a3];
	if (override) return { latlng: override, via: 'override' };

	// 1. Natural Earth's own sovereign-capital flag.
	const flagged = idx.byA3.get(a3);
	if (flagged) return { latlng: coordsOf(flagged), via: 'adm0cap' };

	// 2. Match the capital's name against any place, preferring one that also
	//    claims to sit in this country so we don't grab a same-named city
	//    elsewhere (there is a Saint-Denis in France and one on Réunion).
	if (capital) {
		const hits = idx.byName.get(norm(capital));
		if (hits?.length) {
			const local = hits.find(
				(f) => f.properties.adm0_a3 === a3 || f.properties.sov_a3 === a3
			);
			return { latlng: coordsOf(local ?? hits[0]), via: 'name' };
		}
	}

	// 3. Largest known settlement inside the territory. Catches scattered
	//    archipelagos where the centroid lands in open ocean — the centroid of
	//    the Marshall Islands is 428km from Majuro.
	const inTerritory = idx.byTerritory.get(a3);
	if (inTerritory?.length) {
		const biggest = [...inTerritory].sort(
			(a, b) => (b.properties.pop_max ?? 0) - (a.properties.pop_max ?? 0)
		)[0];
		return { latlng: coordsOf(biggest), via: 'territory' };
	}

	// 4. Country centroid. Only reached for compact territories and the handful
	//    of entries with no settlements at all (Antarctica, Bouvet Island),
	//    where median centroid->capital error measures ~12km.
	if (country.latlng?.length === 2) {
		return { latlng: [country.latlng[0], country.latlng[1]], via: 'centroid' };
	}

	return null;
}
