<script lang="ts">
	/**
	 * The map.
	 *
	 * Every outline was projected to Equal Earth at build time and arrives as a
	 * static `d` string in one shared coordinate space, so there is no
	 * projection maths here and nothing is recomputed per frame. Flying to a
	 * country is a single animated `viewBox` — four numbers interpolating.
	 */
	import { onMount } from 'svelte';
	import { reducedMotion } from '$lib/motion.svelte';

	type Shape = { d: string; bbox: [number, number, number, number] };

	let {
		code,
		outline,
		neighbors = [],
		onselect
	}: {
		code: string;
		outline: Shape | null;
		neighbors?: { code: string; name: string }[];
		onselect?: (code: string) => void;
	} = $props();

	const VIEW_W = 640;
	const VIEW_H = 460;
	/** Fraction of the frame the country is allowed to fill. */
	const FILL = 0.62;
	/** Nothing zooms closer than this, or a city-state fills the screen with
	    a shape simplified for continental scale. */
	const MIN_SPAN = 7;

	let world = $state<Record<string, Shape> | null>(null);
	let box = $state<[number, number, number, number]>([0, 0, 1000, 485]);
	let drawn = $state(false);
	let frame: number | null = null;

	/** Frame a bbox into the viewport aspect, padded and floored to MIN_SPAN. */
	function frameOf(bbox: [number, number, number, number]) {
		const [x0, y0, x1, y1] = bbox;
		const cx = (x0 + x1) / 2;
		const cy = (y0 + y1) / 2;
		const aspect = VIEW_W / VIEW_H;

		let w = Math.max((x1 - x0) / FILL, MIN_SPAN);
		let h = Math.max((y1 - y0) / FILL, MIN_SPAN / aspect);
		if (w / h < aspect) w = h * aspect;
		else h = w / aspect;

		return [cx - w / 2, cy - h / 2, w, h] as [number, number, number, number];
	}

	const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

	function flyTo(target: [number, number, number, number], instant = false) {
		if (frame) cancelAnimationFrame(frame);
		if (instant || reducedMotion.current) {
			box = target;
			return;
		}

		const from = box;
		const start = performance.now();
		const duration = 760;

		const step = (now: number) => {
			const t = Math.min(1, (now - start) / duration);
			const k = easeOutCubic(t);
			box = [
				from[0] + (target[0] - from[0]) * k,
				from[1] + (target[1] - from[1]) * k,
				from[2] + (target[2] - from[2]) * k,
				from[3] + (target[3] - from[3]) * k
			];
			if (t < 1) frame = requestAnimationFrame(step);
			else frame = null;
		};
		frame = requestAnimationFrame(step);
	}

	onMount(async () => {
		const res = await fetch('/data/world.json');
		const json = await res.json();
		world = json.shapes;
	});

	const selfShape = $derived(outline ?? world?.[code] ?? null);

	// Fly whenever the country changes and we have something to aim at.
	$effect(() => {
		const shape = selfShape;
		if (!shape) return;
		const target = frameOf(shape.bbox);
		// First paint lands already framed; later changes animate.
		flyTo(target, !drawn);
		drawn = true;
	});

	/** Only draw what is actually inside the frame — keeps the DOM at a few
	    dozen nodes instead of 250 paths. */
	const visible = $derived.by(() => {
		if (!world) return [];
		const [x, y, w, h] = box;
		const pad = Math.max(w, h) * 0.35;
		return Object.entries(world).filter(([cc, s]) => {
			if (cc === code) return false;
			const [a, b, c, d] = s.bbox;
			return a < x + w + pad && c > x - pad && b < y + h + pad && d > y - pad;
		});
	});

	const neighborCodes = $derived(new Set(neighbors.map((n) => n.code)));
	const nameOf = (cc: string) => neighbors.find((n) => n.code === cc)?.name ?? cc;
</script>

<div class="map">
	<svg
		viewBox={box.join(' ')}
		preserveAspectRatio="xMidYMid meet"
		role="img"
		aria-label="Map showing the location of this country"
	>
		<!-- Surrounding land, deliberately quiet: context, not content. -->
		<g class="context">
			{#each visible as [cc, shape] (cc)}
				{#if neighborCodes.has(cc)}
					<path
						class="neighbor"
						d={shape.d}
						role="button"
						tabindex="0"
						aria-label="Go to {nameOf(cc)}"
						onclick={() => onselect?.(cc)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								onselect?.(cc);
							}
						}}
					/>
				{:else}
					<path class="other" d={shape.d} />
				{/if}
			{/each}
		</g>

		{#if selfShape}
			<!-- pathLength normalises the dash animation, so a 4,000-point
			     coastline and a single island draw in the same time. -->
			<path class="self" d={selfShape.d} pathLength="1" />
		{/if}
	</svg>
</div>

<style>
	.map {
		position: relative;
		aspect-ratio: 64 / 46;
		width: 100%;
		background: var(--paper-2);
		border: 1px solid var(--rule);
		border-radius: var(--radius);
		overflow: hidden;
	}

	svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.other {
		fill: var(--rule);
		stroke: var(--paper-2);
		stroke-width: 0.35;
		vector-effect: non-scaling-stroke;
	}

	.neighbor {
		fill: color-mix(in oklab, var(--accent) 16%, var(--rule));
		stroke: var(--paper-2);
		stroke-width: 0.35;
		vector-effect: non-scaling-stroke;
		cursor: pointer;
		transition: fill 0.18s var(--ease);
	}

	.neighbor:hover,
	.neighbor:focus-visible {
		fill: color-mix(in oklab, var(--accent) 38%, var(--rule));
	}

	.self {
		fill: color-mix(in oklab, var(--accent) 26%, transparent);
		stroke: var(--accent);
		stroke-width: 1.6;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
		animation: trace 1s var(--ease) both;
	}

	/* The boundary inks itself in — the gesture the app is actually about. */
	@keyframes trace {
		from {
			stroke-dasharray: 1;
			stroke-dashoffset: 1;
			fill-opacity: 0;
		}
		to {
			stroke-dasharray: 1;
			stroke-dashoffset: 0;
			fill-opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.self {
			animation: none;
		}
	}
</style>
