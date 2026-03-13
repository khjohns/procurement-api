<script lang="ts">
  import { page } from '$app/state';

  const id = $derived(page.params.id);
</script>

<div class="saksmappe">
  <div class="placeholder">
    <span class="label">SAKSMAPPE</span>
    <h1>{id}</h1>
    <p>Faseoversikt og saksinformasjon kommer her.</p>
    <nav class="fase-nav">
      <a href="/anskaffelser/{id}/kvalifisering">Kvalifisering</a>
      <a href="/anskaffelser/{id}/evaluering">Evaluering</a>
      <a href="/anskaffelser/{id}/protokoll">Protokoll</a>
    </nav>
  </div>
</div>

<style>
  .saksmappe {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--spacing-8);
  }

  .placeholder {
    text-align: center;
  }

  .label {
    font-family: var(--font-data);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-ink-muted);
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    margin: var(--spacing-2) 0 var(--spacing-2);
  }

  p {
    font-size: 13px;
    color: var(--color-ink-secondary);
    margin-bottom: var(--spacing-6);
  }

  .fase-nav {
    display: flex;
    gap: var(--spacing-4);
    justify-content: center;
  }

  .fase-nav a {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    text-decoration: none;
    padding: var(--spacing-2) var(--spacing-3);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    transition:
      color 150ms,
      border-color 150ms;
  }

  .fase-nav a:hover {
    color: var(--color-vekt);
    border-color: var(--color-vekt);
  }
</style>
