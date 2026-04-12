export const ssr = false;

async function fetchEforms(
  f: typeof fetch,
  id: string,
): Promise<Record<string, any> | null> {
  try {
    const r = await f(`/api/eforms/${id}`);
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

export async function load({ params, fetch }) {
  const id = Number(params.id);
  const [procRes, activitiesRes] = await Promise.all([
    fetch(`/api/procurements/${id}`),
    fetch(`/api/procurements/${id}/activities`),
  ]);
  const proc = procRes.ok ? await procRes.json() : null;
  // API always returns a bare array
  const activities = activitiesRes.ok ? await activitiesRes.json() : [];

  const doffinId = proc?.doffinId || proc?.doffinReferenceId || proc?.doffin_id;
  const doffinIds: string[] = proc?.doffinIds ?? (doffinId ? [doffinId] : []);

  // Fetch all eForms notices in parallel (CN, CAN, etc.)
  const allEforms = await Promise.all(doffinIds.map((id: string) => fetchEforms(fetch, id)));
  const eformsList = allEforms.filter(Boolean) as Record<string, any>[];

  // Primary eforms = first notice (CN), for backwards compat
  const eforms = eformsList[0] ?? null;

  // Find CAN (ContractAwardNotice) if it exists
  const eformsCan =
    eformsList.find((e) => e.notice_type === 'ContractAwardNotice') ?? null;

  return { proc, activities, eforms, eformsCan };
}
