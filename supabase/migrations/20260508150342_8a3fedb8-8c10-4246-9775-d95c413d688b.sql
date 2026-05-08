CREATE TABLE public.custom_workout_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  subtitle text,
  accent text NOT NULL DEFAULT 'primary',
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_workout_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own custom days select" ON public.custom_workout_days
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own custom days insert" ON public.custom_workout_days
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own custom days update" ON public.custom_workout_days
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own custom days delete" ON public.custom_workout_days
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_custom_days_user ON public.custom_workout_days(user_id);