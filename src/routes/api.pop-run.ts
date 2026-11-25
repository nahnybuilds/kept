import { createFileRoute } from "@tanstack/react-router";
import { requireAdminOrCron, runAgent } from "@/lib/pay-on-proof.server";

// One agent pass: check City records for every held job, then pay, wait, or
// send to the owner for approval. Called by the admin page's "Run checks now"
// button, or on a schedule (Bearer LOVABLE_CRON_SECRET).
export const Route = createFileRoute("/api/pop-run")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await requireAdminOrCron(request);
        if (denied) return denied;
        try {
          return Response.json({ ok: true, summary: await runAgent() }, { headers: { "Cache-Control": "no-store" } });
        } catch (e) {
          console.error("[pay-on-proof run]", e);
          return Response.json({ ok: false, error: "Agent run failed. Check that the Pay-on-Proof tables exist." }, { status: 500 });
        }
      },
    },
  },
});
