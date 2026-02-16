# Artifik MCP Server — Secrets-isolert API-tilgang for Claude Code

**Dato:** 2026-02-16
**Status:** Godkjent design, ikke implementert

## Problemstilling

Claude Code trenger autonom tilgang til Artifik External API (OAuth2 client credentials)
uten å se credentials. Alle kanaler Claude har tilgang til — env vars, Supabase MCP
(`execute_sql` som `postgres`), filer på disk, CLI-verktøy — kan brukes til å lese
hemmeligheter. Hook-baserte guards er defense-in-depth, ikke harde grenser.

### Utprøvde tilnærminger som ikke gir reell isolasjon

| Tilnærming | Hvorfor den feiler |
|------------|-------------------|
| macOS Keychain → env vars via wrapper | Claude kan lese `os.environ` |
| PreToolUse hooks (input-guards) | Kan omgås med string-concatenation |
| PostToolUse hooks (output-guards) | Hook trenger secret-verdier; bedre men ikke hermetisk |
| Supabase Vault | Claude har `postgres`-tilgang via MCP, kan lese `vault.decrypted_secrets` |
| Supabase Vault + RLS-rolle | Claude kan opprette OG fjerne roller via `execute_sql` |
| 1Password `op run` | Samme som env vars |

## Løsning: Dedikert MCP-server med prosessisolasjon

En Python MCP-server som wrapper eksisterende `ArtifikClient`, leser credentials fra
macOS Keychain ved oppstart, og eksponerer Artifik API som typed MCP tools.

### Sikkerhetsmodell

Isolasjonsgrensen er OS-prosessgrensen mellom Claude Code og MCP-serveren.
Claude kommuniserer med MCP-serveren via JSON-RPC over stdio — den kan ikke
lese prosessminne, env vars, eller interne tilstander i MCP-serverprosessen.

```
macOS Keychain
     │
     │ security find-generic-password (ved oppstart)
     ▼
┌─────────────────────────────────┐
│ MCP Server Process               │  ← Claude kan IKKE aksessere
│                                  │
│  credentials.py:                 │
│    api_id, api_key i minne       │
│                                  │
│  client.py:                      │
│    ArtifikClient(api_id, api_key)│
│    OAuth2 token-håndtering       │
│    HTTP-kall til api.artifik.no  │
│                                  │
│  server.py:                      │
│    MCP tools ← auto-registrert  │
│    Returnerer kun domene-data    │
└──────────────┬───────────────────┘
               │ JSON-RPC (stdio)
               │ Kun typed tools + data-responser
               ▼
┌─────────────────────────────────┐
│ Claude Code                      │  ← Ser KUN tool-resultater
│                                  │
│  Kan redigere kildekoden        │
│  Kan IKKE lese prosessminne     │
└─────────────────────────────────┘
```

### Hva Claude kan og ikke kan

| Handling | Tillatt? | Lekker hemmeligheter? |
|----------|----------|----------------------|
| Lese MCP-serverkoden | Ja | Nei — koden refererer Keychain, inneholder ikke verdier |
| Redigere MCP-serverkoden | Ja | Nei — endrer kode, ikke runtime-tilstand |
| Redigere `client.py` | Ja | Nei — credentials injiseres ved runtime |
| Restarte MCP-serveren | Ja | Nei — ny prosess leser Keychain på nytt |
| Kalle MCP tools | Ja | Nei — returnerer kun domene-objekter |
| Lese credentials i prosessminne | Nei | N/A — prosessgrense |

## Arkitektur

### Prosjektstruktur

```
procurement-api/
├── src/
│   ├── app/
│   │   ├── client.py              # Eksisterende ArtifikClient — dekorert med @mcp_tool
│   │   └── ...
│   └── artifik_mcp/
│       ├── __init__.py            # Package
│       ├── __main__.py            # Entry point: python -m artifik_mcp
│       ├── server.py              # MCP server setup + auto-registrering av tools
│       └── credentials.py         # Keychain-lesing + env var fallback
├── tests/
│   └── test_mcp_tools.py          # Verifiser at alle dekorerte metoder er eksponert
├── .claude/
│   ├── mcp.json                   # MCP server config
│   └── ...eksisterende hooks...   # Beholdes som defense-in-depth
└── pyproject.toml                 # Legger til mcp-dependency
```

### MCP-konfigurasjon (`.claude/mcp.json`)

```json
{
  "mcpServers": {
    "artifik": {
      "command": "/Users/kasper/Projects/Catenda/procurement-api/.venv/bin/python",
      "args": ["-m", "artifik_mcp"],
      "cwd": "/Users/kasper/Projects/Catenda/procurement-api"
    }
  }
}
```

### Dekorator-basert tool-registrering

For å unngå drift mellom klient og MCP-tools brukes en dekorator på klientmetoder.
MCP-serveren introspekterer klienten og registrerer alle dekorerte metoder automatisk.

```python
# src/app/client.py
from artifik_mcp.decorator import mcp_tool

class ArtifikClient:
    @mcp_tool(description="List alle anskaffelser for en organisasjon")
    def list_procurements(self, organization_id: str | None = None) -> list[dict]:
        ...

    @mcp_tool(description="Hent hendelseslogg for en anskaffelse")
    def get_procurement_activities(self, procurement_id: str) -> list[dict]:
        ...
```

```python
# src/artifik_mcp/server.py
from mcp.server import Server
from app.client import ArtifikClient

server = Server("artifik")

def register_tools(client: ArtifikClient):
    for method in client.get_mcp_tools():
        # Auto-generer MCP tool fra dekorator-metadata + type hints
        server.add_tool(
            name=method.name,
            description=method.description,
            parameters=method.parameters,  # Fra type hints
            handler=method.handler,
        )
```

