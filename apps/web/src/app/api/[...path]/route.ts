import { type NextRequest, NextResponse } from 'next/server';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'content-encoding',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

async function proxyRequest(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const path = pathSegments.join('/');
  const targetUrl = `${API_URL}/${path}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP_HEADERS) {
    headers.delete(name);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(targetUrl, init);
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];

  const responseHeaders = new Headers(upstream.headers);
  for (const name of HOP_BY_HOP_HEADERS) {
    responseHeaders.delete(name);
  }
  responseHeaders.delete('set-cookie');

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });

  for (const cookie of setCookies) {
    response.headers.append('Set-Cookie', cookie);
  }

  return response;
}

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
