<script lang="ts">
	import '../app.css';
	import { themeStore } from '$lib/stores/theme.svelte';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();
	let sidebarOpen = $state(false);

	const navItems = [
		{ href: '/', icon: '⊞', label: 'Oversikt' },
		{ href: '/anskaffelser', icon: '◎', label: 'Anskaffelser' },
		{ href: '/kvalifisering', icon: '☑', label: 'Kvalifisering' },
		{ href: '/evaluering', icon: '▦', label: 'Evaluering' },
		{ href: '/evaluering/ny', icon: '⊕', label: 'Ny evaluering' },
		{ href: '/protokoll', icon: '☰', label: 'Protokoll' }
	];
</script>

<div class="app">
	<!-- Mobile hamburger -->
	<button class="mobile-toggle" onclick={() => (sidebarOpen = true)}>
		<span class="hamburger-line"></span>
		<span class="hamburger-line"></span>
		<span class="hamburger-line"></span>
	</button>

	<!-- Mobile overlay -->
	{#if sidebarOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="sidebar-overlay" onclick={() => (sidebarOpen = false)}></div>
	{/if}

	<aside class="sidebar" class:sidebar-open={sidebarOpen}>
		<div class="sidebar-brand">
			<div class="sidebar-brand-icon">◆</div>
			<span class="sidebar-brand-text">Anskaffelser</span>
		</div>

		<ul class="sidebar-nav">
			{#each navItems as item}
				<li>
					<a href={item.href} onclick={() => (sidebarOpen = false)}>
						<span class="nav-icon">{item.icon}</span>
						{item.label}
					</a>
				</li>
			{/each}
		</ul>

		<div class="sidebar-footer">
			<div class="sidebar-avatar">KJ</div>
			<div class="sidebar-user">
				<div class="sidebar-user-name">Kari Johansen</div>
				<div class="sidebar-user-org">Bergen kommune</div>
			</div>
			<button
				class="theme-toggle"
				onclick={() => themeStore.toggle()}
				title="Tema: {themeStore.label}"
			>
				{themeStore.icon}
			</button>
		</div>
	</aside>

	<main class="workspace">
		{@render children()}
	</main>
</div>

<style>
	.app {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 228px;
		flex-shrink: 0;
		border-right: 1px solid var(--color-wire);
		padding: var(--spacing-4);
		display: flex;
		flex-direction: column;
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-2);
		margin-bottom: var(--spacing-6);
	}

	.sidebar-brand-icon {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-md);
		background: var(--color-vekt-bg-strong);
		border: 1px solid var(--color-vekt-bg-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 13px;
	}

	.sidebar-brand-text {
		font-weight: 600;
		font-size: 14px;
		letter-spacing: -0.01em;
	}

	.sidebar-nav {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.sidebar-nav a {
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
		padding: var(--spacing-2) var(--spacing-3);
		border-radius: var(--radius-sm);
		color: var(--color-ink-secondary);
		text-decoration: none;
		font-size: 13px;
		font-weight: 500;
		transition: background 0.12s, color 0.12s;
	}

	.sidebar-nav a:hover {
		background: var(--color-felt);
		color: var(--color-ink);
	}

	.sidebar-nav :global(a.active) {
		background: var(--color-vekt-bg);
		color: var(--color-vekt);
	}

	.nav-icon {
		width: 16px;
		height: 16px;
		opacity: 0.6;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
	}

	:global(.sidebar-nav a.active .nav-icon) {
		opacity: 1;
	}

	.sidebar-footer {
		margin-top: auto;
		padding: var(--spacing-3);
		border-top: 1px solid var(--color-wire);
		display: flex;
		align-items: center;
		gap: var(--spacing-3);
	}

	.sidebar-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--color-felt-raised);
		border: 1px solid var(--color-wire-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-ink-secondary);
	}

	.sidebar-user {
		font-size: 12px;
		line-height: 1.3;
	}

	.sidebar-user-name {
		font-weight: 500;
		color: var(--color-ink);
	}

	.sidebar-user-org {
		color: var(--color-ink-muted);
		font-size: 11px;
	}

	.theme-toggle {
		margin-left: auto;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-ink-secondary);
		font-size: 14px;
		cursor: pointer;
		transition: background 0.12s, color 0.12s;
	}

	.theme-toggle:hover {
		background: var(--color-felt-hover);
		color: var(--color-ink);
	}

	.theme-toggle:focus-visible {
		outline: none;
		border-color: var(--color-wire-focus);
	}

	.workspace {
		flex: 1;
		min-width: 0;
		padding: var(--spacing-8) var(--spacing-8) var(--spacing-12);
		overflow-x: auto;
	}

	/* ── Mobile toggle ── */
	.mobile-toggle {
		display: none;
		position: fixed;
		top: var(--spacing-3);
		left: var(--spacing-3);
		z-index: 50;
		width: 36px;
		height: 36px;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.12s;
	}

	.mobile-toggle:hover {
		background: var(--color-felt-hover);
	}

	.mobile-toggle:focus-visible {
		outline: none;
		border-color: var(--color-wire-focus);
	}

	.hamburger-line {
		width: 16px;
		height: 1.5px;
		background: var(--color-ink-secondary);
		border-radius: 1px;
	}

	.sidebar-overlay {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 99;
		background: rgba(0, 0, 0, 0.5);
	}

	@media (max-width: 1024px) {
		.mobile-toggle {
			display: flex;
		}

		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			bottom: 0;
			z-index: 100;
			transform: translateX(-100%);
			transition: transform 0.2s ease-out;
			background: var(--color-canvas);
		}

		.sidebar-open {
			transform: translateX(0);
		}

		.sidebar-overlay {
			display: block;
		}

		.workspace {
			padding: var(--spacing-4);
			padding-top: calc(var(--spacing-4) + 48px);
		}
	}
</style>
