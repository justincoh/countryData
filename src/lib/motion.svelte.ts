/** Tracks the user's reduced-motion preference reactively. */
export const reducedMotion = $state({ current: false });

if (typeof window !== 'undefined') {
	const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
	reducedMotion.current = mq.matches;
	mq.addEventListener('change', (e) => (reducedMotion.current = e.matches));
}
