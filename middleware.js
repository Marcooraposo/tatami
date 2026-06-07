// =============================================================================
// Vercel Edge Middleware — password gate for the demo
// -----------------------------------------------------------------------------
// Protects every page behind HTTP Basic Auth. The password lives in the Vercel
// env var DEMO_PASSWORD (and optional DEMO_USER), so it is never shipped to the
// browser. If DEMO_PASSWORD is unset, the gate is disabled (fails open) so local
// dev and unconfigured environments are not locked out.
//
// Setup: Vercel → Project → Settings → Environment Variables
//   DEMO_PASSWORD = <your password>      (required to enable the gate)
//   DEMO_USER     = <username>           (optional, defaults to "demo")
// =============================================================================

export const config = {
  // Run on everything except Vercel internals and static assets that don't need gating.
  matcher: ['/((?!_next/|favicon.ico|robots.txt).*)'],
};

export default function middleware(request) {
  const PASSWORD = process.env.DEMO_PASSWORD;
  // No password configured → gate disabled.
  if (!PASSWORD) return;

  const USER = process.env.DEMO_USER || 'demo';
  const auth = request.headers.get('authorization') || '';

  if (auth.startsWith('Basic ')) {
    let decoded = '';
    try { decoded = atob(auth.slice(6)); } catch { decoded = ''; }
    const idx = decoded.indexOf(':');
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    if (user === USER && pass === PASSWORD) {
      return; // authorized → continue to the app
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Tatami Demo", charset="UTF-8"',
      'Content-Type': 'text/plain',
    },
  });
}
