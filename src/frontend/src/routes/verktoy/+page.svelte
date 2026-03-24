<div class="index">
  <header class="header">
    <span class="title">Verktøy</span>
    <span class="subtitle">Hjelpeverktøy for anskaffelser</span>
  </header>

  <div class="cards">
    <a href="/verktoy/kalkulator" class="card">
      <div class="card-title">Terskelverdikalkulator</div>
      <div class="card-desc">Beregn anslått verdi med syv metoder fra § 5-4</div>
      <div class="card-ref">FOA § 5-4</div>
    </a>
    <a href="/verktoy/fristberegner" class="card">
      <div class="card-title">Fristberegner</div>
      <div class="card-desc">Beregn tidslinjer med frister for ulike prosedyrer</div>
      <div class="card-ref">FOA §§ 20-1 til 20-7, 25-2</div>
    </a>
    <a href="/verktoy/unntak" class="card">
      <div class="card-title">Unntaks-veiviser</div>
      <div class="card-desc">Beslutningstre for unntak fra regelverket</div>
      <div class="card-ref">FOA §§ 2-4, 2-5, 3-1 til 3-3, 5-2, 13-3, 13-4</div>
    </a>
  </div>
</div>

<style>
  .index {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px;
  }

  .header {
    padding: 10px 0 24px;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .title {
    font-family: var(--font-prose);
    font-size: 18px;
    font-weight: 700;
    color: var(--color-ink);
  }

  .subtitle {
    font-size: 12px;
    color: var(--color-ink-ghost);
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .card {
    padding: 16px 20px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-wire);
    background: var(--color-felt);
    text-decoration: none;
    transition: border-color 0.12s;
  }

  .card:hover {
    border-color: var(--color-vekt);
  }

  .card-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
    margin-bottom: 4px;
  }

  .card-desc {
    font-size: 12px;
    color: var(--color-ink-secondary);
    margin-bottom: 6px;
  }

  .card-ref {
    font-size: 9px;
    font-family: var(--font-data);
    color: var(--color-ink-ghost);
  }
</style>
