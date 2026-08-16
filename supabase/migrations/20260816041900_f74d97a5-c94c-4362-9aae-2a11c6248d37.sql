-- Tighten existing policies: authenticated-only + WITH CHECK on updates
DROP POLICY IF EXISTS "own custom days select" ON public.custom_workout_days;
DROP POLICY IF EXISTS "own custom days insert" ON public.custom_workout_days;
DROP POLICY IF EXISTS "own custom days update" ON public.custom_workout_days;
DROP POLICY IF EXISTS "own custom days delete" ON public.custom_workout_days;
CREATE POLICY "own custom days select" ON public.custom_workout_days FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own custom days insert" ON public.custom_workout_days FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own custom days update" ON public.custom_workout_days FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own custom days delete" ON public.custom_workout_days FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own notes select" ON public.exercise_notes;
DROP POLICY IF EXISTS "own notes insert" ON public.exercise_notes;
DROP POLICY IF EXISTS "own notes update" ON public.exercise_notes;
DROP POLICY IF EXISTS "own notes delete" ON public.exercise_notes;
CREATE POLICY "own notes select" ON public.exercise_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notes insert" ON public.exercise_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notes update" ON public.exercise_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notes delete" ON public.exercise_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own sessions select" ON public.workout_sessions;
DROP POLICY IF EXISTS "own sessions insert" ON public.workout_sessions;
DROP POLICY IF EXISTS "own sessions update" ON public.workout_sessions;
DROP POLICY IF EXISTS "own sessions delete" ON public.workout_sessions;
CREATE POLICY "own sessions select" ON public.workout_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sessions insert" ON public.workout_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sessions update" ON public.workout_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sessions delete" ON public.workout_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own sets select" ON public.set_logs;
DROP POLICY IF EXISTS "own sets insert" ON public.set_logs;
DROP POLICY IF EXISTS "own sets update" ON public.set_logs;
DROP POLICY IF EXISTS "own sets delete" ON public.set_logs;
CREATE POLICY "own sets select" ON public.set_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own sets insert" ON public.set_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sets update" ON public.set_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sets delete" ON public.set_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AI usage log for rate limiting
CREATE TABLE public.ai_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'coach',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_events_user_time_idx ON public.ai_usage_events (user_id, created_at DESC);

GRANT SELECT, INSERT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ai usage select" ON public.ai_usage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ai usage insert" ON public.ai_usage_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);