import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icons')
  ) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.has('sb-access-token') ||
    request.cookies.has('splitest_session') ||
    request.cookies.has('splitest_demo_auth');

  if (pathname === '/login') {
    if (hasSession && !searchParams.has('force')) {
      const nextUrl = searchParams.get('next') || '/';
      return NextResponse.redirect(new URL(nextUrl, request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
