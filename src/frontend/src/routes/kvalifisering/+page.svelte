<script lang="ts">
	import { qualification } from '$lib/stores/qualification.svelte';
	import QualificationSummary from '$lib/components/qualification/QualificationSummary.svelte';
	import QualificationMatrix from '$lib/components/qualification/QualificationMatrix.svelte';
</script>

<header class="qual-header">
	<div class="qual-header-top">
		<h1 class="qual-title">{qualification.data.title}</h1>
		<div class="qual-status">
			<span class="qual-status-dot"></span>
			{qualification.data.status}
		</div>
	</div>
	<div class="qual-meta">
		<div class="qual-meta-item">
			<span class="qual-meta-label">Anskaffelse</span>
			<span class="qual-meta-value">Rammeavtale IKT-konsulenttjenester 2024–2028</span>
		</div>
		<div class="qual-meta-item">
			<span class="qual-meta-label">Ref</span>
			<span class="qual-meta-value">{qualification.data.reference}</span>
		</div>
	</div>
</header>

<QualificationSummary />
<QualificationMatrix />

<style>
	.qual-header {
		margin-bottom: var(--sp-8);
	}

	.qual-header-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--sp-4);
		margin-bottom: var(--sp-3);
	}

	.qual-title {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.025em;
		line-height: 1.2;
	}

	.qual-status {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-2);
		padding: var(--sp-1) var(--sp-3);
		border-radius: 100px;
		background: var(--vekt-bg);
		border: 1px solid rgba(232, 168, 56, 0.15);
		font-size: 11px;
		font-weight: 600;
		color: var(--vekt);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.qual-status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--vekt);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.qual-meta {
		display: flex;
		gap: var(--sp-6);
		font-size: 12px;
		color: var(--ink-muted);
	}

	.qual-meta-item {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
	}

	.qual-meta-label {
		color: var(--ink-ghost);
	}

	.qual-meta-value {
		color: var(--ink-secondary);
		font-family: var(--font-data);
		font-size: 11px;
	}
</style>
