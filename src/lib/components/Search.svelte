<script lang="ts">
	/**
	 * Search, as a bottom sheet.
	 *
	 * The trigger sits at the bottom of the screen because that is where a thumb
	 * is; the old build anchored its input to the top of a desktop-first column.
	 * Implemented as a real ARIA combobox with roving activedescendant, so it is
	 * navigable by keyboard and announced correctly — the previous dropdown was
	 * a stack of divs read via `event.target.innerText`.
	 */
	import { goto } from '$app/navigation';
	import { loadIndex, search, type Entry, type Hit } from '$lib/search';
	import { tick } from 'svelte';

	let { current }: { current: string } = $props();

	let open = $state(false);
	let query = $state('');
	let active = $state(0);
	let rows = $state<Entry[] | null>(null);
	let input = $state<HTMLInputElement | null>(null);

	const hits = $derived(rows ? search(rows, query) : []);

	async function show() {
		open = true;
		loadIndex().then((r) => (rows = r));
		await tick();
		input?.focus();
	}

	function hide() {
		open = false;
		query = '';
		active = 0;
	}

	function choose(hit: Hit) {
		hide();
		if (hit.c !== current) goto(`/${hit.c}`);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			hide();
			return;
		}
		if (!hits.length) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			active = (active + 1) % hits.length;
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = (active - 1 + hits.length) % hits.length;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			choose(hits[active]);
		}
	}

	$effect(() => {
		query;
		active = 0;
	});

	// Let the sheet be dismissed with the back gesture rather than trapping it.
	$effect(() => {
		if (!open) return;
		const onPop = () => hide();
		window.addEventListener('popstate', onPop);
		return () => window.removeEventListener('popstate', onPop);
	});
</script>

<div class="bar">
	<button class="trigger" onclick={show} aria-haspopup="dialog">
		<span class="icon" aria-hidden="true">⌕</span>
		<span>Search countries</span>
		<kbd class="hint" aria-hidden="true">/</kbd>
	</button>
</div>

<svelte:window
	onkeydown={(e) => {
		if (!open && e.key === '/' && !/^(INPUT|TEXTAREA)$/.test((e.target as HTMLElement)?.tagName)) {
			e.preventDefault();
			show();
		}
	}}
/>

{#if open}
	<div
		class="scrim"
		role="button"
		tabindex="-1"
		aria-label="Close search"
		onclick={hide}
		onkeydown={(e) => e.key === 'Escape' && hide()}
	></div>

	<div class="sheet" role="dialog" aria-modal="true" aria-label="Search countries">
		<div class="field">
			<span class="icon" aria-hidden="true">⌕</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:this={input}
				bind:value={query}
				onkeydown={onKeydown}
				type="text"
				role="combobox"
				aria-expanded={hits.length > 0}
				aria-controls="search-results"
				aria-autocomplete="list"
				aria-activedescendant={hits.length ? `hit-${active}` : undefined}
				placeholder="Country, capital or code"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
			/>
			<button class="close" onclick={hide} aria-label="Close search">Esc</button>
		</div>

		<ul id="search-results" role="listbox" aria-label="Results">
			{#each hits as hit, i (hit.c)}
				<li
					id="hit-{i}"
					role="option"
					aria-selected={i === active}
					class:active={i === active}
				>
					<button onclick={() => choose(hit)} onmouseenter={() => (active = i)}>
						<span class="emoji" aria-hidden="true">{hit.c.toUpperCase()}</span>
						<span class="name">
							{hit.n}
							{#if hit.why}<span class="why">{hit.why}</span>{/if}
						</span>
					</button>
				</li>
			{/each}

			{#if query && rows && !hits.length}
				<li class="empty">No country matches “{query}”. Try a capital or an ISO code.</li>
			{/if}
		</ul>
	</div>
{/if}

<style>
	.bar {
		position: sticky;
		bottom: 0;
		z-index: 20;
		padding: 0.6rem var(--gutter);
		padding-bottom: calc(0.6rem + env(safe-area-inset-bottom));
		background: color-mix(in oklab, var(--paper) 88%, transparent);
		backdrop-filter: blur(12px);
		border-top: 1px solid var(--rule);
	}

	.trigger {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		max-width: var(--measure);
		margin-inline: auto;
		padding: 0.7rem 0.9rem;
		background: var(--paper-2);
		border: 1px solid var(--rule);
		border-radius: 999px;
		color: var(--muted);
		text-align: left;
	}

	.icon {
		font-size: 1.1rem;
		color: var(--accent);
	}

	.hint {
		margin-left: auto;
		font-family: var(--mono);
		font-size: 0.75rem;
		padding: 0.1rem 0.4rem;
		border: 1px solid var(--rule);
		border-radius: 4px;
	}

	.scrim {
		position: fixed;
		inset: 0;
		z-index: 30;
		background: rgb(0 0 0 / 0.4);
		animation: fade 0.18s var(--ease);
		border: 0;
	}

	.sheet {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 31;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		background: var(--paper);
		border-top: 1px solid var(--rule);
		border-radius: 14px 14px 0 0;
		padding-bottom: env(safe-area-inset-bottom);
		animation: rise 0.22s var(--ease);
	}

	@media (min-width: 40rem) {
		.sheet {
			inset: 8vh 50% auto auto;
			transform: translateX(50%);
			width: min(32rem, 92vw);
			border-radius: 14px;
			border: 1px solid var(--rule);
			box-shadow: 0 24px 60px -20px rgb(0 0 0 / 0.5);
		}
	}

	.field {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.9rem 1rem;
		border-bottom: 1px solid var(--rule);
	}

	input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: none;
		color: var(--ink);
		/* 16px minimum, or iOS zooms the viewport on focus. */
		font-size: 1rem;
		font-family: var(--sans);
	}

	input:focus {
		outline: none;
	}

	.close {
		font-family: var(--mono);
		font-size: 0.7rem;
		color: var(--muted);
		border: 1px solid var(--rule);
		border-radius: 4px;
		padding: 0.15rem 0.4rem;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0.35rem;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	li button {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.6rem 0.65rem;
		border-radius: 8px;
		text-align: left;
	}

	li.active button {
		background: var(--paper-2);
	}

	.emoji {
		font-family: var(--mono);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		color: var(--muted);
		border: 1px solid var(--rule);
		border-radius: 4px;
		padding: 0.15rem 0.3rem;
		flex-shrink: 0;
	}

	.name {
		min-width: 0;
	}

	.why {
		display: block;
		font-size: 0.8125rem;
		color: var(--muted);
	}

	.empty {
		padding: 1rem 0.75rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	@keyframes rise {
		from {
			transform: translateY(100%);
		}
	}

	@media (min-width: 40rem) {
		@keyframes rise {
			from {
				transform: translate(50%, -8px);
				opacity: 0;
			}
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}
</style>
