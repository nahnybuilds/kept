-- Pay-on-Proof tables. Only the server (service role) can read or write them;
-- the public site key has no access.

CREATE TABLE public.pop_rules (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  per_job_limit_cents integer NOT NULL DEFAULT 25000 CHECK (per_job_limit_cents >= 0),
  monthly_limit_cents integer NOT NULL DEFAULT 100000 CHECK (monthly_limit_cents >= 0),
  auto_pay boolean NOT NULL DEFAULT true,
  max_wait_days integer NOT NULL DEFAULT 21 CHECK (max_wait_days BETWEEN 1 AND 365),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.pop_rules (id) VALUES (1);

CREATE TABLE public.pop_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  address text NOT NULL CHECK (length(address) BETWEEN 3 AND 200),
  opa_account text,
  payer_name text NOT NULL CHECK (length(payer_name) BETWEEN 1 AND 120),
  payee_name text NOT NULL CHECK (length(payee_name) BETWEEN 1 AND 120),
  amount_cents integer NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 1000000),
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','needs_review','paid','refunded')),
  held_at timestamptz NOT NULL DEFAULT now(),
  baseline_cert_status text,
  baseline_cert_expires date,
  last_checked_at timestamptz,
  last_note text,
  review_reason text,
  proof jsonb,
  paid_at timestamptz,
  payout_ref text,
  resolved_by text
);
CREATE INDEX pop_jobs_status_idx ON public.pop_jobs (status);

CREATE TABLE public.pop_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  job_id uuid REFERENCES public.pop_jobs (id) ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL,
  detail jsonb
);
CREATE INDEX pop_events_job_idx ON public.pop_events (job_id, created_at DESC);

ALTER TABLE public.pop_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pop_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pop_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pop_rules, public.pop_jobs, public.pop_events FROM anon, authenticated;
GRANT ALL ON public.pop_rules, public.pop_jobs, public.pop_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.pop_events_id_seq TO service_role;
