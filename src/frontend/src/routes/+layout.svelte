<script lang="ts">
	import '../app.css';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const navItems = [
		{ href: '/', icon: '⊞', label: 'Oversikt' },
		{ href: '/anskaffelser', icon: '◎', label: 'Anskaffelser' },
		{ href: '/evaluering', icon: '▦', label: 'Evaluering' }
	];
</script>

<div class="app">
	<aside class="sidebar">
		<div class="sidebar-brand">
			<div class="sidebar-brand-icon">◆</div>
			<span class="sidebar-brand-text">Anskaffelser</span>
		</div>

		<ul class="sidebar-nav">
			{#each navItems as item}
				<li>
					<a href={item.href}>
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
		border-right: 1px solid var(--wire);
		padding: var(--sp-4);
		display: flex;
		flex-direction: column;
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		padding: var(--sp-2);
		margin-bottom: var(--sp-6);
	}

	.sidebar-brand-icon {
		width: 28px;
		height: 28px;
		border-radius: var(--r-md);
		background: var(--vekt-bg-strong);
		border: 1px solid rgba(232, 168, 56, 0.2);
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
		gap: var(--sp-1);
	}

	.sidebar-nav a {
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		padding: var(--sp-2) var(--sp-3);
		border-radius: var(--r-sm);
		color: var(--ink-secondary);
		text-decoration: none;
		font-size: 13px;
		font-weight: 500;
		transition: background 0.12s, color 0.12s;
	}

	.sidebar-nav a:hover {
		background: var(--felt);
		color: var(--ink);
	}

	.sidebar-nav :global(a.active) {
		background: var(--vekt-bg);
		color: var(--vekt);
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
		padding: var(--sp-3);
		border-top: 1px solid var(--wire);
		display: flex;
		align-items: center;
		gap: var(--sp-3);
	}

	.sidebar-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--felt-raised);
		border: 1px solid var(--wire-strong);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		font-weight: 600;
		color: var(--ink-secondary);
	}

	.sidebar-user {
		font-size: 12px;
		line-height: 1.3;
	}

	.sidebar-user-name {
		font-weight: 500;
		color: var(--ink);
	}

	.sidebar-user-org {
		color: var(--ink-muted);
		font-size: 11px;
	}

	.workspace {
		flex: 1;
		min-width: 0;
		padding: var(--sp-8) var(--sp-8) var(--sp-12);
		overflow-x: auto;
	}

	@media (max-width: 1024px) {
		.sidebar {
			display: none;
		}
		.workspace {
			padding: var(--sp-4);
		}
	}
</style>
