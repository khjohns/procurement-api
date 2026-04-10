export const ssr = false;

export async function load({ parent }) {
  return await parent();
}
