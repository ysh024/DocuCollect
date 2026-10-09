import { NextRequest, NextResponse } from "next/server";

const NEON_AUTH_URL =
  process.env.NEON_AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
  "https://ep-wild-snow-azyh1uu4.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";

async function proxyHandler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join("/") || "";
  const cleanBase = NEON_AUTH_URL.replace(/\/$/, "");
  const targetUrl = `${cleanBase}/${path}${req.nextUrl.search}`;

  const requestHeaders: Record<string, string> = {
    "content-type": req.headers.get("content-type") || "application/json",
    accept: req.headers.get("accept") || "application/json",
    origin: req.headers.get("origin") || req.nextUrl.origin || "http://localhost:3000",
  };

  const cookie = req.headers.get("cookie");
  if (cookie) {
    requestHeaders["cookie"] = cookie;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    requestHeaders["authorization"] = authHeader;
  }

  let body: string | undefined = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.text();
    } catch {
      body = undefined;
    }
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: requestHeaders,
      body: body,
      redirect: "follow",
    });

    const resHeaders = new Headers();
    const setCookies = upstreamRes.headers.getSetCookie
      ? upstreamRes.headers.getSetCookie()
      : [upstreamRes.headers.get("set-cookie")].filter(Boolean) as string[];

    setCookies.forEach((sc) => {
      resHeaders.append("set-cookie", sc);
    });

    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) {
      resHeaders.set("content-type", contentType);
    }

    const responseText = await upstreamRes.text();
    return new NextResponse(responseText, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error("Neon Auth Proxy Error:", err);
    return NextResponse.json({ error: "Failed to reach Neon Auth service", message: err.message }, { status: 502 });
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const DELETE = proxyHandler;
export const PATCH = proxyHandler;
