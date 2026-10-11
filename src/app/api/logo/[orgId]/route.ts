import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getS3Client, getStorageBucket, isS3Configured } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { getCachedLogo, setCachedLogo } from "@/lib/logo-cache";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  if (!orgId) {
    return new NextResponse("Missing organization ID", { status: 400 });
  }

  const versionParam = req.nextUrl.searchParams.get("v");

  // Check fast in-memory cache unless version parameter is passed
  const cached = !versionParam ? getCachedLogo(orgId) : null;
  let logoUrl: string | null = null;

  if (cached && Date.now() < cached.expires) {
    logoUrl = cached.logoUrl;
  } else {
    const sql = getDb();
    if (!sql) {
      return new NextResponse("Database unavailable", { status: 503 });
    }

    try {
      const orgs = await sql`
        SELECT id, name, logo_url FROM public.organizations WHERE id::text = ${orgId} LIMIT 1;
      `;
      logoUrl = orgs.length > 0 && orgs[0].logo_url ? (orgs[0].logo_url as string) : null;
      setCachedLogo(orgId, { logoUrl, expires: Date.now() + 10 * 60 * 1000 });
    } catch (err: any) {
      console.warn("Database error loading logo:", err);
      return new NextResponse("Failed to load logo", { status: 500 });
    }
  }

  if (!logoUrl) {
    return new NextResponse("Logo not found", { status: 404 });
  }

  try {
    // 1. If stored as Base64 Data URL
    if (logoUrl.startsWith("data:")) {
      const matches = logoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": mimeType,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": versionParam ? "public, max-age=31536000, immutable" : "public, max-age=60, stale-while-revalidate=300",
          },
        });
      }
    }

    // 2. If stored as S3 Storage Path
    if (isS3Configured() && (logoUrl.startsWith("logos/") || logoUrl.startsWith("org-"))) {
      try {
        const s3 = getS3Client();
        const bucket = getStorageBucket();
        const obj = await s3.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: logoUrl,
          })
        );

        if (obj.Body) {
          const stream = obj.Body as any;
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          const buffer = Buffer.concat(chunks);
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": obj.ContentType || "image/webp",
              "Content-Length": buffer.length.toString(),
              "Cache-Control": versionParam ? "public, max-age=31536000, immutable" : "public, max-age=60, stale-while-revalidate=300",
            },
          });
        }
      } catch (s3Err) {
        console.warn("S3 logo fetch error:", s3Err);
      }
    }

    // 3. If external HTTP URL
    if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
      return NextResponse.redirect(logoUrl);
    }

    return new NextResponse("Invalid logo format", { status: 400 });
  } catch (err: any) {
    console.error("Logo route error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
