import type { MetadataRoute } from "next";

// Update this if/when the app moves to a custom domain.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ccny-study-ai.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in workspace views have nothing useful for search engines
      // and shouldn't show up in results for other students' searches.
      disallow: ["/dashboard", "/notes", "/progress", "/api/", "/auth/", "/reset-password"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}