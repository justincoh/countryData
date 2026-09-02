<script lang="ts">
	/**
	 * Credit line. Deliberately the quietest thing on the page: it lives at the
	 * end of the content column rather than after the sticky search bar, which
	 * would otherwise sit on top of it.
	 */

	// Baked at prerender, so a rebuild rolls it over.
	const year = new Date().getFullYear();
</script>

<footer>
	© {year} <a href="https://justinjoyce.dev/projects/">Justin Joyce</a>
</footer>

<style>
	footer {
		margin-top: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--rule);
		font-family: var(--mono);
		font-size: 0.6875rem;
		letter-spacing: 0.04em;
		color: var(--muted);
	}

	a {
		color: inherit;
		text-decoration-color: var(--rule);
		text-underline-offset: 0.25em;
		transition: color 0.16s var(--ease);
	}

	a:hover {
		color: var(--accent);
	}
</style>
