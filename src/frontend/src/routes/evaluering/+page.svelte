<script lang="ts">
	import { evaluation } from '$lib/stores/evaluation.svelte';
	import MethodToggle from '$lib/components/evaluation/MethodToggle.svelte';
	import RankingStrip from '$lib/components/evaluation/RankingStrip.svelte';
	import EvaluationMatrix from '$lib/components/evaluation/EvaluationMatrix.svelte';
	import PriceMatrix from '$lib/components/evaluation/PriceMatrix.svelte';
	import InsightsPanel from '$lib/components/insights/InsightsPanel.svelte';
</script>

<header class="eval-header">
	<div class="eval-header-top">
		<h1 class="eval-title">{evaluation.data.title}</h1>
		<div class="eval-status">
			<span class="eval-status-dot"></span>
			{evaluation.data.status}
		</div>
	</div>
	<div class="eval-meta">
		<div class="eval-meta-item">
			<span class="eval-meta-label">Anskaffelse</span>
			<span class="eval-meta-value">Rammeavtale IKT-konsulenttjenester 2024–2028</span>
		</div>
		<div class="eval-meta-item">
			<span class="eval-meta-label">Ref</span>
			<span class="eval-meta-value">{evaluation.data.reference}</span>
		</div>
	</div>
</header>

<MethodToggle />

{#if evaluation.activeMethod === 'poeng'}
	<RankingStrip />
	<EvaluationMatrix />
{:else}
	<RankingStrip />
	<PriceMatrix />
{/if}

<InsightsPanel />

<style>
	.eval-header {
		margin-bottom: var(--sp-8);
	}

	.eval-header-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--sp-4);
		margin-bottom: var(--sp-3);
	}

	.eval-title {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.025em;
		line-height: 1.2;
	}

	.eval-status {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-2);
		padding: var(--sp-1) var(--sp-3);
		border-radius: 100px;
		background: var(--vekt-bg);
		border: 1px solid var(--vekt-bg-strong);
		font-size: 11px;
		font-weight: 600;
		color: var(--vekt);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.eval-status-dot {
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

	.eval-meta {
		display: flex;
		gap: var(--sp-6);
		font-size: 12px;
		color: var(--ink-muted);
	}

	.eval-meta-item {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
	}

	.eval-meta-label {
		color: var(--ink-ghost);
	}

	.eval-meta-value {
		color: var(--ink-secondary);
		font-family: var(--font-data);
		font-size: 11px;
	}
</style>
