// Vercel Edge Middleware — runs before static files are served.
// On nlsshowcases.com only: serve the NLS public page at "/" (clean URL).
// Every other host (league-hunter.vercel.app, previews) passes through untouched.
export const config = { matcher: '/' };

export default function middleware(request) {
  const url = new URL(request.url);
  const host = (request.headers.get('host') || '').toLowerCase();
  if (host === 'nlsshowcases.com' || host === 'www.nlsshowcases.com') {
    url.pathname = '/nls-public.html';
    return new Response(null, { headers: { 'x-middleware-rewrite': url.toString() } });
  }
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}
