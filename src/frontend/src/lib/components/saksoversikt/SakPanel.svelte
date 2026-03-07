<script lang="ts">
	import type { AnskaffelsesHendelse, AnskaffelsesOversiktItem, HendelseType } from '$lib/types/anskaffelse';

	interface Props {
		sak: AnskaffelsesOversiktItem | null;
		erAapen: boolean;
		onclose: () => void;
	}

	let { sak, erAapen, onclose }: Props = $props();

	/** Max characters for description before truncation */
	const BESKRIVELSE_MAKS = 300;

	let beskrivelseFull = $state(false);

	const beskrivelse = $derived(sak?.description ?? '');
	const erLang = $derived(beskrivelse.length > BESKRIVELSE_MAKS);
	const beskrivelseTekst = $derived(
		erLang && !beskrivelseFull ? beskrivelse.slice(0, BESKRIVELSE_MAKS) + '…' : beskrivelse
	);

	// Reset expansion when switching sak
	$effect(() => {
		if (sak) beskrivelseFull = false;
	});

	const hendelser = $derived(
		[...(sak?.hendelser ?? [])].sort(
			(a, b) => new Date(a.dato).getTime() - new Date(b.dato).getTime()
		)
	);

	/** Node-hendelser: those with a lifecycle type (shown in timeline) */
	const nodeHendelser = $derived(hendelser.filter((h) => h.type !== ''));

	/** Non-node hendelser: activities without a lifecycle phase */
	const ovrigeHendelser = $derived(hendelser.filter((h) => h.type === ''));

	/** Action icon mapping for non-node activities */
	const ACTION_IKON: Record<string, string> = {
		PUBLISH_Q8A: '?',
		PUBLISH_ADDITIONAL_INFORMATION: '+',
		PUBLISH_CHANGE_PROCUREMENT: '△',
		WITHDRAW_PARTICIPATION: '←',
		CONVERSATION_MARKED_COMPLETED: '✓',
		CONVERSATION_REOPENED: '↺',
	};

	function ikonForAction(action: string): string {
		return ACTION_IKON[action] ?? '·';
	}

	function formatDato(iso: string): string {
		if (!iso) return '';
		const d = new Date(iso);
		const dag = String(d.getDate()).padStart(2, '0');
		const mnd = String(d.getMonth() + 1).padStart(2, '0');
		const aar = String(d.getFullYear()).slice(2);
		return `${dag}.${mnd}.${aar}`;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && erAapen) onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<aside
	class="panel"
	class:panel-aapen={erAapen}
	aria-label="Anskaffelsesdetalj"
	aria-hidden={!erAapen}
