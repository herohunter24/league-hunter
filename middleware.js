// Vercel Edge Middleware — runs before static files are served.
// Routing by host:
//  - nlsshowcases.com / www: "/" → NLS public page; any other matched path → redirect to "/".
//  - WEBSITE_X_HOSTS: "/" → Website X admin (index.html), as before.
//  - SALES_HOST (league-hunter.vercel.app): "/" → League Hunter sales page;
//    "/admin" and "/index.html" → redirect to Website X's own hostname (old bookmarks).
//  - Any other host (Vercel previews, localhost): "/" → sales page; "/admin" → Website X (for testing).
// Rewrites never re-enter a path that would rewrite again, so there is no loop.

// Website X hostname(s). Change here if the Vercel domain alias has a different name.
const WEBSITE_X_HOSTS = ['websitex.vercel.app'];
const SALES_HOST = 'league-hunter.vercel.app';
const NLS_HOSTS = ['nlsshowcases.com', 'www.nlsshowcases.com'];

export const config = { matcher: ['/', '/admin', '/index.html'] };

const rewrite = (url, pathname) => {
  const u = new URL(url);
  u.pathname = pathname;
  return new Response(null, { headers: { 'x-middleware-rewrite': u.toString() } });
};
const redirect = location => new Response(null, { status: 307, headers: { Location: location } });
const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

export default function middleware(request) {
  const url = new URL(request.url);
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  const path = url.pathname;

  if (NLS_HOSTS.includes(host)) {
    if (path === '/') return rewrite(url, '/nls-public.html');
    const home = new URL(url);
    home.pathname = '/';
    home.search = '';
    return redirect(home.toString());
  }

  if (WEBSITE_X_HOSTS.includes(host)) {
    if (path === '/') return rewrite(url, '/index.html');
    return next();
  }

  if (host === SALES_HOST) {
    if (path === '/') return rewrite(url, '/sales.html');
    return redirect('https://' + WEBSITE_X_HOSTS[0] + '/');
  }

  // Previews / localhost
  if (path === '/') return rewrite(url, '/sales.html');
  if (path === '/admin') return rewrite(url, '/index.html');
  return next();
}
