import { createFileRoute } from "@tanstack/react-router";
import { lookupProperty } from "@/lib/property-lookup";

export const Route = createFileRoute("/api/property-lookup")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const address = new URL(request.url).searchParams.get("address")?.slice(0, 200) ?? "";
        const result = await lookupProperty(address);
        return Response.json(result, {
          status: result.ok ? 200 : result.error === "upstream" ? 502 : 200,
          headers: { "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
