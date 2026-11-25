import { createFileRoute } from "@tanstack/react-router";
import { parseRules } from "@/lib/pay-on-proof";
import { createJob, loadState, requireAdmin, resolveJob, saveRules } from "@/lib/pay-on-proof.server";

const noStore = { "Cache-Control": "no-store" };
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const Route = createFileRoute("/api/pop-jobs")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await requireAdmin(request);
        if (denied) return denied;
        return Response.json(await loadState(), { headers: noStore });
      },
      POST: async ({ request }) => {
        const denied = await requireAdmin(request);
        if (denied) return denied;
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!body) return Response.json({ ok: false, error: "Bad request" }, { status: 400 });

        try {
          switch (body.op) {
            case "create": {
              const address = str(body.address, 200);
              const payerName = str(body.payerName, 120);
              const payeeName = str(body.payeeName, 120);
              const amountCents = Math.round(Number(body.amountDollars) * 100);
              if (!address || !payerName || !payeeName) return Response.json({ ok: false, error: "Address, landlord, and inspector are required." }, { status: 400 });
              const result = await createJob({ address, payerName, payeeName, amountCents });
              return Response.json(result, { status: result.ok ? 200 : 400, headers: noStore });
            }
            case "approve":
            case "reject":
            case "wait": {
              const result = await resolveJob(str(body.jobId, 64), body.op);
              return Response.json(result, { status: result.ok ? 200 : 400, headers: noStore });
            }
            case "rules": {
              const rules = parseRules(body.rules);
              if (!rules) return Response.json({ ok: false, error: "Invalid limits." }, { status: 400 });
              await saveRules(rules);
              return Response.json({ ok: true }, { headers: noStore });
            }
            default:
              return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
          }
        } catch (e) {
          console.error("[pay-on-proof]", e);
          return Response.json({ ok: false, error: "Server error. Check that the Pay-on-Proof tables exist." }, { status: 500 });
        }
      },
    },
  },
});
