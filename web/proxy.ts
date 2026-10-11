import { NextResponse, type NextRequest } from 'next/server';

/**
 * The CRA listings grid used to live at `/` and encode its state in the query
 * string (`/?q=stanley`, `/?cat=Bench%20Plane`, `/?gated=1`). Those URLs are
 * in alert emails, shared links and PostHog history. The grid now lives at
 * /search; a bare `/` is the server-rendered homepage. Anything that arrives
 * at `/` carrying grid state is sent on with its query intact.
 */
const GRID_PARAMS = ['q', 'cat', 'maker', 'cond', 'src', 'pics', 'state', 'min', 'max', 'sort', 'browse', 'gated', 'featured'];

export function proxy(request: NextRequest) {
  const { nextUrl } = request;
  if (nextUrl.pathname === '/' && GRID_PARAMS.some((k) => nextUrl.searchParams.has(k))) {
    const to = nextUrl.clone();
    to.pathname = '/search';
    return NextResponse.redirect(to, 308);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/'] };
