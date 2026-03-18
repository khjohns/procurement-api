<script lang="ts">
  import { seed, clear, MOCK_PROC_ID } from '$lib/dev/seed-mock-evaluation';
  import { goto } from '$app/navigation';

  let procId = $state(MOCK_PROC_ID);
  let seeded = $state(false);

  function handleSeed() {
    seed(procId);
    seeded = true;
  }

  function handleClear() {
    clear(procId);
    seeded = false;
  }
</script>

<div class="dev-page">
  <h1>Dev — Mock Data</h1>

  <div class="card">
    <h2>Evaluering + protokoll</h2>
    <p>
      Seeder localStorage med realistisk evalueringsdata (4 leverandører, 2 kriterier) og
      protokolldata (innstilt leverandør, karensdager, klagefrist).
    </p>

    <label class="field">
      Procurement ID
      <input type="number" bind:value={procId} />
    </label>

    <div class="actions">
      <button class="btn btn-primary" onclick={handleSeed}>Seed mock data</button>
      <button class="btn" onclick={handleClear}>Tøm</button>
    </div>

    {#if seeded}
      <div class="links">
        <span class="check">Seeded</span>
        <a href="/anskaffelser/{procId}/evaluering">Evaluering</a>
        <a href="/anskaffelser/{procId}/protokoll">Protokoll</a>
        <a href="/anskaffelser/{procId}/meddelelse">Meddelelse</a>
      </div>
    {/if}
  </div>
</div>

<style>
  .dev-page {
    max-width: 600px;
    margin: 0 auto;
    padding: 48px 32px;
    font-family: var(--font-ui);
  }

  h1 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 24px;
    color: var(--color-ink);
  }

  h2 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--color-ink);
  }

  p {
    font-size: 13px;
    color: var(--color-ink-secondary);
    margin-bottom: 16px;
    line-height: 1.5;
  }

  .card {
    padding: 24px;
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--color-ink-secondary);
    margin-bottom: 16px;
  }

  .field input {
    padding: 8px 12px;
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    font-family: var(--font-data);
    font-size: 13px;
    color: var(--color-ink);
    width: 120px;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .btn {
    padding: 8px 16px;
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    background: none;
    color: var(--color-ink-secondary);
    transition: background-color 0.12s;
  }

  .btn:hover {
    background: var(--color-felt-hover);
  }

  .btn-primary {
    background: var(--color-vekt);
    color: var(--color-canvas);
    border-color: transparent;
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    background: var(--color-vekt);
  }

  .links {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
  }

  .check {
    color: var(--color-score-high);
    font-weight: 600;
  }

  .links a {
    color: var(--color-vekt);
    text-decoration: none;
    font-weight: 500;
  }

  .links a:hover {
    text-decoration: underline;
  }
</style>
