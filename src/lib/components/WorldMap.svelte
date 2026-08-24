<script lang="ts">
	/**
	 * The map.
	 *
	 * Every outline was projected to Equal Earth at build time and arrives as a
	 * static `d` string in one shared coordinate space, so there is no
	 * projection maths here and nothing is recomputed per frame. Flying to a
	 * country is a single animated `viewBox` — four numbers interpolating.
	 *
	 * Surrounding land comes from two places. `context` is baked for this page
	 * specifically — simplified for this zoom, clipped to this frame — and is
	 * what you see once the camera has settled. `world.json` is one coarse copy
	 * of the planet, shared by every page and fetched once; it covers the wide
	 * shots the camera passes through on the way in, where its half-pixel-at-
	 * globe-scale accuracy is plenty.
	 */
	import { onMount } from 'svelte';
	import { reducedMotion } from '$lib/motion.svelte';
	import { RENDER_PAD, frameOf, inFrame, type Box } from '$lib/frame';

	type Shape = { d: string; bbox: Box };

	let {
		code,
		outline,
		context = null,
		neighbors = [],
		onselect
	}: {
		code: string;
		outline: Shape | null;
		context?: { clip: Box; shapes: { code: string; d: string }[] } | null;
		neighbors?: { code: string; name: string }[];
		onselect?: (code: string) => void;
	} = $props();

	let world = $state<Record<string, Shape> | null>(null);
	let box = $state<Box>([0, 0, 1000, 485]);
	let drawn = $state(false);
	let frame: number | null = null;

	const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

	function flyTo(target: Box, instant = false) {
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

	/**
	 * The baked context stops at its clip rectangle. Draw it only while the
	 * camera is inside that rectangle; step outside and a coastline would
	 * simply end in a straight line where the clip cut it.
	 *
	 * At rest the camera is always well inside, so this is what a visitor sees.
	 * It gives way to world.json partway through a fly between countries, while
	 * the camera is still moving.
	 */
	const inClip = $derived.by(() => {
		if (!context) return false;
		const [x, y, w, h] = box;
		const [cx, cy, cw, ch] = context.clip;
		return x >= cx && y >= cy && x + w <= cx + cw && y + h <= cy + ch;
	});

	/** Only draw what is actually inside the frame — keeps the DOM at a few
	    dozen nodes instead of 250 paths. */
	const visible = $derived.by((): [string, { d: string }][] => {
		if (inClip && context) {
			// Already exactly this frame's countries; no filtering needed.
			return context.shapes.map((s) => [s.code, s]);
		}
		if (!world) return [];
		return Object.entries(world).filter(
			([cc, s]) => cc !== code && inFrame(s.bbox, box, RENDER_PAD)
		);
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
			<path class="self" d={selfShape.d} />
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

	/*
	 * Solid accent, no outline.
	 *
	 * This was a translucent fill under a 1.6px accent stroke, which put a
	 * bright line exactly where the geometry is least trustworthy. Adjacent
	 * countries come from the source with no shared border vertices — not one,
	 * between any pair — so a boundary is two independently simplified lines
	 * that disagree by a couple of pixels. Stroked, that read as a bright edge
	 * floating in a gap. Filled, the subject simply covers the disagreement:
	 * it is drawn last and opaque, so a neighbour that overlaps goes under it
	 * and one that falls short leaves the same hairline every other border has.
	 */
	.self {
		fill: var(--accent);
		animation: land 0.55s var(--ease) both;
	}

	/* The country arrives rather than drawing itself. The outline used to ink
	   itself in along the stroke; there is no stroke left to ink. */
	@keyframes land {
		from {
			fill-opacity: 0;
		}
		to {
			fill-opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.self {
			animation: none;
		}
	}
</style>
