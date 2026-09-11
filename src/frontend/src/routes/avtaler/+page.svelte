<script lang="ts">
  import { onMount } from 'svelte';
  import { themeStore } from '$lib/stores/theme.svelte';
  import { formatVarighet, opsjonsVarighetAar, forlengetUtlopsdato } from '$lib/utils/format';
  import ContractDrawer from '$lib/components/contracts/ContractDrawer.svelte';
  import type {
    ContractItem,
    ContractDeviation,
    ContractFilterState,
    VarighetsFilter,
  } from '$lib/types/contract';

  // Extended type with children populated for tree view
  interface GroupedContract extends ContractItem {
    subContracts: ContractItem[];
    supplierList: string[];
    isExpanded?: boolean;
    displayContractNumber?: string | null;
  }

  // ── State ──

  let allRawContracts = $state<ContractItem[]>([]);
  let allDeviations = $state<ContractDeviation[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let valgtContract = $state<ContractItem | null>(null);
  let loadingDetail = $state(false);

  // Visningsmodus: 'avtaler' (gruppert på rammeavtaler) vs 'kontrakter' (alle leverandøravtaler flat)
  let visningsModus = $state<'avtaler' | 'kontrakter'>('avtaler');

  let filter = $state<ContractFilterState>({
    søk: '',
    status: 'alle',
    kontraktstype: 'alle',
    varighet: 'alle',
    opsjon: 'alle',
    referanseDato: new Date().toISOString().slice(0, 10),
    dagerTilUtløp: 90,
    kunAvvik: false,
    kunEndringer: false,
  });

  let ekspanderteRader = $state<Set<number>>(new Set());

  // ── Fetching Data ──

  onMount(async () => {
    try {
      loading = true;
      const [contractsRes, deviationsRes] = await Promise.all([
        fetch('/api/contracts?includeCustomFields=1'),
        fetch('/api/deviations?pageSize=100'),
      ]);

      if (!contractsRes.ok) throw new Error('Kunne ikke laste kontrakter fra Artifik');
      allRawContracts = await contractsRes.json();

      if (deviationsRes.ok) {
        const devData = await deviationsRes.json();
        allDeviations = devData.deviations || [];
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  });

  // Map deviations to contractId for instant lookup
  const deviationsByContractId = $derived.by(() => {
    const map = new Map<number, ContractDeviation[]>();
    for (const dev of allDeviations) {
      if (dev.contractId) {
        const existing = map.get(dev.contractId) || [];
        existing.push(dev);
        map.set(dev.contractId, existing);
      }
    }
    return map;
  });

  // ── Tree Construction ──
  // We identify the true logical agreements:
  // 1. If there's a FRAMEWORK_LOT_GROUP (e.g. 00219), it represents the actual framework agreement and holds the value/number.
  // 2. Its children are FRAMEWORK_LOT_CONTRACT (00219-01, 00219-02, etc.).
  // 3. STANDALONE contracts are their own agreements.
  const groupedAgreements = $derived.by<GroupedContract[]>(() => {
    const byId = new Map<number, ContractItem>();
    for (const c of allRawContracts) {
      byId.set(c.id, c);
    }

    // Collect child contracts for each lot group
    const lotGroupChildren = new Map<number, ContractItem[]>();
    for (const c of allRawContracts) {
      if (c.type === 'FRAMEWORK_LOT_CONTRACT' && c.parentContractId) {
        const list = lotGroupChildren.get(c.parentContractId) || [];
        list.push(c);
        lotGroupChildren.set(c.parentContractId, list);
      }
    }

    const agreements: GroupedContract[] = [];

    for (const c of allRawContracts) {
      // Top-level logical contracts:
      // Either FRAMEWORK_LOT_GROUP (which holds the contract number and value),
      // OR STANDALONE / STANDALONE_KGV contracts.
      // (FRAMEWORK_MAIN_GROUP is a container often with no value/number, pointing to lot group).
      if (c.type === 'FRAMEWORK_LOT_GROUP') {
        const children = lotGroupChildren.get(c.id) || [];
        const suppliers = children
          .map((ch) => ch.supplierOrg?.name || ch.supplierOrgName)
          .filter((name): name is string => Boolean(name));

        agreements.push({
          ...c,
          displayContractNumber:
            c.contractNumber ||
            (c.parentContractId ? byId.get(c.parentContractId)?.contractNumber : null),
          subContracts: children,
          supplierList: suppliers,
        });
      } else if (c.type.startsWith('STANDALONE')) {
        const sup = c.supplierOrg?.name || c.supplierOrgName;
        agreements.push({
          ...c,
          displayContractNumber: c.contractNumber,
          subContracts: [],
          supplierList: sup ? [sup] : [],
        });
      }
    }

    return agreements;
  });

  // ── Helper computations ──

  const referanseDato = $derived.by(() => {
    const d = new Date(filter.referanseDato);
    return isNaN(d.getTime()) ? new Date() : d;
  });

  const daysFromNow = $derived(filter.dagerTilUtløp);

  function getContractEndDate(c: ContractItem): Date | null {
    if (!c.duration_end) return null;
    const d = new Date(c.duration_end);
    return isNaN(d.getTime()) ? null : d;
  }

  function erUtlopt(c: ContractItem): boolean {
    const end = getContractEndDate(c);
    if (!end) return false;
    return end < referanseDato;
  }

  function erUtloperSnart(c: ContractItem): boolean {
    const end = getContractEndDate(c);
    if (!end) return false;
    const threshold = new Date(referanseDato.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
    return end >= referanseDato && end <= threshold;
  }

  function erAktiv(c: ContractItem): boolean {
    const end = getContractEndDate(c);
    if (!end) return true;
    return end >= referanseDato;
  }

  /** Beregner varighet i hele måneder fra start- til sluttdato */
  function beregnVarighetMaaneder(c: ContractItem): number | null {
    if (c.duration_start && c.duration_end) {
      const s = new Date(c.duration_start);
      const e = new Date(c.duration_end);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        const years = e.getFullYear() - s.getFullYear();
        const months = e.getMonth() - s.getMonth();
        const totalMonths = years * 12 + months;
        return totalMonths >= 0 ? totalMonths : null;
      }
    }
    if (c.duration_months && c.duration_months > 0) return c.duration_months;
    return null;
  }

  function harLangVarighet(c: ContractItem): boolean {
    const m = beregnVarighetMaaneder(c);
    return m !== null && m > 48;
  }

  function narmerSegFireAar(c: ContractItem): boolean {
    const m = beregnVarighetMaaneder(c);
    return m !== null && m >= 36 && m <= 48;
  }

  function harOpsjon(c: ContractItem): boolean {
    return opsjonsVarighetAar(c.optionsJSON) > 0;
  }

  function erRamme(c: ContractItem): boolean {
    return c.type.startsWith('FRAMEWORK');
  }

  // ── Portfolio Metrics (Calculated correctly on Agreement level) ──

  const metrics = $derived.by(() => {
    // Determine dataset based on current aggregation mode
    if (visningsModus === 'avtaler') {
      let totalVerdi = 0;
      let aktive = 0,
        aktiveRamme = 0,
        aktiveEnkelt = 0;
      let utloperSnart = 0,
        utloperRamme = 0,
        utloperEnkelt = 0;
      let utlopt = 0,
        utloptRamme = 0,
        utloptEnkelt = 0;
      let rammer = 0,
        enkelt = 0;

      for (const a of groupedAgreements) {
        if (a.value && a.value > 0) totalVerdi += a.value;
        if (erRamme(a)) rammer++;
        else enkelt++;

        if (erUtloperSnart(a)) {
          utloperSnart++;
          if (erRamme(a)) utloperRamme++;
          else utloperEnkelt++;
        } else if (erUtlopt(a)) {
          utlopt++;
          if (erRamme(a)) utloptRamme++;
          else utloptEnkelt++;
        } else {
          aktive++;
          if (erRamme(a)) aktiveRamme++;
          else aktiveEnkelt++;
        }
      }

      return {
        totalt: groupedAgreements.length,
        rammer,
        enkelt,
        aktive,
        utloperSnart,
        utlopt,
        totalVerdi,
        avvikCount: allDeviations.length,
        labelTotalt: 'Reelle avtaler',
        splitUtloper: { ramme: utloperRamme, enkelt: utloperEnkelt },
        splitAktive: { ramme: aktiveRamme, enkelt: aktiveEnkelt },
        splitUtlopt: { ramme: utloptRamme, enkelt: utloptEnkelt },
        nivå: 'avtale',
      };
    } else {
      // Flat list: count individual supplier lot contracts
      const lotContracts = allRawContracts.filter(
        (c) => c.type === 'FRAMEWORK_LOT_CONTRACT' || c.type.startsWith('STANDALONE')
      );
      let totalVerdi = 0;
      let aktive = 0,
        aktiveRamme = 0,
        aktiveEnkelt = 0;
      let utloperSnart = 0,
        utloperRamme = 0,
        utloperEnkelt = 0;
      let utlopt = 0,
        utloptRamme = 0,
        utloptEnkelt = 0;
      let rammer = 0,
        enkelt = 0;

      for (const c of lotContracts) {
        if (c.value && c.value > 0) totalVerdi += c.value;
        if (erRamme(c)) rammer++;
        else enkelt++;

        if (erUtloperSnart(c)) {
          utloperSnart++;
          if (erRamme(c)) utloperRamme++;
          else utloperEnkelt++;
        } else if (erUtlopt(c)) {
          utlopt++;
          if (erRamme(c)) utloptRamme++;
          else utloptEnkelt++;
        } else {
          aktive++;
          if (erRamme(c)) aktiveRamme++;
          else aktiveEnkelt++;
        }
      }

      return {
        totalt: lotContracts.length,
        rammer,
        enkelt,
        aktive,
        utloperSnart,
        utlopt,
        totalVerdi,
        avvikCount: allDeviations.length,
        labelTotalt: 'Leverandørkontrakter',
        splitUtloper: { ramme: utloperRamme, enkelt: utloperEnkelt },
        splitAktive: { ramme: aktiveRamme, enkelt: aktiveEnkelt },
        splitUtlopt: { ramme: utloptRamme, enkelt: utloptEnkelt },
        nivå: 'kontrakt',
      };
    }
  });

  // ── Filtering Grouped Agreements ──

  const filtrerteAvtaler = $derived.by(() => {
    let result = groupedAgreements;

    // Tekstsøk
    const query = filter.søk.trim().toLowerCase();
    if (query) {
      result = result.filter((a) => {
        const nameMatch = a.name?.toLowerCase().includes(query);
        const nrMatch = (a.displayContractNumber || a.contractNumber)
          ?.toLowerCase()
          .includes(query);
        const refMatch = a.referenceId?.toLowerCase().includes(query);
        const descMatch = a.description?.toLowerCase().includes(query);
        const supMatch = a.supplierList.some((s) => s.toLowerCase().includes(query));
        const subMatch = a.subContracts.some(
          (sub) =>
            sub.name?.toLowerCase().includes(query) ||
            sub.contractNumber?.toLowerCase().includes(query) ||
            (sub.supplierOrgNumber || sub.supplierOrg?.orgNumber)?.includes(query)
        );
        return nameMatch || nrMatch || refMatch || descMatch || supMatch || subMatch;
      });
    }

    // Statusfilter
    if (filter.status === 'aktiv') {
      result = result.filter((a) => erAktiv(a));
    } else if (filter.status === 'utløper_snart') {
      result = result.filter((a) => erUtloperSnart(a));
    } else if (filter.status === 'utløpt') {
      result = result.filter((a) => erUtlopt(a));
    } else if (filter.status === 'signering') {
      result = result.filter((a) => a.signingStatus !== 'SIGNED');
    }

    // Typefilter
    if (filter.kontraktstype === 'ramme') {
      result = result.filter((a) => a.type.startsWith('FRAMEWORK'));
    } else if (filter.kontraktstype === 'enkelt') {
      result = result.filter((a) => a.type.startsWith('STANDALONE'));
    }

    // KAV filter
    if (filter.kunAvvik) {
      result = result.filter((a) => {
        const hasDirect = deviationsByContractId.has(a.id);
        const hasChild = a.subContracts.some((ch) => deviationsByContractId.has(ch.id));
        return hasDirect || hasChild;
      });
    }

    if (filter.kunEndringer) {
      result = result.filter((a) => {
        const hasDirect = (a.amendments?.length ?? 0) > 0;
        const hasChild = a.subContracts.some((ch) => (ch.amendments?.length ?? 0) > 0);
        return hasDirect || hasChild;
      });
    }

    // Varighetsfilter
    if (filter.varighet === 'over_4_aar') {
      result = result.filter((a) => a.type.startsWith('FRAMEWORK') && harLangVarighet(a));
    } else if (filter.varighet === 'narmere_4_aar') {
      result = result.filter((a) => a.type.startsWith('FRAMEWORK') && narmerSegFireAar(a));
    }

    // Opsjonsfilter
    if (filter.opsjon === 'med_opsjon') {
      result = result.filter((a) => harOpsjon(a) || a.subContracts.some((ch) => harOpsjon(ch)));
    } else if (filter.opsjon === 'uten_opsjon') {
      result = result.filter((a) => !harOpsjon(a) && !a.subContracts.some((ch) => harOpsjon(ch)));
    }

    return result;
  });

  // ── Filtering Flat Lot Contracts ──

  const filtrerteFlateKontrakter = $derived.by(() => {
    let result = allRawContracts.filter(
      (c) => c.type === 'FRAMEWORK_LOT_CONTRACT' || c.type.startsWith('STANDALONE')
    );

    const query = filter.søk.trim().toLowerCase();
    if (query) {
      result = result.filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(query);
        const nrMatch = c.contractNumber?.toLowerCase().includes(query);
        const supMatch = (c.supplierOrgName || c.supplierOrg?.name)?.toLowerCase().includes(query);
        const orgNrMatch = (c.supplierOrgNumber || c.supplierOrg?.orgNumber)?.includes(query);
        return nameMatch || nrMatch || supMatch || orgNrMatch;
      });
    }

    if (filter.status === 'aktiv') result = result.filter((c) => erAktiv(c));
    else if (filter.status === 'utløper_snart') result = result.filter((c) => erUtloperSnart(c));
    else if (filter.status === 'utløpt') result = result.filter((c) => erUtlopt(c));
    else if (filter.status === 'signering')
      result = result.filter((c) => c.signingStatus !== 'SIGNED');

    if (filter.kunAvvik) result = result.filter((c) => deviationsByContractId.has(c.id));
    if (filter.kunEndringer) result = result.filter((c) => (c.amendments?.length ?? 0) > 0);

    // Varighetsfilter
    if (filter.varighet === 'over_4_aar') {
      result = result.filter((c) => c.type === 'FRAMEWORK_LOT_CONTRACT' && harLangVarighet(c));
    } else if (filter.varighet === 'narmere_4_aar') {
      result = result.filter((c) => c.type === 'FRAMEWORK_LOT_CONTRACT' && narmerSegFireAar(c));
    }

    // Opsjonsfilter
    if (filter.opsjon === 'med_opsjon') result = result.filter((c) => harOpsjon(c));
    else if (filter.opsjon === 'uten_opsjon') result = result.filter((c) => !harOpsjon(c));

    return result;
  });

  // ── KPI click → set status filter (toggle) ──

  function settStatusFilter(status: 'aktiv' | 'utløper_snart' | 'utløpt') {
    if (filter.status === status) {
      filter.status = 'alle';
    } else {
      filter.status = status;
    }
  }

  // ── Active filter chips ──

  const aktiveFilterChips = $derived.by(() => {
    const chips: { key: string; label: string }[] = [];

    if (filter.søk.trim()) chips.push({ key: 'søk', label: `Søk: "${filter.søk.trim()}"` });
    if (filter.status === 'aktiv') chips.push({ key: 'status', label: 'Status: Aktive' });
    else if (filter.status === 'utløper_snart')
      chips.push({ key: 'status', label: `Status: Utløper innen ${filter.dagerTilUtløp} dager` });
    else if (filter.status === 'utløpt') chips.push({ key: 'status', label: 'Status: Utløpt' });
    else if (filter.status === 'signering')
      chips.push({ key: 'status', label: 'Status: Under signering' });

    if (filter.kontraktstype === 'ramme') chips.push({ key: 'type', label: 'Type: Rammeavtaler' });
    else if (filter.kontraktstype === 'enkelt')
      chips.push({ key: 'type', label: 'Type: Enkeltstående' });

    if (filter.varighet === 'over_4_aar')
      chips.push({ key: 'varighet', label: 'Varighet: Over 4 år' });
    else if (filter.varighet === 'narmere_4_aar')
      chips.push({ key: 'varighet', label: 'Varighet: Nærmere 4 år' });

    if (filter.opsjon === 'med_opsjon') chips.push({ key: 'opsjon', label: 'Opsjon: Med' });
    else if (filter.opsjon === 'uten_opsjon') chips.push({ key: 'opsjon', label: 'Opsjon: Uten' });

    if (filter.kunAvvik) chips.push({ key: 'avvik', label: 'Kun med avvik' });
    if (filter.kunEndringer) chips.push({ key: 'endring', label: 'Kun med endringer' });

    const refDate = new Date(filter.referanseDato).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (refDate !== today) chips.push({ key: 'dato', label: `Referanse: ${filter.referanseDato}` });
    if (filter.dagerTilUtløp !== 90)
      chips.push({ key: 'dager', label: `Utløpsvindu: ${filter.dagerTilUtløp} dager` });

    return chips;
  });

  const harAktiveFiltre = $derived(aktiveFilterChips.length > 0);

  function fjernAlleFiltre() {
    filter.søk = '';
    filter.status = 'alle';
    filter.kontraktstype = 'alle';
    filter.varighet = 'alle';
    filter.opsjon = 'alle';
    filter.referanseDato = new Date().toISOString().slice(0, 10);
    filter.dagerTilUtløp = 90;
    filter.kunAvvik = false;
    filter.kunEndringer = false;
  }

  function fjernFilterChip(key: string) {
    switch (key) {
      case 'søk':
        filter.søk = '';
        break;
      case 'status':
        filter.status = 'alle';
        break;
      case 'type':
        filter.kontraktstype = 'alle';
        break;
      case 'varighet':
        filter.varighet = 'alle';
        break;
      case 'opsjon':
        filter.opsjon = 'alle';
        break;
      case 'avvik':
        filter.kunAvvik = false;
        break;
      case 'endring':
        filter.kunEndringer = false;
        break;
      case 'dato':
        filter.referanseDato = new Date().toISOString().slice(0, 10);
        break;
      case 'dager':
        filter.dagerTilUtløp = 90;
        break;
    }
  }

  async function apneDetaljer(c: ContractItem) {
    loadingDetail = true;
    try {
      const res = await fetch(`/api/contracts/${c.id}`);
      if (res.ok) {
        valgtContract = await res.json();
        const devs = deviationsByContractId.get(c.id);
        if (
          devs &&
          devs.length > 0 &&
          (!valgtContract?.deviations || valgtContract.deviations.length === 0)
        ) {
          if (valgtContract) valgtContract.deviations = devs;
        }
      } else {
        valgtContract = c;
      }
    } catch {
      valgtContract = c;
    } finally {
      loadingDetail = false;
    }
  }

  function toggleRad(id: number, e: MouseEvent) {
    e.stopPropagation();
    const neste = new Set(ekspanderteRader);
    if (neste.has(id)) neste.delete(id);
    else neste.add(id);
    ekspanderteRader = neste;
  }

  function formatValuta(belop: number | null | undefined, currency: string = 'NOK'): string {
    if (belop === null || belop === undefined) return '–';
    return `${belop.toLocaleString('nb-NO')} ${currency}`;
  }

  function formatDato(datoStr: string | null | undefined): string {
    if (!datoStr) return '–';
    return datoStr.slice(0, 10);
  }
</script>

<svelte:head>
  <title>Avtaleoversikt (KAV) | Catenda</title>
</svelte:head>

<div class="app-shell">
  <!-- Top Navigation -->
  <header class="top-nav">
    <div class="nav-left">
      <span class="logo font-mono">Catenda</span>
      <nav class="nav-breadcrumbs" aria-label="Brødsmuler">
        <a href="/anskaffelser" class="nav-link">Anskaffelser</a>
        <span class="nav-sep">/</span>
        <span class="current">Avtaler & KAV</span>
      </nav>
    </div>
    <div class="nav-actions">
      <a href="/anskaffelser" class="verktoy-link">Anskaffelsesliste</a>
      <a href="/verktoy" class="verktoy-link">Verktøy</a>
      <button
        class="theme-toggle"
        onclick={() => themeStore.toggle()}
        title="Tema: {themeStore.label}"
      >
        {themeStore.icon}
      </button>
      <span class="user-org">Oslobygg KF / Artifik</span>
      <div class="avatar">KJ</div>
    </div>
  </header>

  <main class="page-container">
    <!-- Header Title & Subtitle -->
    <div class="page-header">
      <div class="title-group">
        <h1 class="page-title">Avtaleoversikt & Kontraktsadministrasjon (KAV)</h1>
        <p class="page-desc">
          Hierarkisk porteføljeoversikt direkte fra Artifik API. Viser kobling mellom rammeavtaler,
          leverandørkontrakter og avrop.
        </p>
      </div>
      <div class="header-right-badges">
        <div class="api-badge font-mono">API: api.artifik.no/external/contracts</div>
      </div>
    </div>

    <!-- Mode Selector & Explanation -->
    <div class="mode-bar">
      <div class="mode-segmented">
        <button
          class="mode-btn"
          class:active={visningsModus === 'avtaler'}
          onclick={() => (visningsModus = 'avtaler')}
        >
          📂 Gruppert på avtale ({groupedAgreements.length} rammer & enkeltavtaler)
        </button>
        <button
          class="mode-btn"
          class:active={visningsModus === 'kontrakter'}
          onclick={() => (visningsModus = 'kontrakter')}
        >
          📄 Flat liste ({metrics.totalt} leverandørkontrakter)
        </button>
      </div>
      <span class="mode-hint">
        {#if visningsModus === 'avtaler'}
          💡 <strong>Avtalenivå:</strong> En rammeavtale med flere parallelle leverandører telles
          som <strong>1 avtale</strong>. Klikk på pilen (▸) for å se de enkelte
          leverandørkontraktene.
        {:else}
          💡 <strong>Leverandørnivå:</strong> Viser hver enkelt signerte delkontrakt/leverandøravtale
          som egen rad.
        {/if}
      </span>
    </div>

    <!-- KPI Metric Bar -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">{metrics.labelTotalt}</span>
        <span class="metric-value font-mono">{metrics.totalt}</span>
        <span class="metric-sub"
          >{metrics.nivå === 'avtale'
            ? `${metrics.rammer} rammer / ${metrics.enkelt} enkeltstående`
            : 'Signerte leverandøravtaler'}</span
        >
      </div>
      <button
        class="metric-card metric-clickable"
        class:metric-active={filter.status === 'aktiv'}
        onclick={() => settStatusFilter('aktiv')}
        title="Klikk for å filtrere på aktive avtaler"
      >
        <span class="metric-label">Aktive avtaler</span>
        <span class="metric-value font-mono text-success">{metrics.aktive}</span>
        <span class="metric-sub"
          >Ramme {metrics.splitAktive.ramme} / Enkelt {metrics.splitAktive.enkelt}</span
        >
      </button>
      <button
        class="metric-card metric-clickable"
        class:metric-active={filter.status === 'utløper_snart'}
        onclick={() => settStatusFilter('utløper_snart')}
        title="Klikk for å filtrere på avtaler som utløper innen {filter.dagerTilUtløp} dager fra {filter.referanseDato}"
      >
        <span class="metric-label">Utløper innen {filter.dagerTilUtløp} dager</span>
        <span class="metric-value font-mono text-warn">{metrics.utloperSnart}</span>
        <span class="metric-sub"
          >Fra {filter.referanseDato} · Ramme {metrics.splitUtloper.ramme} / Enkelt {metrics
            .splitUtloper.enkelt}</span
        >
      </button>
      <button
        class="metric-card metric-clickable"
        class:metric-active={filter.status === 'utløpt'}
        onclick={() => settStatusFilter('utløpt')}
        title="Klikk for å filtrere på utløpte avtaler"
      >
        <span class="metric-label">Utløpt</span>
        <span class="metric-value font-mono text-dev">{metrics.utlopt}</span>
        <span class="metric-sub"
          >Ramme {metrics.splitUtlopt.ramme} / Enkelt {metrics.splitUtlopt.enkelt}</span
        >
      </button>
      <div class="metric-card">
        <span class="metric-label">Samlet avtaleramme</span>
        <span class="metric-value font-mono text-vekt">{formatValuta(metrics.totalVerdi)}</span>
        <span class="metric-sub"
          >{metrics.nivå === 'avtale' ? 'Ekte sum (ingen duplisering)' : 'Summerte delrammer'}</span
        >
      </div>
    </div>

    <!-- Filter & Toolbar -->
    <div class="toolbar-card">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Søk i avtalenavn, leverandør, avtalenr (f.eks 00219)..."
          bind:value={filter.søk}
          class="search-input"
        />
        {#if filter.søk}
          <button class="clear-search" onclick={() => (filter.søk = '')}>&times;</button>
        {/if}
      </div>

      <div class="filters-row">
        <!-- Status -->
        <div class="filter-group">
          <label for="status-select">Status:</label>
          <select id="status-select" bind:value={filter.status} class="filter-select">
            <option value="alle">Alle statuser</option>
            <option value="aktiv">Aktive</option>
            <option value="utløper_snart">Utløper innen {filter.dagerTilUtløp} dager</option>
            <option value="utløpt">Utløpt</option>
            <option value="signering">Under signering</option>
          </select>
        </div>

        <!-- Varighet (kun for avtaler-modus) -->
        {#if visningsModus === 'avtaler'}
          <div class="filter-group">
            <label for="varighet-select">Varighet:</label>
            <select id="varighet-select" bind:value={filter.varighet} class="filter-select">
              <option value="alle">Alle varigheter</option>
              <option value="over_4_aar">Over 4 år</option>
              <option value="narmere_4_aar">Nærmere 4 år (3–4 år)</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="opsjon-select">Opsjon:</label>
            <select id="opsjon-select" bind:value={filter.opsjon} class="filter-select">
              <option value="alle">Med/uten opsjon</option>
              <option value="med_opsjon">Med opsjon/forlengelse</option>
              <option value="uten_opsjon">Uten opsjon</option>
            </select>
          </div>
        {/if}

        {#if visningsModus === 'avtaler'}
          <div class="filter-group">
            <label for="type-select">Type:</label>
            <select id="type-select" bind:value={filter.kontraktstype} class="filter-select">
              <option value="alle">Alle typer</option>
              <option value="ramme">Kun rammeavtaler</option>
              <option value="enkelt">Kun enkeltstående</option>
            </select>
          </div>
        {/if}

        <!-- Checkbox toggles -->
        <label class="toggle-pill" class:active={filter.kunAvvik}>
          <input type="checkbox" bind:checked={filter.kunAvvik} />
          <span>Kun med avvik ({metrics.avvikCount})</span>
        </label>

        <div class="results-count font-mono">
          Viser {visningsModus === 'avtaler'
            ? filtrerteAvtaler.length
            : filtrerteFlateKontrakter.length} av {metrics.totalt}
        </div>
      </div>

      <!-- Andre filtersrille: Referanse dato og utløpsfrist -->
      <div class="filters-row filters-row-secondary">
        <div class="filter-group">
          <label for="referanse-dato">Utløpsdato målt fra:</label>
          <input
            id="referanse-dato"
            type="date"
            bind:value={filter.referanseDato}
            class="filter-input"
          />
        </div>

        <div class="filter-group">
          <label for="dager-utlop">og viser avtaler som utløper innen:</label>
          <input
            id="dager-utlop"
            type="number"
            min="1"
            max="1825"
            bind:value={filter.dagerTilUtløp}
            class="filter-input filter-input-short"
          />
          <span class="filter-unit">dager</span>
        </div>
        <span class="filter-context-hint">
          (gjelder {visningsModus === 'avtaler'
            ? 'avtalenivået — rammer telles som 1'
            : 'hver enkelt kontrakt'})
        </span>
      </div>

      <!-- Aktive filtermerker -->
      {#if harAktiveFiltre}
        <div class="active-filters">
          <span class="active-filters-label">Aktive filtre:</span>
          {#each aktiveFilterChips as chip (chip.key)}
            <button
              class="filter-chip"
              onclick={() => fjernFilterChip(chip.key)}
              title="Fjern filter"
            >
              {chip.label} <span class="chip-x">&times;</span>
            </button>
          {/each}
          <button class="clear-all-btn" onclick={fjernAlleFiltre}>Fjern alle</button>
        </div>
      {/if}
    </div>

    <!-- Main Table -->
    {#if loading}
      <div class="state-card" role="status">
        <div class="spinner"></div>
        <p>Laster inn avtaler og KAV-data fra Artifik API...</p>
      </div>
    {:else if error}
      <div class="state-card state-error" role="alert">
        <h3>Feil ved lasting av avtaledata</h3>
        <p>{error}</p>
      </div>
    {:else}
      <!-- TABELL: GRUPPERT PÅ AVTALENIVÅ (HOVEDAVTALER) -->
      {#if visningsModus === 'avtaler'}
        {#if filtrerteAvtaler.length === 0}
          <div class="state-card"><p>Ingen avtaler matcher søkekriteriene dine.</p></div>
        {:else}
          <div class="table-wrapper">
            <table class="contracts-table">
              <thead>
                <tr>
                  <th style="width: 40px;"></th>
                  <th style="width: 300px;">Avtale & Hovednummer</th>
                  <th style="width: 140px;">Type</th>
                  <th>Leverandør(er)</th>
                  <th style="width: 210px;">Periode & Varighet</th>
                  <th style="width: 140px; text-align: right;">Rammeverdi</th>
                  <th style="width: 100px; text-align: center;">Avrop</th>
                  <th style="width: 100px; text-align: center;">KAV Status</th>
                </tr>
              </thead>
              <tbody>
                {#each filtrerteAvtaler as avtale (avtale.id)}
                  {@const isExpanded = ekspanderteRader.has(avtale.id)}
                  {@const hasChildren = avtale.subContracts.length > 0}
                  {@const hasDevs =
                    deviationsByContractId.has(avtale.id) ||
                    avtale.subContracts.some((c) => deviationsByContractId.has(c.id))}
                  {@const isExpiring = erUtloperSnart(avtale)}
                  {@const isExpired = erUtlopt(avtale)}

                  <!-- Hovedavtale-rad -->
                  <tr
                    class="contract-row agreement-master-row"
                    class:row-selected={valgtContract?.id === avtale.id}
                    onclick={() => apneDetaljer(avtale)}
                  >
                    <!-- Chevron for ekspandering -->
                    <td
                      style="text-align: center;"
                      onclick={(e) => hasChildren && toggleRad(avtale.id, e)}
                    >
                      {#if hasChildren}
                        <button class="chevron-btn" aria-label="Vis delkontrakter">
                          {isExpanded ? '▾' : '▸'}
                        </button>
                      {/if}
                    </td>

                    <!-- Navn & nummer -->
                    <td>
                      <div class="name-cell">
                        <span class="contract-name" title={avtale.name}>{avtale.name}</span>
                        <div class="sub-meta font-mono">
                          {#if avtale.displayContractNumber}
                            <span class="contract-number font-bold"
                              >Avtalenr: {avtale.displayContractNumber}</span
                            >
                          {/if}
                          {#if avtale.referenceId}
                            <span class="ref-text">Ref: {avtale.referenceId}</span>
                          {/if}
                          <span class="id-text">ID: #{avtale.id}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Type -->
                    <td>
                      <span class="badge-type font-mono">
                        {avtale.type.startsWith('FRAMEWORK') ? 'Rammeavtale' : 'Enkeltavtale'}
                      </span>
                    </td>

                    <!-- Leverandører -->
                    <td>
                      {#if hasChildren}
                        <div class="suppliers-summary" onclick={(e) => toggleRad(avtale.id, e)}>
                          <span class="supplier-pill font-mono"
                            >{avtale.subContracts.length} leverandører</span
                          >
                          <span class="suppliers-names-preview">
                            {avtale.supplierList.slice(0, 2).join(', ')}{avtale.supplierList
                              .length > 2
                              ? ` (+${avtale.supplierList.length - 2})`
                              : ''}
                          </span>
                        </div>
                      {:else}
                        <span class="supplier-name">
                          {avtale.supplierOrg?.name || avtale.supplierOrgName || '–'}
                        </span>
                      {/if}
                    </td>

                    <!-- Periode & Total Varighet -->
                    <td>
                      <div class="period-cell font-mono">
                        <span class="date-range">
                          {formatDato(avtale.duration_start)} &rarr; {formatDato(
                            avtale.duration_end
                          )}
                        </span>
                        <span class="duration-text">
                          Varighet: <strong
                            >{formatVarighet(
                              avtale.duration_start,
                              avtale.duration_end,
                              avtale.duration_months,
                              avtale.duration
                            )}</strong
                          >
                        </span>
                        {#if avtale.optionsJSON && opsjonsVarighetAar(avtale.optionsJSON) > 0}
                          {@const optAar = opsjonsVarighetAar(avtale.optionsJSON)}
                          {@const forlengetDato = forlengetUtlopsdato(
                            avtale.duration_end,
                            avtale.optionsJSON
                          )}
                          <span class="duration-text">
                            Opsjon: <strong class="opsjon-text">+{optAar} år</strong>
                            {#if forlengetDato}
                              <span class="opsjon-dato"
                                >(siste mulig utløp {formatDato(forlengetDato)})</span
                              >
                            {/if}
                          </span>
                        {/if}
                        {#if isExpiring}
                          <span class="badge-expiring">Utløper snart</span>
                        {:else if isExpired}
                          <span class="badge-expired">Utløpt</span>
                        {/if}
                      </div>
                    </td>

                    <!-- Verdi -->
                    <td style="text-align: right;">
                      <span class="font-mono value-text font-bold">
                        {formatValuta(avtale.value, avtale.currency)}
                      </span>
                    </td>

                    <!-- Avrop -->
                    <td style="text-align: center;">
                      {#if (avtale.callOffIds?.length ?? 0) > 0}
                        <span class="calloff-count-pill font-mono" title="Avrop registrert">
                          {avtale.callOffIds?.length} avrop
                        </span>
                      {:else}
                        <span class="empty-cell">–</span>
                      {/if}
                    </td>

                    <!-- KAV status -->
                    <td style="text-align: center;">
                      {#if hasDevs}
                        <span class="kav-badge kav-deviation">⚠️ Avvik</span>
                      {:else}
                        <span class="kav-badge kav-normal">Normal</span>
                      {/if}
                    </td>
                  </tr>

                  <!-- Ekspanderte delkontrakter / leverandøravtaler -->
                  {#if isExpanded && hasChildren}
                    {#each avtale.subContracts as child (child.id)}
                      {@const childDev = deviationsByContractId.has(child.id)}
                      <tr
                        class="contract-row child-subcontract-row"
                        class:row-selected={valgtContract?.id === child.id}
                        onclick={() => apneDetaljer(child)}
                      >
                        <td></td>
                        <td style="padding-left: 36px;">
                          <div class="name-cell">
                            <span class="subcontract-title">↳ {child.name}</span>
                            <div class="sub-meta font-mono">
                              <span class="contract-number font-bold"
                                >{child.contractNumber || '–'}</span
                              >
                              <span class="id-text">ID: #{child.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span class="badge-subcontract font-mono">Leverandørkontrakt</span>
                        </td>
                        <td>
                          <div class="supplier-cell">
                            <span class="supplier-name font-bold">
                              {child.supplierOrg?.name || child.supplierOrgName || '–'}
                            </span>
                            {#if child.supplierOrg?.orgNumber || child.supplierOrgNumber}
                              <span class="org-number font-mono">
                                Org: {child.supplierOrg?.orgNumber || child.supplierOrgNumber}
                              </span>
                            {/if}
                          </div>
                        </td>
                        <td>
                          <div class="period-cell font-mono">
                            <span class="date-range"
                              >{formatDato(child.duration_start)} &rarr; {formatDato(
                                child.duration_end
                              )}</span
                            >
                            <span class="duration-text-sub">
                              Varighet: {formatVarighet(
                                child.duration_start,
                                child.duration_end,
                                child.duration_months,
                                child.duration
                              )}
                            </span>
                          </div>
                        </td>
                        <td style="text-align: right;">
                          <span class="font-mono text-muted-valuta"> (del av ramme) </span>
                        </td>
                        <td style="text-align: center;">
                          <span class="badge-signed">✓ SIGNERT</span>
                        </td>
                        <td style="text-align: center;">
                          {#if childDev}
                            <span class="kav-badge kav-deviation">⚠️ Avvik</span>
                          {:else if (child.amendments?.length ?? 0) > 0}
                            <span class="kav-badge kav-amendment">Endring</span>
                          {:else}
                            <span class="kav-badge kav-normal">–</span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  {/if}
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        <!-- TABELL: FLAT LISTE MED ALLE LEVERANDØRKONTRAKTER -->
      {:else if filtrerteFlateKontrakter.length === 0}
        <div class="state-card"><p>Ingen leverandørkontrakter matcher søket.</p></div>
      {:else}
        <div class="table-wrapper">
          <table class="contracts-table">
            <thead>
              <tr>
                <th style="width: 320px;">Kontraktsnr & Navn</th>
                <th>Leverandør</th>
                <th style="width: 180px;">Periode</th>
                <th style="width: 140px; text-align: right;">Avtaleverdi</th>
                <th style="width: 110px; text-align: center;">Signatur</th>
                <th style="width: 110px; text-align: center;">KAV Status</th>
              </tr>
            </thead>
            <tbody>
              {#each filtrerteFlateKontrakter as contract (contract.id)}
                {@const hasDev = deviationsByContractId.has(contract.id)}
                {@const isExpiring = erUtloperSnart(contract)}
                {@const isExpired = erUtlopt(contract)}

                <tr
                  class="contract-row"
                  class:row-selected={valgtContract?.id === contract.id}
                  onclick={() => apneDetaljer(contract)}
                >
                  <td>
                    <div class="name-cell">
                      <span class="contract-name">{contract.name}</span>
                      <div class="sub-meta font-mono">
                        <span class="contract-number font-bold"
                          >{contract.contractNumber || '–'}</span
                        >
                        <span class="id-text">ID: #{contract.id}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="supplier-cell">
                      <span class="supplier-name font-bold">
                        {contract.supplierOrg?.name || contract.supplierOrgName || '–'}
                      </span>
                      {#if contract.supplierOrg?.orgNumber || contract.supplierOrgNumber}
                        <span class="org-number font-mono">
                          Org: {contract.supplierOrg?.orgNumber || contract.supplierOrgNumber}
                        </span>
                      {/if}
                    </div>
                  </td>
                  <td>
                    <div class="period-cell font-mono">
                      <span class="date-range"
                        >{formatDato(contract.duration_start)} &rarr; {formatDato(
                          contract.duration_end
                        )}</span
                      >
                      <span class="duration-text">
                        Varighet: <strong
                          >{formatVarighet(
                            contract.duration_start,
                            contract.duration_end,
                            contract.duration_months,
                            contract.duration
                          )}</strong
                        >
                      </span>
                      {#if contract.optionsJSON && opsjonsVarighetAar(contract.optionsJSON) > 0}
                        {@const optAar = opsjonsVarighetAar(contract.optionsJSON)}
                        {@const forlengetDato = forlengetUtlopsdato(
                          contract.duration_end,
                          contract.optionsJSON
                        )}
                        <span class="duration-text">
                          Opsjon: <strong class="opsjon-text">+{optAar} år</strong>
                          {#if forlengetDato}
                            <span class="opsjon-dato"
                              >(siste mulig utløp {formatDato(forlengetDato)})</span
                            >
                          {/if}
                        </span>
                      {/if}
                      {#if isExpiring}
                        <span class="badge-expiring">Utløper snart</span>
                      {:else if isExpired}
                        <span class="badge-expired">Utløpt</span>
                      {/if}
                    </div>
                  </td>
                  <td style="text-align: right;">
                    <span class="font-mono value-text"
                      >{formatValuta(contract.value, contract.currency)}</span
                    >
                  </td>
                  <td style="text-align: center;">
                    <span class="badge-signed">✓ SIGNERT</span>
                  </td>
                  <td style="text-align: center;">
                    {#if hasDev}
                      <span class="kav-badge kav-deviation">⚠️ Avvik</span>
                    {:else if (contract.amendments?.length ?? 0) > 0}
                      <span class="kav-badge kav-amendment">Endring</span>
                    {:else}
                      <span class="kav-badge kav-normal">Normal</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  </main>

  <!-- Contract Details Drawer -->
  <ContractDrawer contract={valgtContract} onclose={() => (valgtContract = null)} />
</div>

<style>
  .app-shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--color-canvas, #edeae4);
    color: var(--color-ink, #1e2530);
    font-family: var(--font-ui, sans-serif);
  }

  /* Top Nav */
  .top-nav {
    height: var(--header-height, 48px);
    background: var(--color-header-bg, #1e2530);
    color: var(--color-header-fg, #edeae4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--spacing-6, 24px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-4, 16px);
  }

  .logo {
    font-weight: 700;
    color: var(--color-vekt, #5ba4b8);
    letter-spacing: 0.05em;
  }

  .nav-breadcrumbs {
    display: flex;
    align-items: center;
    gap: var(--spacing-2, 8px);
    font-size: 0.85rem;
  }

  .nav-link {
    color: var(--color-header-muted, rgba(237, 234, 228, 0.6));
    text-decoration: none;
  }

  .nav-link:hover {
    color: #fff;
  }

  .nav-sep {
    color: var(--color-header-muted, rgba(237, 234, 228, 0.4));
  }

  .current {
    font-weight: 600;
    color: #fff;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-4, 16px);
  }

  .verktoy-link {
    font-size: 0.85rem;
    color: var(--color-header-muted, rgba(237, 234, 228, 0.7));
    text-decoration: none;
  }

  .verktoy-link:hover {
    color: #fff;
  }

  .theme-toggle {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 4px;
    color: #fff;
  }

  .user-org {
    font-size: 0.75rem;
    color: var(--color-header-muted, rgba(237, 234, 228, 0.6));
  }

  .avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-vekt, #2b6b7f);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* Page Layout */
  .page-container {
    padding: var(--spacing-6, 24px) var(--spacing-8, 32px);
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-5, 20px);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: var(--spacing-3, 12px);
  }

  .page-title {
    margin: 0 0 4px 0;
    font-size: 1.6rem;
    font-weight: 800;
    color: var(--color-ink, #1e2530);
    letter-spacing: -0.02em;
  }

  .page-desc {
    margin: 0;
    font-size: 0.95rem;
    color: var(--color-ink-secondary, #4d5666);
  }

  .api-badge {
    font-size: 0.75rem;
    background: var(--color-felt, #fbfaf8);
    border: 1px solid var(--color-wire, #ccc8bf);
    padding: 4px 10px;
    border-radius: var(--radius-sm, 4px);
    color: var(--color-ink-muted, #6b6660);
  }

  /* Mode Bar */
  .mode-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--color-felt-raised, #f4f2ee);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    padding: var(--spacing-2, 8px) var(--spacing-4, 16px);
    flex-wrap: wrap;
    gap: var(--spacing-3, 12px);
  }

  .mode-segmented {
    display: flex;
    background: var(--color-felt, #fbfaf8);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-sm, 4px);
    padding: 2px;
  }

  .mode-btn {
    border: none;
    background: transparent;
    padding: 6px 14px;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-ink-secondary, #4d5666);
    border-radius: var(--radius-sm, 4px);
    cursor: pointer;
  }

  .mode-btn:hover {
    color: var(--color-ink, #1e2530);
  }

  .mode-btn.active {
    background: var(--color-vekt, #2b6b7f);
    color: #fff;
    font-weight: 600;
  }

  .mode-hint {
    font-size: 0.82rem;
    color: var(--color-ink-secondary, #4d5666);
  }

  /* Metrics Bar */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-4, 16px);
  }

  .metric-card {
    background: var(--color-felt, #fbfaf8);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    padding: var(--spacing-4, 16px);
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  .metric-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-ink-muted, #6b6660);
    font-weight: 600;
  }

  .metric-value {
    font-size: 1.6rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-ink, #1e2530);
  }

  .metric-sub {
    font-size: 0.75rem;
    color: var(--color-ink-ghost, #9a9488);
  }

  .metric-clickable {
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition:
      border-color 0.1s ease,
      background-color 0.1s ease;
  }

  .metric-clickable:hover {
    border-color: var(--color-vekt, #2b6b7f);
    background-color: var(--color-felt-hover, #f0ede7);
  }

  .metric-clickable.metric-active {
    border-color: var(--color-vekt, #2b6b7f);
    background: var(--color-vekt-bg, #ebf2f5);
    box-shadow: inset 0 -3px 0 var(--color-vekt, #2b6b7f);
  }

  .text-success {
    color: var(--color-score-high, #3d7a5a);
  }
  .text-warn {
    color: var(--color-warn, #8b6914);
  }
  .text-dev {
    color: #d97706;
  }
  .text-vekt {
    color: var(--color-vekt, #2b6b7f);
  }

  /* Toolbar */
  .toolbar-card {
    background: var(--color-felt, #fbfaf8);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    padding: var(--spacing-4, 16px);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3, 12px);
  }

  .search-box {
    display: flex;
    align-items: center;
    background: var(--color-felt-raised, #f4f2ee);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-sm, 4px);
    padding: 0 var(--spacing-3, 12px);
  }

  .search-icon {
    font-size: 0.9rem;
    margin-right: 8px;
    color: var(--color-ink-muted, #6b6660);
  }

  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: var(--spacing-2, 8px) 0;
    font-size: 0.9rem;
    color: var(--color-ink, #1e2530);
    outline: none;
  }

  .clear-search {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: var(--color-ink-muted, #6b6660);
  }

  .filters-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-4, 16px);
    flex-wrap: wrap;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--color-ink-secondary, #4d5666);
  }

  .filter-select {
    padding: 4px 8px;
    border-radius: var(--radius-sm, 4px);
    border: 1px solid var(--color-wire, #ccc8bf);
    background: var(--color-felt-raised, #f4f2ee);
    font-size: 0.85rem;
    color: var(--color-ink, #1e2530);
  }

  .filter-input {
    padding: 4px 8px;
    border-radius: var(--radius-sm, 4px);
    border: 1px solid var(--color-wire, #ccc8bf);
    background: var(--color-felt-raised, #f4f2ee);
    font-size: 0.85rem;
    color: var(--color-ink, #1e2530);
    font-family: var(--font-data, monospace);
  }

  .filter-input-short {
    width: 60px;
  }

  .filter-unit {
    font-size: 0.8rem;
    color: var(--color-ink-secondary, #4d5666);
  }

  .filters-row-secondary {
    padding-top: 0;
    border-top: 1px solid var(--color-wire, #ccc8bf);
    margin-top: var(--spacing-2, 8px);
    padding-top: var(--spacing-2, 8px);
  }

  .filter-context-hint {
    font-size: 0.72rem;
    color: var(--color-ink-ghost, #9a9488);
    font-style: italic;
  }

  .active-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding-top: var(--spacing-2, 8px);
    border-top: 1px dashed var(--color-wire, #ccc8bf);
  }

  .active-filters-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-ink-muted, #6b6660);
    font-weight: 600;
  }

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    padding: 3px 9px;
    border-radius: 999px;
    background: var(--color-vekt-bg, #ebf2f5);
    color: var(--color-vekt, #2b6b7f);
    border: 1px solid var(--color-vekt, #2b6b7f);
    cursor: pointer;
    font-weight: 600;
  }

  .filter-chip:hover {
    background: var(--color-vekt, #2b6b7f);
    color: #fff;
  }

  .chip-x {
    font-size: 0.9rem;
    line-height: 1;
  }

  .clear-all-btn {
    font-size: 0.78rem;
    padding: 3px 10px;
    border-radius: 999px;
    background: transparent;
    color: var(--color-ink-muted, #6b6660);
    border: 1px solid var(--color-wire, #ccc8bf);
    cursor: pointer;
    font-weight: 600;
  }

  .clear-all-btn:hover {
    border-color: #ef4444;
    color: #b91c1c;
  }

  .toggle-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    padding: 4px 10px;
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: 999px;
    background: var(--color-felt-raised, #f4f2ee);
    cursor: pointer;
    color: var(--color-ink-secondary, #4d5666);
    user-select: none;
  }

  .toggle-pill.active {
    background: var(--color-warn-bg, #fdf6e8);
    border-color: var(--color-warn, #8b6914);
    color: var(--color-warn, #8b6914);
    font-weight: 600;
  }

  .results-count {
    margin-left: auto;
    font-size: 0.8rem;
    color: var(--color-ink-muted, #6b6660);
  }

  /* Table */
  .table-wrapper {
    background: var(--color-felt, #fbfaf8);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    overflow-x: auto;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  }

  .contracts-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .contracts-table th {
    background: var(--color-felt-raised, #f4f2ee);
    color: var(--color-ink-muted, #6b6660);
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    padding: var(--spacing-3, 12px) var(--spacing-4, 16px);
    border-bottom: 1px solid var(--color-wire, #ccc8bf);
    text-align: left;
    white-space: nowrap;
  }

  .contract-row {
    cursor: pointer;
    border-bottom: 1px solid var(--color-wire, #ccc8bf);
    transition: background-color 0.1s ease;
  }

  .contract-row:hover {
    background-color: var(--color-felt-hover, #f0ede7);
  }

  .contract-row.row-selected {
    background-color: var(--color-vekt-bg, #ebf2f5);
  }

  .agreement-master-row {
    font-weight: 500;
  }

  .child-subcontract-row {
    background: var(--color-felt-raised, #f8f7f4);
    font-size: 0.82rem;
  }

  .child-subcontract-row:hover {
    background: #eae7e0;
  }

  .chevron-btn {
    background: none;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    color: var(--color-ink-muted, #6b6660);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .chevron-btn:hover {
    background: var(--color-felt-hover, #f0ede7);
    color: var(--color-ink, #1e2530);
  }

  .contracts-table td {
    padding: var(--spacing-3, 12px) var(--spacing-4, 16px);
    vertical-align: middle;
  }

  .name-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .contract-name {
    font-weight: 600;
    color: var(--color-ink, #1e2530);
    line-height: 1.3;
  }

  .subcontract-title {
    color: var(--color-ink, #1e2530);
    font-weight: 600;
  }

  .sub-meta {
    font-size: 0.75rem;
    color: var(--color-ink-muted, #6b6660);
    display: flex;
    gap: 8px;
  }

  .contract-number {
    color: var(--color-ink, #1e2530);
  }

  .badge-type {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: var(--color-felt-raised, #f4f2ee);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-sm, 4px);
    color: var(--color-ink-secondary, #4d5666);
    white-space: nowrap;
  }

  .badge-subcontract {
    font-size: 0.65rem;
    padding: 1px 5px;
    background: #e4e0d7;
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-sm, 4px);
    color: var(--color-ink-secondary, #4d5666);
    white-space: nowrap;
  }

  .suppliers-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .supplier-pill {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: var(--color-vekt-bg, #ebf2f5);
    color: var(--color-vekt, #2b6b7f);
    border: 1px solid var(--color-vekt, #2b6b7f);
    border-radius: var(--radius-sm, 4px);
    font-weight: 600;
    white-space: nowrap;
  }

  .suppliers-names-preview {
    font-size: 0.8rem;
    color: var(--color-ink-secondary, #4d5666);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 250px;
  }

  .supplier-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .supplier-name {
    font-weight: 500;
    color: var(--color-ink, #1e2530);
  }

  .org-number {
    font-size: 0.75rem;
    color: var(--color-ink-muted, #6b6660);
  }

  .period-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.8rem;
  }

  .date-range {
    color: var(--color-ink-secondary, #4d5666);
    font-size: 0.78rem;
  }

  .duration-text {
    font-size: 0.74rem;
    color: var(--color-ink-muted, #6b6660);
    line-height: 1.2;
    margin-top: 1px;
  }

  .duration-text strong {
    color: var(--color-vekt, #2b6b7f);
    font-weight: 600;
  }

  .duration-text-sub {
    font-size: 0.72rem;
    color: var(--color-ink-secondary, #4d5666);
    margin-top: 1px;
  }

  .opsjon-text {
    color: var(--color-warn, #8b6914);
    font-weight: 700;
  }

  .opsjon-dato {
    color: var(--color-ink-ghost, #9a9488);
    font-size: 0.72rem;
  }

  .badge-expiring {
    font-size: 0.65rem;
    padding: 1px 4px;
    background: var(--color-warn-bg, #fdf6e8);
    color: var(--color-warn, #8b6914);
    border-radius: var(--radius-sm, 4px);
    font-weight: 600;
    width: fit-content;
  }

  .badge-expired {
    font-size: 0.65rem;
    padding: 1px 4px;
    background: var(--color-score-low-bg, #fdf5f0);
    color: var(--color-score-low, #8b5a3d);
    border-radius: var(--radius-sm, 4px);
    font-weight: 600;
    width: fit-content;
  }

  .value-text {
    font-weight: 700;
    color: var(--color-vekt, #2b6b7f);
  }

  .text-muted-valuta {
    font-size: 0.75rem;
    color: var(--color-ink-muted, #6b6660);
    font-style: italic;
  }

  .badge-signed {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: var(--color-score-high-bg, #edf5f0);
    color: var(--color-score-high, #3d7a5a);
    border: 1px solid var(--color-score-high, #3d7a5a);
    border-radius: var(--radius-sm, 4px);
    font-weight: 600;
    white-space: nowrap;
  }

  .calloff-count-pill {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: var(--color-felt-hover, #f0ede7);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: 999px;
    font-weight: 600;
    color: var(--color-ink, #1e2530);
    white-space: nowrap;
  }

  .empty-cell {
    color: var(--color-ink-ghost, #9a9488);
  }

  .kav-badge {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 600;
    white-space: nowrap;
  }

  .kav-deviation {
    background: var(--color-warn-bg, #fdf6e8);
    color: #b45309;
    border: 1px solid #f59e0b;
  }

  .kav-amendment {
    background: var(--color-vekt-bg, #ebf2f5);
    color: var(--color-vekt, #2b6b7f);
    border: 1px solid var(--color-vekt, #2b6b7f);
  }

  .kav-normal {
    background: transparent;
    color: var(--color-ink-ghost, #9a9488);
    font-weight: 400;
  }

  .state-card {
    background: var(--color-felt, #fbfaf8);
    border: 1px solid var(--color-wire, #ccc8bf);
    border-radius: var(--radius-md, 6px);
    padding: var(--spacing-10, 40px);
    text-align: center;
    color: var(--color-ink-muted, #6b6660);
  }

  .state-error {
    border-color: #ef4444;
    color: #b91c1c;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-wire, #ccc8bf);
    border-top-color: var(--color-vekt, #2b6b7f);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto var(--spacing-3, 12px) auto;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .font-mono {
    font-family: var(--font-data, monospace);
  }

  .font-bold {
    font-weight: 700;
  }
</style>
