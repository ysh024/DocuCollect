import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://docucollect.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/security", "/privacy", "/terms", "/refund", "/login", "/signup"],
        disallow: ["/dashboard/", "/upload/", "/api/", "/admin/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
