# Plan: LLM-vurdering av begrunnelser

## Mål

Brukeren skriver begrunnelser for poenggivningen i evalueringsmatrisen. En LLM vurderer kvaliteten på begrunnelsene — ikke om de er *korrekte*, men om de er *tilstrekkelige og konsistente med poengsettingen*. Alle score-avvik beregnes ferdig av appen slik at LLM-en kun gjør kvalitativ tekstanalyse.

---

## Steg 1: Frontend — `buildReviewPayload()` i evaluation store

Ny eksportert funksjon i `src/frontend/src/lib/stores/evaluation.svelte.ts` som serialiserer evalueringsdata til et strukturert JSON-objekt for ett kriterium og én leverandør.

Funksjonen bruker eksisterende `$derived`-verdier (`groupScores`, `itemScores`, `bestScores`, `bestGroupScores`, `ranking`) og beregner delta mot benchmark (beste leverandør).

```typescript
interface ReviewPayload {
  procurement: { name: string; reference: string };
  method: 'poeng' | 'pris';
  suppliers: { id: string; name: string }[];
  criterion: {
    name: string;
    weight: number;
    mode: 'leaf' | 'traditional' | 'resource';
    supplier: {
      name: string;
      score: number;
      benchmark: { supplier: string; score: number };
      delta: number;
      criterionJustification: string;
      // Bare for resource mode:
      roles?: {
        name: string;
        score: number;
        benchmark: { supplier: string; score: number };
        delta: number;
        moments: { name: string; score: number; benchmarkScore: number; delta: number }[];
        justification: string;
      }[];
      // Bare for traditional mode:
      subcriteria?: {
        name: string;
        weight: number;
        score: number;
        benchmark: { supplier: string; score: number };
        delta: number;
        justification: string;
        // Hvis item-level:
        items?: {
          name: string;
          score: number;
          justification: string;
          dimensions: { name: string; score: number; benchmarkScore: number; delta: number }[];
        }[];
      }[];
    };
  };
}
```

Payloaden sendes som JSON til backend. Frontend bygger IKKE prompt-tekst — det er backend sitt ansvar.

**Fil:** `evaluation.svelte.ts` — ny funksjon `buildReviewPayload(criterionId, supplierId)`

---

## Steg 2: Backend — `POST /api/evaluation/review`

Nytt endpoint i Flask API-blueprintet.

**Ny fil:** `src/app/api/review.py` — registreres som sub-blueprint eller route i `__init__.py`.

### 2a. Prompt-bygging

Prompt-template lever i en egen fil `src/app/prompts/justification_review.py` (ren Python, ingen Jinja — bare f-strings med XML-tagger).

**System prompt** (caches):
- Rolle: juridisk rådgiver for offentlige anskaffelser
- Oppgave: vurder om begrunnelser er tilstrekkelige og konsistente med poenggivning
- Regler: ikke vurder om poengene er korrekte, kun om teksten forklarer dem
- Instruksjoner: sitér begrunnelsesteksten før vurdering (reduce hallucinations)
- Selvsjekk: verifiser at alle funn er forankret i faktiske tall fra input
- 2-3 few-shot-eksempler wrappet i `<examples>`

**User prompt** (variabel per kall):
- Evalueringsdata i XML-format, ferdigberegnet med delta og benchmark
- Format fra prompt-arkitekturen beskrevet i research-fasen

### 2b. Claude API-kall

```python
import anthropic

client = anthropic.Anthropic()  # API-nøkkel fra env/Secret Manager

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    output_config={
        "effort": "low",
        "format": {
            "type": "json_schema",
            "schema": REVIEW_SCHEMA,  # Pydantic → JSON Schema
        },
    },
    system=[{
        "type": "text",
        "text": SYSTEM_PROMPT,
        "cache_control": {"type": "ephemeral"},  # 5-min cache
    }],
    messages=[{"role": "user", "content": user_prompt}],
)
```

- **Modell:** Sonnet 4.6 — balanse mellom kvalitet og kostnad
- **Effort:** `low` — oppgaven er fokusert tekstanalyse, ikke dyp resonnering
- **Structured output:** Pydantic-schema tvinger valid JSON-respons
- **Prompt caching:** System prompt (rolle + eksempler ~2500 tokens) caches i 5 min

### 2c. Response-schema (Pydantic)

```python
class Finding(BaseModel):
    """Ett funn der begrunnelse og poeng ikke samsvarer."""
    level: Literal["criterion", "subcriterion", "role", "item"]
    name: str  # navn på kriteriet/rollen/ressursen
    score: float
    benchmark_score: float
    issue: Literal["missing", "generic", "inconsistent", "insufficient"]
    explanation: str  # kort forklaring på norsk
    quote: str | None  # sitert del av begrunnelsen (hvis relevant)

class ReviewResult(BaseModel):
    """Samlet vurdering av begrunnelser for ett kriterium."""
    findings: list[Finding]
    quality: Literal["sufficient", "needs_work", "insufficient"]
    summary: str  # 1-2 setninger oppsummering på norsk
```

