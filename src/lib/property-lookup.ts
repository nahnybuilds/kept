// Free property check: looks up a Philadelphia address in the City's public
// open data and summarizes lead certification, rental license, and open L&I
// violations. Runs on the server (see src/routes/api.property-lookup.ts).
//
// Data sources (City of Philadelphia open data):
// - Lead certifications + rental license fields: ArcGIS FeatureServer
//   "lhhp_lead_certifications" (organized by OPA account number).
// - L&I code violations: Carto SQL API table "violations".
// Field names are read case-insensitively and with fallbacks because the
// City occasionally renames columns. Verify against live data after deploy.

export const LEAD_CERTS_URL =
  "https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/lhhp_lead_certifications/FeatureServer/0/query";
export const CARTO_URL = "https://phl.carto.com/api/v2/sql";

export type Status = "current" | "expiring" | "expired" | "missing" | "exempt" | "unknown";

export type PropertyResult = {
  address: string;
  opaAccount: string | null;
  yearBuilt: number | null;
  lead: { status: Status; label: string; expires: string | null };
  license: { status: Status; label: string; expires: string | null };
  violations: { open: number; items: { date: string | null; title: string; status: string }[] } | null;
};

export type LookupResponse =
  | { ok: true; matches: PropertyResult[] }
  | { ok: false; error: "bad_address" | "not_found" | "upstream" };

const SUFFIXES: Record<string, string> = {
  STREET: "ST", AVENUE: "AVE", ROAD: "RD", DRIVE: "DR", LANE: "LN", PLACE: "PL",
  BOULEVARD: "BLVD", COURT: "CT", TERRACE: "TER", PARKWAY: "PKWY", CIRCLE: "CIR",
};
const DIRECTIONS: Record<string, string> = { NORTH: "N", SOUTH: "S", EAST: "E", WEST: "W" };

/** "114 South 45th Street, Apt 2, Philadelphia PA" -> "114 S 45TH ST" */
export function normalizeAddress(input: string): string {
  let s = input.toUpperCase().replace(/[.,#]/g, " ");
  s = s.replace(/\b(PHILADELPHIA|PHILA|PA|PENNSYLVANIA)\b/g, " ").replace(/\b\d{5}(-\d{4})?\b/g, " ");
  s = s.replace(/\b(APT|UNIT|FL|FLOOR|STE|SUITE)\b.*$/, " ");
  const words = s.split(/\s+/).filter(Boolean).map((w) => SUFFIXES[w] ?? DIRECTIONS[w] ?? w);
  return words.join(" ").trim();
}

/** Accepts epoch milliseconds (ArcGIS) or date strings. Returns YYYY-MM-DD or null. */
export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const d = typeof value === "number" ? new Date(value) : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const hit = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (hit !== undefined && row[hit] !== null && row[hit] !== "") return row[hit];
  }
  return null;
}

function classifyByDate(expires: string | null, today: Date): Status {
  if (!expires) return "unknown";
  const ms = new Date(expires).getTime() - today.getTime();
  if (ms < 0) return "expired";
  if (ms <= 365 * 24 * 3600 * 1000) return "expiring";
  return "current";
}

export function classifyLead(row: Record<string, unknown>, today = new Date()) {
  const raw = String(pick(row, "lhhp_certification_status", "certification_status") ?? "").toLowerCase();
  const expires = parseDate(pick(row, "lhhp_cert_expiration_date", "cert_expiration_date", "expiration_date"));
  const yearBuilt = Number(pick(row, "opa_year_built", "year_built")) || null;
  let status: Status;
  if (raw.includes("exempt") || (yearBuilt !== null && yearBuilt >= 1978)) status = "exempt";
  else if (raw.includes("expired")) status = "expired";
  else if (raw.includes("not certified") || raw === "") status = "missing";
  else if (raw.includes("certified")) status = expires ? classifyByDate(expires, today) : "current"; // lead-free certs have no expiry
  else status = "unknown";
  return { status, label: labels.lead[status], expires };
}

