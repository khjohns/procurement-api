<script lang="ts">
  import SaksmappeHeader from '$lib/components/saksmappe/SaksmappeHeader.svelte';
  import SaksmappeSituasjon from '$lib/components/saksmappe/SaksmappeSituasjon.svelte';
  import SaksmappeProsess from '$lib/components/saksmappe/SaksmappeProsess.svelte';
  import SaksmappeDokumenter from '$lib/components/saksmappe/SaksmappeDokumenter.svelte';
  import SaksmappeTeam from '$lib/components/saksmappe/SaksmappeTeam.svelte';
  import { demoSaksmappe } from '$lib/data/saksmappe-demo';

  const { sak, faser, dokumenter, team, frister } = demoSaksmappe;
</script>

<div class="saksmappe-scroll">
  <div class="dokument">
    <SaksmappeHeader {sak} />
    <SaksmappeSituasjon {frister} />

    <div class="main-content">
      <SaksmappeProsess {faser} />

      <div class="bottom-section">
        <div class="bottom-cols">
          <div class="col-dokumenter">
            <SaksmappeDokumenter {dokumenter} />
          </div>
          <div class="col-team">
            <SaksmappeTeam {team} />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .saksmappe-scroll {
    overflow-y: auto;
    height: 100%;
    padding: 24px;
  }

  .dokument {
    max-width: 780px;
    margin: 0 auto;
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    min-height: calc(100vh - 140px);
  }

  .main-content {
    padding: 28px 36px;
  }

  .bottom-section {
    padding-top: 24px;
    border-top: 1px solid var(--color-wire);
  }

  .bottom-cols {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
  }

  .col-dokumenter {
    flex: 1 1 340px;
  }

  .col-team {
    flex: 0 0 220px;
  }
</style>