### 2d. Token-logging og kostnadsestimat

Hvert API-kall logges med:

```python
@dataclass
class ReviewLog:
    timestamp: str
    criterion_id: str
    supplier_id: str
    model: str                    # "claude-sonnet-4-6"
    input_tokens: int
    output_tokens: int
    cache_read_tokens: int
    cache_creation_tokens: int
    estimated_cost_usd: float     # beregnet fra token-priser
    duration_ms: int
    quality: str                  # "sufficient" | "needs_work" | "insufficient"
```

Kostnad beregnes fra faste priser per modell (kan oppdateres):
```python
PRICING = {
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0, "cache_read": 0.3, "cache_write": 3.75},
    "claude-haiku-4-5": {"input": 1.0, "output": 5.0, "cache_read": 0.1, "cache_write": 1.25},
}
```

Logges til Python logger (structured JSON) og returneres til frontend i responsen:
```json
{
  "result": { "findings": [...], "quality": "needs_work", "summary": "..." },
  "usage": { "model": "claude-sonnet-4-6", "input_tokens": 1247, "output_tokens": 389, "cost_usd": 0.0096 }
}
```

---

## Steg 3: Frontend — trigger og visning

### 3a. API-klient

Ny funksjon i `src/frontend/src/lib/api.ts` (eller tilsvarende):
```typescript
async function reviewJustification(criterionId: string, supplierId: string): Promise<ReviewResponse>
```

### 3b. Trigger i JustificationPanel

Knapp nederst i JustificationPanel (etter alle textarea-seksjonene):
- "Vurder begrunnelser" med ikon
- Loading-state mens API-kallet kjører
- Disabled hvis ingen begrunnelser er fylt ut

### 3c. Visning av resultat

Inline i JustificationPanel, under knappen:
- Fargekodet kvalitetsindikator (sufficient=grønn, needs_work=amber, insufficient=rød)
- Summary-tekst
- Ekspanderbar liste med findings — hvert funn viser:
  - Nivå og navn (f.eks. "Rolle: Prosjektleder")
  - Issue-type som badge ("Mangler", "Generisk", "Inkonsistent")
  - Forklaring
  - Sitert tekst (hvis tilgjengelig) med visuell kobling til textarea

### 3d. Kostnad/modell-visning

Diskret linje under resultatet: "Sonnet 4.6 · 1 636 tokens · ~$0.01"

---

## Steg 4: Avhengigheter

### Python
Legg til i `requirements.txt`:
```
anthropic>=0.50
```

### Miljøvariabler
- `ANTHROPIC_API_KEY` — fra GCP Secret Manager (samme mønster som `vendor-api-id`)
- Eventuelt `REVIEW_MODEL=claude-sonnet-4-6` for å kunne bytte modell uten deploy

---

## Implementeringsrekkefølge

| # | Oppgave | Fil(er) |
|---|---------|---------|
| 1 | `buildReviewPayload()` i store | `evaluation.svelte.ts` |
| 2 | Prompt-template med XML-format + few-shot | `src/app/prompts/justification_review.py` |
| 3 | Pydantic response-schema | `src/app/prompts/justification_review.py` |
| 4 | Flask endpoint med Claude API, caching, logging | `src/app/api/review.py` |
| 5 | Frontend API-klient | `src/frontend/src/lib/api.ts` eller ny |
| 6 | Knapp + resultatvisning i JustificationPanel | `JustificationPanel.svelte` |
| 7 | Token/kostnads-logging | `src/app/api/review.py` |

---

## Ikke i scope (v1), men planlagt

### Batch Processing (50% kostnadsrabatt)
Når Supabase-lagring er på plass: "Vurder alle begrunnelser"-knapp som sender hele evalueringen som batch-jobb via `client.messages.batches.create()`. Resultater hentes asynkront (poll hvert 60s eller webhook). Halv pris, men opp til 1 time latens.

### Citations-integrasjon
Inkompatibel med structured outputs i dag. Når/hvis Anthropic løser dette, kan vi få eksakte pekere tilbake til begrunnelsesteksten i stedet for sitater i fritekst.

### Supabase-caching
Cache vurderinger per `(criterionId, supplierId, contentHash)`. Invalidér ved score- eller begrunnelsesendring. Forhindrer unødvendige API-kall ved navigering mellom leverandører.

### Modellvalg
Haiku 4.5 som billigere alternativ for store evalueringer (~$0.10 per full evaluering vs ~$0.50 med Sonnet). Brukeren velger i innstillinger.
