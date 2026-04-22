import { authApiHandler } from '@neondatabase/auth/next/server';

type Handlers = ReturnType<typeof authApiHandler>;
type Ctx = Parameters<Handlers['GET']>[1];

let cached: Handlers | null = null;
const handlers = (): Handlers => (cached ??= authApiHandler());

export const GET = (req: Request, ctx: Ctx) => handlers().GET(req, ctx);
export const POST = (req: Request, ctx: Ctx) => handlers().POST(req, ctx);
export const PUT = (req: Request, ctx: Ctx) => handlers().PUT(req, ctx);
export const DELETE = (req: Request, ctx: Ctx) => handlers().DELETE(req, ctx);
export const PATCH = (req: Request, ctx: Ctx) => handlers().PATCH(req, ctx);
