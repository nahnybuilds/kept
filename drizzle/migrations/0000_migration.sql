CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  letter_code text,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  property_address text NOT NULL,
  best_time text NOT NULL
);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a lead" ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (
  length(full_name) BETWEEN 1 AND 200 AND length(phone) BETWEEN 7 AND 40
  AND length(property_address) BETWEEN 3 AND 300
  AND best_time IN ('Morning','Afternoon','Evening')
  AND (email IS NULL OR length(email) <= 255)
  AND (letter_code IS NULL OR length(letter_code) <= 40)
);