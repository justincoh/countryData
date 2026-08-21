<script lang="ts">
	/**
	 * Units and theme. Kept deliberately quiet — the flag field is where this
	 * design spends its attention, and preferences are set once.
	 */
	import { settings, setUnits, setTheme } from '$lib/settings.svelte';

	let open = $state(false);
</script>

<div class="wrap">
	<button
		class="toggle"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-label="Display settings"
	>
		<span aria-hidden="true">{settings.units === 'f' ? '°F' : '°C'}</span>
	</button>

	{#if open}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="scrim" onclick={() => (open = false)} onkeydown={() => {}}></div>
		<div class="menu">
			<fieldset>
				<legend class="label">Units</legend>
				<div class="seg">
					<button class:on={settings.units === 'c'} onclick={() => setUnits('c')}>
						°C · km²
					</button>
					<button class:on={settings.units === 'f'} onclick={() => setUnits('f')}>
						°F · sq mi
					</button>
				</div>
			</fieldset>

			<fieldset>
				<legend class="label">Theme</legend>
				<div class="seg">
					{#each ['system', 'light', 'dark'] as const as option (option)}
						<button class:on={settings.theme === option} onclick={() => setTheme(option)}>
							{option}
						</button>
					{/each}
				</div>
			</fieldset>
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: absolute;
		top: 1.25rem;
		right: 0;
	}

	.toggle {
		font-family: var(--mono);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--rule);
		border-radius: 6px;
		color: var(--muted);
	}

	.toggle:hover {
		color: var(--ink);
		border-color: var(--accent);
	}

	.scrim {
		position: fixed;
		inset: 0;
		z-index: 10;
	}

	.menu {
		position: absolute;
		top: calc(100% + 0.4rem);
		right: 0;
		z-index: 11;
		width: 12.5rem;
		padding: 0.75rem;
		display: grid;
		gap: 0.75rem;
		background: var(--paper);
		border: 1px solid var(--rule);
		border-radius: 10px;
		box-shadow: 0 16px 40px -16px rgb(0 0 0 / 0.45);
	}

	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
	}

	legend {
		padding: 0 0 0.35rem;
	}

	.seg {
		display: flex;
		gap: 2px;
		background: var(--paper-2);
		border-radius: 6px;
		padding: 2px;
	}

	.seg button {
		flex: 1;
		font-size: 0.75rem;
		padding: 0.3rem 0.2rem;
		border-radius: 4px;
		color: var(--muted);
		text-transform: capitalize;
		white-space: nowrap;
	}

	.seg button.on {
		background: var(--paper);
		color: var(--ink);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.14);
	}
</style>
