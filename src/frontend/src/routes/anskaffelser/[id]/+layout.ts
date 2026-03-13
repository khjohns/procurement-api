export const ssr = false;

export async function load({ params, fetch }) {
	const id = Number(params.id);
	const [procRes, activitiesRes] = await Promise.all([
		fetch(`/api/procurements/${id}`),
		fetch(`/api/procurements/${id}/activities`)
	]);
	const proc = procRes.ok ? await procRes.json() : null;
	// API always returns a bare array
	const activities = activitiesRes.ok ? await activitiesRes.json() : [];

	const doffinId = proc?.doffinReferenceId || proc?.doffin_id;
	const eforms = doffinId
		? await fetch(`/api/eforms/${doffinId}`)
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null)
		: null;

	return { proc, activities, eforms };
}