**Fordel:** Claude redigerer kun `client.py`. MCP-laget plukker opp endringer automatisk.
Én kilde til sannhet.

**Test mot drift:**

```python
# tests/test_mcp_tools.py
def test_all_public_methods_are_mcp_tools():
    """Alle public metoder (unntatt _private) skal ha @mcp_tool."""
    client = ArtifikClient.__new__(ArtifikClient)
    public_methods = [m for m in dir(client) if not m.startswith('_')]
    mcp_tools = [m.name for m in client.get_mcp_tools()]
    assert set(public_methods) == set(mcp_tools)
```

### Tools — full API-dekning

Alle `ArtifikClient`-metoder eksponeres:

| MCP Tool | Type | Parametre |
|----------|------|-----------|
| `list_procurements` | Read | `org_id?: string` |
| `get_procurement_activities` | Read | `procurement_id: string` |
| `get_smart_doc_responses` | Read | `procurement_id: string` |
| `list_contracts` | Read | `org_id?: string`, `limit_date?: string`, `include_custom_fields?: bool` |
| `get_contract` | Read | `contract_id: string` |
| `list_organizations` | Read | `include_sub_orgs?: bool` |
| `get_organization_activities` | Read | `org_id?: string`, `limit_date?: string` |
| `get_tasks` | Read | `org_id?: string`, `user_id?: string`, `status?: string`, `task_type?: string` |
| `download_archive_zip` | Read | `procurement_id: string` → lagrer til temp-fil, returnerer filsti |
| `list_webhooks` | Read | `org_id?: string` |
| `register_webhook` | Write | `callback_url: string`, `actions: list[string]`, `org_id?: string` |
| `delete_webhook` | Write | `webhook_id: string` |

### Credential-håndtering

```python
# src/artifik_mcp/credentials.py
import os
import subprocess

class KeychainError(Exception):
    pass

def _keychain_read(service: str, account: str) -> str:
    """Les en verdi fra macOS Keychain."""
    result = subprocess.run(
        ["security", "find-generic-password", "-s", service, "-a", account, "-w"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise KeychainError(f"Fant ikke {service}/{account} i Keychain")
    return result.stdout.strip()

def get_credentials() -> tuple[str, str]:
    """Les credentials. Keychain først, env vars som fallback (CI)."""
    try:
        api_id = _keychain_read("procurement-api-id", os.environ["USER"])
        api_key = _keychain_read("procurement-api", os.environ["USER"])
        return api_id, api_key
    except (KeychainError, FileNotFoundError):
        api_id = os.environ["VENDOR_API_ID"]
        api_key = os.environ["VENDOR_API_KEY"]
        return api_id, api_key
```

### Respons-sanitering

MCP-serveren returnerer kun domene-objekter:

- Alle tool-handlers returnerer `dict` eller `list[dict]` — aldri rå HTTP-responser
- `ArtifikAPIError` mappes til MCP-feilrespons med statuskode og årsak,
  men **uten** rå response body (kan inneholde auth-detaljer)
- Binære endepunkter (`download_archive_zip`) lagrer til temp-fil og returnerer filsti

### Eksisterende hooks beholdes

Hook-lagene i `.claude/` beholdes som defense-in-depth:

- `guard-secrets.sh` — blokkerer Bash-kommandoer som refererer hemmeligheter
- `guard-output.sh` — blokkerer output som inneholder secret-verdier
- `guard-file-read.sh` — blokkerer lesing av credential-filer

Disse er ikke primærforsvaret lenger (det er prosessisolasjonen), men de
fanger opp tilfeldige lekkasjer og gir en ekstra sikkerhetsmargin.

## Ulemper og risiko

| Ulempe | Alvorlighet | Mitigering |
|--------|-------------|------------|
| Dobbelt vedlikehold (klient + MCP) | Moderat | Dekorator-mønster → én kilde til sannhet |
| Inkonsistens-drift | Reell risiko | Test som verifiserer alle metoder har MCP-tool |
| Token-overhead (~1800 tokens per samtale) | Lav | Mye mindre enn å laste client.py + OpenAPI-spec |
| Ekstra avhengighet (`mcp` Python-pakke) | Lav | Vedlikeholdt av Anthropic |
| Kun macOS Keychain lokalt | Reell begrensning | Env var fallback for CI/Docker |
| Feilsøking over to lag | Moderat | Logging i MCP-lag + god feilhåndtering |

## Generalitet — reusable pattern

Mønsteret fungerer for enhver ekstern API med credentials:

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Credential  │────▶│  MCP Server  │◀───▶│  Claude Code  │
│ Store       │     │  (prosess-   │     │  (ser kun     │
│             │     │   grense)    │     │   typed tools)│
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────▼───────┐
                    │  External    │
                    │  API         │
                    └──────────────┘
```

Credential-kilden kan byttes uten å endre arkitekturen:
- macOS Keychain (lokal utvikling)
- Environment variables (CI/Docker)
- Cloud secrets manager (produksjon)
- Hardware security module (høysikkerhet)

## Avhengigheter

- `mcp` — Python MCP SDK (Anthropic)
- `certifi` — allerede i bruk for SSL

## Neste steg

Implementasjonsplan lages separat. Hovedsteg:
1. Installer `mcp`-pakken i venv
2. Implementer `credentials.py` (Keychain + fallback)
3. Implementer `@mcp_tool`-dekorator
4. Dekorer eksisterende `ArtifikClient`-metoder
5. Implementer `server.py` med auto-registrering
6. Implementer `__main__.py` entry point
7. Konfigurer `.claude/mcp.json`
8. Skriv drift-test (`test_mcp_tools.py`)
9. Verifiser end-to-end: Claude kaller MCP tool → får data
