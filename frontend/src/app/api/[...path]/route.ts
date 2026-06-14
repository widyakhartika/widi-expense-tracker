import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_KEY = process.env.API_KEY || "";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!API_KEY) {
    return NextResponse.json({ error: "Frontend API proxy is not configured" }, { status: 500 });
  }

  const params = await context.params;
  const path = params.path.join("/");
  const upstreamUrl = new URL(`/api/${path}`, API_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      "Content-Type": request.headers.get("content-type") || "application/json",
      "X-API-Key": API_KEY,
    },
    body,
    cache: "no-store",
  });

  const contentType = upstream.headers.get("content-type") || "application/json";
  const responseBody = await upstream.text();

  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { "Content-Type": contentType },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
