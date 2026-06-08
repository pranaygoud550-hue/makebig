import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getApiOrigin } from '@/lib/apiBase';
import { AUTH_COOKIE_NAME } from '@/lib/authCookie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proxy(req: NextRequest, pathSegments: string[]) {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const path = pathSegments.join('/');
  const target = `${getApiOrigin()}/api/${path}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const upstream = await fetch(target, init);
  const body = await upstream.text();
  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get('content-type');
  if (upstreamType) responseHeaders.set('Content-Type', upstreamType);

  return new NextResponse(body, { status: upstream.status, headers: responseHeaders });
}

type RouteContext = { params: { path: string[] } };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx.params.path);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx.params.path);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx.params.path);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx.params.path);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx.params.path);
}
