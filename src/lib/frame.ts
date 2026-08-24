/**
 * Camera framing, shared by the map component and the build.
 *
 * The map's camera is fully determined by the subject country's bounding box,
 * so the build can compute exactly which countries land on screen for each
 * page and how much detail they need there. Both sides must agree, hence one
 * module rather than two copies of the arithmetic.
 */

export const VIEW_W = 640;
export const VIEW_H = 460;
/** Fraction of the frame the subject country is allowed to fill. */
export const FILL = 0.62;
/** Nothing zooms closer than this, or a city-state fills the screen with
    a shape simplified for continental scale. */
export const MIN_SPAN = 7;

export type Box = [number, number, number, number];

/** Frame a bbox into the viewport aspect, padded and floored to MIN_SPAN. */
export function frameOf(bbox: Box): Box {
	const [x0, y0, x1, y1] = bbox;
	const cx = (x0 + x1) / 2;
	const cy = (y0 + y1) / 2;
	const aspect = VIEW_W / VIEW_H;

	let w = Math.max((x1 - x0) / FILL, MIN_SPAN);
	let h = Math.max((y1 - y0) / FILL, MIN_SPAN / aspect);
	if (w / h < aspect) w = h * aspect;
	else h = w / aspect;

	return [cx - w / 2, cy - h / 2, w, h];
}

/**
 * Does `bbox` intersect the frame, allowing a margin?
 *
 * The renderer uses 0.35 so a pan reveals land that is already drawn. The
 * build uses more, so the set it bakes is always a superset of what the
 * renderer asks for and no country falls back to the coarse world tier
 * because of a rounding difference.
 */
export const RENDER_PAD = 0.35;
export const BUILD_PAD = 0.45;

export function inFrame(bbox: Box, frame: Box, padFraction: number): boolean {
	const [x, y, w, h] = frame;
	const pad = Math.max(w, h) * padFraction;
	const [a, b, c, d] = bbox;
	return a < x + w + pad && c > x - pad && b < y + h + pad && d > y - pad;
}
