// Cloudflare Worker: serves the game's static files, plus GET /api/turn.
//
// Static files are served by Cloudflare first (see wrangler.jsonc); this script only runs for paths that are not a file.
//
// /api/turn returns TURN relay credentials so players behind strict firewalls or mobile networks can still connect.
// Optional: with no relay configured it returns an empty list and the game uses direct connections only.
// Set the variables in Workers & Pages > the worker > Settings > Variables and secrets. Pick ONE option:
//
// Option 1 - any TURN provider with fixed credentials (for example Metered Open Relay's free plan, no card needed):
//   TURN_URLS        comma-separated relay addresses, e.g. turn:global.relay.metered.ca:80,turns:global.relay.metered.ca:443?transport=tcp
//   TURN_USERNAME    the relay username
//   TURN_CREDENTIAL  the relay password (add it as a Secret)
//
// Option 2 - Cloudflare Realtime TURN (free up to 1,000 GB a month, then billed per GB):
//   TURN_KEY_ID, TURN_KEY_API_TOKEN from Realtime > TURN Server. The browser only receives credentials that expire after a day.
//
// The "status" field says what happened, so opening /api/turn in a browser shows whether the relay works:
//   ok | not-configured (variables missing) | cloudflare-error-<code> (wrong key ID or token) | fetch-failed

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

function reply(iceServers, status) {
  return new Response(JSON.stringify({ iceServers, status }), { headers: JSON_HEADERS });
}

// Browsers block port 53 for WebRTC, and trying those addresses only slows the connection down
function dropPort53(server) {
  const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(u => typeof u === 'string' && !/:53(\?|$)/.test(u));
  return urls.length ? { ...server, urls } : null;
}

// Option 1: fixed credentials from any TURN provider
function staticRelay(env) {
  const urls = String(env.TURN_URLS || '').split(',').map(u => u.trim()).filter(u => /^turns?:/.test(u));
  if (!urls.length || !env.TURN_USERNAME || !env.TURN_CREDENTIAL) return null;
  return { urls, username: String(env.TURN_USERNAME), credential: String(env.TURN_CREDENTIAL) };
}

async function turnCredentials(env) {
  const fixed = staticRelay(env);
  if (fixed) return reply([fixed], 'ok');
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return reply([], 'not-configured');
  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: 86400 })
      }
    );
    if (!res.ok) return reply([], 'cloudflare-error-' + res.status);
    const data = await res.json();
    const ice = data.iceServers;
    const list = (Array.isArray(ice) ? ice : (ice ? [ice] : [])).map(dropPort53).filter(Boolean);
    return reply(list, list.length ? 'ok' : 'cloudflare-empty');
  } catch (e) {
    return reply([], 'fetch-failed');
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/turn') {
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
      return turnCredentials(env);
    }
    return env.ASSETS.fetch(request);
  }
};