export function classifyLicense(row: Record<string, unknown>, today = new Date()) {
  const raw = String(pick(row, "li_rl_status", "rental_license_status", "licensestatus") ?? "").toLowerCase();
  const expires = parseDate(pick(row, "li_rl_expiration_date", "rental_license_expiration_date", "expirationdate"));
  let status: Status;
  if ((!raw || raw === "none") && !expires) status = "missing";
  else if (raw && raw !== "active") status = "expired";
  else status = classifyByDate(expires, today);
  return { status, label: labels.license[status], expires };
}

const labels = {
  lead: {
    current: "Lead certificate on file",
    expiring: "Lead certificate expires within a year",
    expired: "Lead certificate expired",
    missing: "No lead certificate on file",
    exempt: "May only need an exemption (built 1978 or later)",
    unknown: "Couldn't confirm lead certificate status",
  },
  license: {
    current: "Rental license active",
    expiring: "Rental license renews within a year",
    expired: "Rental license not active",
    missing: "No rental license found",
    exempt: "Rental license not required",
    unknown: "Couldn't confirm rental license status",
  },
} satisfies Record<string, Record<Status, string>>;

const CLOSED = /(closed|compli|cmply|compexcp|resolv|cancel|void|withdrawn|demolish|error)/i;
export function isOpenViolation(row: Record<string, unknown>): boolean {
  const status = String(pick(row, "violationstatus", "status", "casestatus") ?? "");
  return status !== "" && !CLOSED.test(status);
}

const sqlString = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function leadCertsQueryUrl(normalized: string): string {
  const where = `UPPER(address) LIKE ${sqlString(`${normalized}%`)}`;
  const params = new URLSearchParams({ where, outFields: "*", returnGeometry: "false", resultRecordCount: "5", f: "json" });
  return `${LEAD_CERTS_URL}?${params}`;
}

export function violationsQueryUrl(opaAccount: string): string {
  const q = `SELECT * FROM violations WHERE opa_account_num = ${sqlString(opaAccount)} ORDER BY violationdate DESC LIMIT 50`;
  return `${CARTO_URL}?${new URLSearchParams({ q })}`;
}

type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export async function lookupProperty(input: string, fetchImpl: FetchLike = fetch, today = new Date()): Promise<LookupResponse> {
  const normalized = normalizeAddress(input);
  if (!/^\d+\s+\S+/.test(normalized)) return { ok: false, error: "bad_address" };

  let features: Record<string, unknown>[];
  try {
    const res = await fetchImpl(leadCertsQueryUrl(normalized));
    if (!res.ok) return { ok: false, error: "upstream" };
    const body = (await res.json()) as { features?: { attributes: Record<string, unknown> }[]; error?: unknown };
    if (body.error || !body.features) return { ok: false, error: "upstream" };
    features = body.features.map((f) => f.attributes);
  } catch {
    return { ok: false, error: "upstream" };
  }
  if (features.length === 0) return { ok: false, error: "not_found" };

  const matches = await Promise.all(
    features.map(async (row): Promise<PropertyResult> => {
      const opa = pick(row, "opa_account", "opa_account_num", "parcel_number");
      const opaAccount = opa === null ? null : String(opa);
      let violations: PropertyResult["violations"] = null;
      if (opaAccount) {
        try {
          const res = await fetchImpl(violationsQueryUrl(opaAccount));
          if (res.ok) {
            const body = (await res.json()) as { rows?: Record<string, unknown>[] };
            const open = (body.rows ?? []).filter(isOpenViolation);
            violations = {
              open: open.length,
              items: open.slice(0, 5).map((v) => ({
                date: parseDate(pick(v, "violationdate")),
                title: String(pick(v, "violationcodetitle", "violationdescription", "violationtype") ?? "Code violation"),
                status: String(pick(v, "violationstatus", "status", "casestatus") ?? ""),
              })),
            };
          }
        } catch {
          violations = null; // show the rest of the result even if violations are unavailable
        }
      }
      return {
        address: String(pick(row, "address") ?? normalized),
        opaAccount,
        yearBuilt: Number(pick(row, "opa_year_built", "year_built")) || null,
        lead: classifyLead(row, today),
        license: classifyLicense(row, today),
        violations,
      };
    }),
  );
  return { ok: true, matches };
}
