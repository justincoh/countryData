/**
 * Boundary geometry -> static SVG path strings.
 *
 * All projection happens here, at build time. The browser receives plain `d`
 * attributes in a single shared coordinate space and never runs projection
 * maths, so "fly to a country" is just an animated `viewBox` — one attribute
 * interpolating, no geometry recomputed per frame.
 *
 * Equal Earth is used rather than Web Mercator because the app shows whole
 * countries at a glance; Mercator would render Greenland larger than Africa.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

/** Width of the shared projected space. Height falls out of the projection. */
export const WORLD_W = 1000;
export const WORLD_H = 485;

const projection = geoEqualEarth().fitExtent(
	[
		[0, 0],
		[WORLD_W, WORLD_H]
	],
	{ type: 'Sphere' } as any
);

export type Geom = {
	/** SVG path data in the shared world space. */
	d: string;
	/** [minX, minY, maxX, maxY] in the shared world space. */
	bbox: [number, number, number, number];
};

/**
 * Perpendicular-distance simplification. Runs on lon/lat before projection,
 * with the longitude axis scaled by cos(latitude) so the tolerance stays
 * roughly uniform on the ground instead of collapsing polar coastlines.
 */
function simplifyRing(ring: number[][], tolerance: number): number[][] {
	if (ring.length <= 4 || tolerance <= 0) return ring;

	const k = Math.cos((ring[0][1] * Math.PI) / 180) || 1;
	const keep = new Uint8Array(ring.length);
	keep[0] = keep[ring.length - 1] = 1;

	const stack: [number, number][] = [[0, ring.length - 1]];
	while (stack.length) {
		const [first, last] = stack.pop()!;
		if (last - first < 2) continue;

		const [ax, ay] = ring[first];
		const [bx, by] = ring[last];
		const dx = (bx - ax) * k;
		const dy = by - ay;
		const len = Math.hypot(dx, dy);

		let worst = -1;
		let worstAt = -1;
		for (let i = first + 1; i < last; i++) {
			const px = (ring[i][0] - ax) * k;
			const py = ring[i][1] - ay;
			const dist =
				len === 0 ? Math.hypot(px, py) : Math.abs(px * dy - py * dx) / len;
			if (dist > worst) {
				worst = dist;
				worstAt = i;
			}
		}

		if (worst > tolerance) {
			keep[worstAt] = 1;
			stack.push([first, worstAt], [worstAt, last]);
		}
	}

	const out = ring.filter((_, i) => keep[i]);
	// A ring needs 4 positions (first == last) to still describe an area.
	return out.length >= 4 ? out : ring;
}

/** Rough lon/lat bounding-box area, used to drop specks at low detail. */
const ringArea = (ring: number[][]) => {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const [x, y] of ring) {
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	}
	return (maxX - minX) * (maxY - minY);
};

function simplifyGeometry(geom: any, tolerance: number, minArea: number): any {
	if (!geom) return null;

	const doPolygon = (rings: number[][][]) => {
		const out = rings
			.filter((r, i) => i === 0 || ringArea(r) >= minArea)
			.map((r) => simplifyRing(r, tolerance));
		return out.length ? out : null;
	};

	if (geom.type === 'Polygon') {
		const rings = doPolygon(geom.coordinates);
		return rings ? { type: 'Polygon', coordinates: rings } : null;
	}

	if (geom.type === 'MultiPolygon') {
		const polys = geom.coordinates
			.filter((p: number[][][]) => ringArea(p[0]) >= minArea)
			.map((p: number[][][]) => doPolygon(p))
			.filter(Boolean);
		// Never let a country vanish entirely: keep its largest part.
		if (!polys.length) {
			const biggest = [...geom.coordinates].sort(
				(a: number[][][], b: number[][][]) => ringArea(b[0]) - ringArea(a[0])
			)[0];
			return { type: 'Polygon', coordinates: doPolygon(biggest)! };
		}
		return { type: 'MultiPolygon', coordinates: polys };
	}

	return geom;
}

/** lon/lat extent of a geometry, used to scale detail to displayed size. */
function lonLatExtent(geom: any): number {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	const visit = (c: any) => {
		if (typeof c[0] === 'number') {
			if (c[0] < minX) minX = c[0];
			if (c[0] > maxX) maxX = c[0];
			if (c[1] < minY) minY = c[1];
			if (c[1] > maxY) maxY = c[1];
		} else for (const n of c) visit(n);
	};
	if (!geom?.coordinates) return 0;
	visit(geom.coordinates);
	return Math.max(maxX - minX, maxY - minY);
}

/**
 * A country is always framed to fill roughly the same amount of screen, so the
 * detail it needs scales with how many degrees it spans, not with its absolute
 * size. Canada spanning 90deg of longitude gets simplified far harder than
 * Luxembourg spanning 0.5deg, and both land at a comparable on-screen accuracy.
 * Without this, Canada's outline alone costs 53kb gzipped.
 */
const adaptiveTolerance = (extentDeg: number, targetPx: number, errPx: number) =>
	Math.max(0.004, (extentDeg / targetPx) * errPx);

export async function loadGeometry(
	dataDir: string,
	cca3: string,
	opts: {
		tolerance?: number;
		minArea?: number;
		digits: number;
		targetPx?: number;
		errPx?: number;
		supplemental?: Record<string, any>;
	}
): Promise<Geom | null> {
	let raw: any[] = [];
	try {
		const topo = JSON.parse(
			await readFile(path.join(dataDir, `${cca3.toLowerCase()}.topo.json`), 'utf8')
		);
		const key = Object.keys(topo.objects)[0];
		const collection: any = feature(topo, topo.objects[key]);
		raw = collection.features.map((f: any) => f.geometry).filter(Boolean);
	} catch {
		/* fall through to the supplemental source */
	}

	// mledoze ships an empty stub for Kosovo (`"type": null`), which would
	// otherwise leave a country with a flag and full facts but no shape.
	if (!raw.length && opts.supplemental?.[cca3]) raw = [opts.supplemental[cca3]];
	if (!raw.length) return null;

	// Scale simplification to how large the country renders, not how large it is.
	const extent = Math.max(...raw.map(lonLatExtent), 0.001);
	const tolerance = opts.tolerance ?? adaptiveTolerance(extent, opts.targetPx ?? 640, opts.errPx ?? 0.9);
	const minArea = opts.minArea ?? Math.pow(extent / 260, 2);

	const merged = {
		type: 'GeometryCollection',
		geometries: raw
			.map((g: any) => simplifyGeometry(g, tolerance, minArea))
			.filter(Boolean)
	};

	if (!merged.geometries.length) return null;

	const pathGen = geoPath(projection).digits(opts.digits);
	const d = pathGen(merged as any);
	if (!d) return null;

	const [[x0, y0], [x1, y1]] = pathGen.bounds(merged as any);
	return { d, bbox: [x0, y0, x1, y1] };
}
