import "./style.css";

const app = document.getElementById("app");

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
  return resp.json();
}

function render(html) {
  app.innerHTML = html;
}

async function loadProcurements() {
  render(`<p class="loading">Henter anskaffelser…</p>`);
  try {
    const data = await fetchJSON("/api/procurements");
    if (!Array.isArray(data) || data.length === 0) {
      render(`<p>Ingen anskaffelser funnet.</p>`);
      return;
    }
    const rows = data
      .map(
        (p) => `
      <tr data-id="${p.id}">
        <td>${p.id}</td>
        <td><a href="#" class="procurement-link" data-id="${p.id}">${p.name || p.title || "—"}</a></td>
        <td>${p.status || "—"}</td>
      </tr>`
      )
      .join("");

    render(`
      <table>
        <thead><tr><th>ID</th><th>Navn</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
  } catch (err) {
    render(`<p class="error">Feil: ${err.message}</p>`);
  }
}

// Boot
document.addEventListener("DOMContentLoaded", () => {
  render(`
    <header>
      <h1>Anskaffelser</h1>
      <nav>
        <button id="nav-procurements" class="active">Anskaffelser</button>
        <button id="nav-contracts">Avtaler</button>
      </nav>
    </header>
    <main id="content"></main>
  `);

  loadProcurements();
});
