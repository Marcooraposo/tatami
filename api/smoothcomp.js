// =============================================================================
// /api/smoothcomp — Open Graph enricher for Smoothcomp (and generic) event URLs
// -----------------------------------------------------------------------------
// Smoothcomp has no public data API, so we fetch the event page server-side
// (avoids browser CORS) and extract Open Graph / meta tags to prefill an event.
// Best-effort: if the page can't be fetched or has no usable meta, returns
// { ok:false } and the admin fills the fields manually.
//
// Usage: GET /api/smoothcomp?url=<event url>
// =============================================================================

function pickMeta(html, names) {
  for (const name of names) {
    // <meta property="og:title" content="...">  (property or name, any order)
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']` +
      `|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      'i'
    );
    const m = html.match(re);
    if (m) return (m[1] || m[2] || '').trim();
  }
  return '';
}

function decode(s) {
  return (s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
}

export default async function handler(req, res) {
  const url = (req.query && req.query.url) || '';
  if (!/^https?:\/\//i.test(url)) {
    res.status(400).json({ ok: false, error: 'Provide a valid http(s) url' });
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TatamiBot/1.0; +events-enrich)' }
    });
    clearTimeout(timer);
    if (!r.ok) { res.status(200).json({ ok: false, error: `Upstream ${r.status}` }); return; }
    const html = await r.text();

    const title = decode(pickMeta(html, ['og:title', 'twitter:title']))
      || decode((html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '');
    const description = decode(pickMeta(html, ['og:description', 'twitter:description', 'description']));
    const image = pickMeta(html, ['og:image', 'twitter:image']);
    const siteName = decode(pickMeta(html, ['og:site_name']));

    // Parse a Smoothcomp event id from the URL if present (…/event/<id>/…)
    const idMatch = url.match(/\/event\/(\d+)/i);
    const externalId = idMatch ? idMatch[1] : null;
    const isSmoothcomp = /smoothcomp\.com/i.test(url) || /smoothcomp/i.test(siteName);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.status(200).json({
      ok: !!(title || image),
      source: isSmoothcomp ? 'smoothcomp' : 'web',
      externalId,
      externalUrl: url,
      title, description, image, siteName
    });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e && e.message || e) });
  }
}
