CREATE TABLE public.body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  measured_at timestamptz NOT NULL DEFAULT now(),
  weight numeric,
  body_fat numeric,
  waist numeric,
  chest numeric,
  arm numeric,
  thigh numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bm select" ON public.body_measurements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own bm insert" ON public.body_measurements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bm update" ON public.body_measurements FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bm delete" ON public.body_measurements FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX body_measurements_user_date ON public.body_measurements (user_id, measured_at DESC);