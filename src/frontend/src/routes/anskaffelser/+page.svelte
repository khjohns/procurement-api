<script lang="ts">
	let procurements = $state<Array<{ id: number; name: string; status: string }>>([]);
	let loading = $state(true);
	let error = $state('');

	async function loadProcurements() {
		try {
			const resp = await fetch('/api/procurements');
			if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
			procurements = await resp.json();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Ukjent feil';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		loadProcurements();
	});
</script>

<header class="page-header">
	<h1 class="page-title">Anskaffelser</h1>
</header>

{#if loading}
	<p class="status-text">Henter anskaffelser...</p>
{:else if error}
	<p class="status-text error">{error}</p>
{:else if procurements.length === 0}
	<p class="status-text">Ingen anskaffelser funnet.</p>
{:else}
	<div class="table-wrap">
		<table class="data-table">
			<thead>
				<tr>
					<th>ID</th>
					<th>Navn</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each procurements as p}
					<tr>
						<td class="cell-id">{p.id}</td>
						<td><a href="/evaluering">{p.name || '—'}</a></td>
						<td class="cell-status">{p.status || '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.page-header {
		margin-bottom: var(--spacing-6);
	}

	.page-title {
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.025em;
	}

	.status-text {
		color: var(--color-ink-muted);
		font-size: 13px;
	}

	.status-text.error {
		color: var(--color-score-low);
	}

	.table-wrap {
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
	}

	.data-table th {
		padding: var(--spacing-3);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
		background: var(--color-felt);
		border-bottom: 1px solid var(--color-wire);
		text-align: left;
	}

	.data-table td {
		padding: var(--spacing-3);
		font-size: 13px;
		border-bottom: 1px solid var(--color-wire);
	}

	.data-table tr:last-child td {
		border-bottom: none;
	}

	.data-table tr:hover td {
		background: var(--color-felt-hover);
	}

	.cell-id {
		font-family: var(--font-data);
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	.cell-status {
		font-size: 12px;
		color: var(--color-ink-secondary);
	}

	a {
		color: var(--color-vekt);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
