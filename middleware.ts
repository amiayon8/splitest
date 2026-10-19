import { NextResponse, type NextRequest } from 'next/server';

const STATIC_FILE_EXTENSION_REGEX =
  /\.(?:svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|mp4|webm|ogv|mp3|wav|ogg|m4a|woff|woff2|ttf|eot|otf|json|txt|xml|pdf|csv|zip|wasm)$/i;

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/u/') ||
    STATIC_FILE_EXTENSION_REGEX.test(pathname)
  ) {
    return NextResponse.next();
  }

  const allCookies = request.cookies.getAll();
  const hasSession =
    request.cookies.has('splitest_session') ||
    request.cookies.has('sb-access-token') ||
    allCookies.some(
      (cookie) =>
        cookie.name.startsWith('sb-') &&
        (cookie.name.includes('-auth-token') ||
          cookie.name.includes('-access-token') ||
          cookie.name.endsWith('-token'))
    );

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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|mp4|webm|ogv|mp3|wav|ogg|m4a|woff|woff2|ttf|eot|otf|json|txt|xml|pdf|csv|zip|wasm)$).*)',
  ],
};
