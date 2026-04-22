import type { NextRequest } from 'next/server';
import { neonAuthMiddleware } from '@neondatabase/auth/next/server';

type Middleware = ReturnType<typeof neonAuthMiddleware>;

let cached: Middleware | null = null;
const middleware = (): Middleware =>
  (cached ??= neonAuthMiddleware({ loginUrl: '/auth/sign-in' }));

export default function proxy(req: NextRequest) {
  return middleware()(req);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/bookings/:path*',
    '/booking/:path*',
    '/queues/:path*',
    '/reports/:path*',
    '/search/:path*',
    '/settings/:path*'
  ]
};
