// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
// Answers are cached in memory for 60 s (the API's ETags are bound to the
// minute), so a view re-rendered within the minute costs no new request.

const API = 'https://make.fun/api';
const TTL = 60_000;
const cache = new Map();

async function get(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  // A hung API must not hang the page forever: give up after 15 s so the
  // caller can show its retry screen instead of spinning indefinitely.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  let res;
  try {
    res = await fetch(API + path, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  cache.set(path, { at: Date.now(), data });
  return data;
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { columns, entries, phase, rank_key, ... }. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile: { handle, display_name, record, solutions, ... }. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** Drop the cache, so a manual refresh re-reads the API. */
export function clearCache() {
  cache.clear();
}