>
	{#if sak}
		<div class="panel-innhold">
			<button class="mobil-tilbake" onclick={onclose}>
				<span aria-hidden="true">&larr;</span> Tilbake
			</button>

			<div class="panel-header">
				<div class="panel-id">{sak.sequenceId}</div>
				<h2 class="panel-tittel">{sak.name}</h2>
				<div class="panel-meta">
					<span class="panel-prosedyre">{sak.procedure}</span>
					<span class="panel-sep">&middot;</span>
					<span class="panel-terskel">{sak.threshold}</span>
				</div>
				<button class="panel-lukk" onclick={onclose} aria-label="Lukk panel">
					<span aria-hidden="true">&#x2715;</span>
				</button>
			</div>

			<div class="panel-body">
				<!-- Beskrivelse -->
				{#if beskrivelse}
					<div class="seksjon">
						<div class="section-label">Beskrivelse</div>
						<p class="beskrivelse">{beskrivelseTekst}</p>
						{#if erLang}
							<button
								class="beskrivelse-toggle"
								onclick={() => (beskrivelseFull = !beskrivelseFull)}
							>
								{beskrivelseFull ? 'Vis mindre' : 'Vis mer'}
							</button>
						{/if}
					</div>
				{/if}

				<!-- Nøkkelinfo -->
				<div class="seksjon">
					<div class="section-label">Nøkkelinfo</div>
					<div class="info-grid">
						<div class="info-rad">
							<span class="info-label">Frist</span>
							<span class="info-verdi">{sak.deadline}</span>
						</div>
						{#if sak.contactPerson}
							<div class="info-rad">
								<span class="info-label">Saksbehandler</span>
								<span class="info-verdi">{sak.contactPerson}</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Hendelsesforløp (node-hendelser) -->
				{#if nodeHendelser.length > 0}
					<div class="seksjon">
						<div class="section-label">Hendelsesforløp</div>
						<div class="forloep">
							{#each nodeHendelser as h, i (i)}
								{@const erSiste = i === nodeHendelser.length - 1}
								<div
									class="forloep-linje"
									class:forloep-besvart={h.besvart}
									class:forloep-siste={erSiste}
								>
									<span class="forloep-dato">{formatDato(h.dato)}</span>
									<div class="forloep-strek" class:forloep-strek-siste={erSiste}></div>
									<span
										class="forloep-node forloep-node-{h.type.toLowerCase()}"
										class:forloep-node-besvart={h.besvart}
										class:forloep-node-avvist={h.avvist}
									>{h.type}</span>
									<span class="forloep-tekst">{h.label}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Øvrige aktiviteter (non-node) -->
				{#if ovrigeHendelser.length > 0}
					<div class="seksjon">
						<div class="section-label">Øvrige aktiviteter</div>
						<div class="ovrige">
							{#each ovrigeHendelser as h, i (i)}
								<div class="ovrig-linje">
									<span class="ovrig-dato">{formatDato(h.dato)}</span>
									<span class="ovrig-ikon">{ikonForAction(h.action)}</span>
									<span class="ovrig-tekst">{h.label}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Lenke -->
				<a href="/anskaffelser/{sak.id}" class="panel-lenke">
					Åpne saksmappe
					<span aria-hidden="true">&rarr;</span>
				</a>
			</div>
		</div>
	{/if}
</aside>

<style>
	.panel {
		width: 460px;
		background: var(--color-felt);
		border-left: 1px solid var(--color-wire-strong);
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		transform: translateX(100%);
		transition: transform 300ms cubic-bezier(0.05, 0.7, 0.1, 1);
		z-index: 100;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		width: 1px;
		background: rgba(255, 255, 255, 0.04);
		z-index: 1;
	}

	.panel-aapen {
		transform: translateX(0);
	}

	.panel-innhold {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel-header {
		padding: 24px;
		border-bottom: 1px solid var(--color-wire-strong);
		position: relative;
		flex-shrink: 0;
	}

	.panel-id {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-muted);
		margin-bottom: 4px;
	}

	.panel-tittel {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-ink);
		line-height: 1.3;
		padding-right: 32px;
		margin: 0;
	}

	.panel-meta {
		margin-top: 8px;
		font-size: 11px;
		color: var(--color-ink-secondary);
	}

	.panel-prosedyre {
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 500;
	}

	.panel-sep {
		color: var(--color-ink-ghost);
		margin: 0 4px;
	}

	.panel-terskel {
		color: var(--color-ink-muted);
	}

	.panel-lukk {
		position: absolute;
		top: 24px;
		right: 24px;
		background: none;
		border: none;
		color: var(--color-ink-ghost);
		cursor: pointer;
		font-size: 16px;
		padding: 4px;
		line-height: 1;
		transition: color 150ms;
	}
	.panel-lukk:hover {
		color: var(--color-ink);
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.seksjon {
		display: flex;
		flex-direction: column;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin-bottom: 8px;
	}

	/* Beskrivelse */
	.beskrivelse {
		font-size: 12px;
		line-height: 1.5;
		color: var(--color-ink-secondary);
		margin: 0;
		white-space: pre-line;
	}

	.beskrivelse-toggle {
		background: none;
		border: none;
		padding: 0;
		margin-top: 4px;
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-ghost);
		cursor: pointer;
		text-align: left;
		transition: color 150ms;
	}

	.beskrivelse-toggle:hover {
		color: var(--color-ink-secondary);
	}

	/* Info grid */
	.info-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.info-rad {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-size: 13px;
	}

	.info-label {
		color: var(--color-ink-secondary);
	}

	.info-verdi {
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
		font-weight: 500;
		color: var(--color-ink);
	}

	/* Hendelsesforløp */
	.forloep {
		display: flex;
		flex-direction: column;
	}

	.forloep-linje {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 0;
		position: relative;
	}

	.forloep-dato {
		font-family: var(--font-data);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-ghost);
		width: 48px;
		flex-shrink: 0;
		text-align: right;
	}

	.forloep-besvart .forloep-dato {
		opacity: 0.6;
	}

	.forloep-strek {
		width: 1px;
		align-self: stretch;
		background: var(--color-wire);
		flex-shrink: 0;
		position: relative;
	}

	.forloep-strek::before {
		content: '';
		position: absolute;
		top: -6px;
		left: 0;
		width: 1px;
		height: calc(100% + 12px);
		background: var(--color-wire);
	}

	.forloep-linje:first-child .forloep-strek::before {
		top: 50%;
		height: 50%;
	}

	.forloep-strek-siste::before {
		height: 50%;
		top: -6px;
	}

	.forloep-node {
		width: 16px;
		height: 16px;
		border-radius: 1px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 8px;
		font-weight: 600;
		flex-shrink: 0;
	}

	/* Per-type color via CSS custom properties from app.css */
	.forloep-node-u { --nc: var(--node-u); }
	.forloep-node-k { --nc: var(--node-k); }
	.forloep-node-f { --nc: var(--node-f); }
	.forloep-node-s { --nc: var(--node-s); }
	.forloep-node-t { --nc: var(--node-t); }
	.forloep-node-e { --nc: var(--node-e); }
	.forloep-node-p { --nc: var(--node-p); }

	.forloep-node { background: var(--nc); border: 1px solid var(--nc); color: var(--color-canvas); }

	/* Besvart nodes */
	.forloep-node-besvart { background: transparent; border-color: var(--nc); color: var(--nc); opacity: 0.6; }

	/* Avvist S-nodes: rose color */
	.forloep-node-avvist { --nc: var(--color-score-low); }

	.forloep-tekst {
		font-size: 12px;
		color: var(--color-ink-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.forloep-besvart .forloep-tekst {
		color: var(--color-ink-muted);
	}

	.forloep-siste:not(.forloep-besvart) .forloep-tekst {
		color: var(--color-ink);
		font-weight: 500;
	}

	/* Øvrige aktiviteter */
	.ovrige {
		display: flex;
		flex-direction: column;
	}

	.ovrig-linje {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
	}

	.ovrig-dato {
		font-family: var(--font-data);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-ghost);
		width: 48px;
		flex-shrink: 0;
		text-align: right;
	}

	.ovrig-ikon {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 9px;
		color: var(--color-ink-ghost);
		flex-shrink: 0;
	}

	.ovrig-tekst {
		font-size: 11px;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Lenke */
	.panel-lenke {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		margin-top: auto;
		padding-top: 16px;
		border-top: 1px solid var(--color-wire);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-muted);
		text-decoration: none;
		transition: color 150ms;
	}

	.panel-lenke:hover {
		color: var(--color-vekt);
	}

	.mobil-tilbake {
		display: none;
	}

	@media (max-width: 1023px) {
		.panel {
			width: 100%;
			position: fixed;
			inset: 0;
			border-left: none;
			background: var(--color-canvas);
			z-index: 25;
		}

		.panel::before {
			display: none;
		}

		.panel-lukk {
			display: none;
		}

		.mobil-tilbake {
			display: flex;
			align-items: center;
			gap: 6px;
			position: sticky;
			top: 0;
			z-index: 1;
			padding: 12px 16px;
			background: var(--color-canvas);
			border: none;
			border-bottom: 1px solid var(--color-wire);
			font-family: var(--font-ui);
			font-size: 13px;
			font-weight: 500;
			color: var(--color-ink-secondary);
			cursor: pointer;
		}

		.mobil-tilbake:hover {
			color: var(--color-ink);
		}

		.panel-header {
			padding: 16px;
		}

		.panel-body {
			padding: 16px;
		}
	}
</style>
