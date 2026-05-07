
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  day TEXT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INT NOT NULL,
  weight NUMERIC(6,2),
  reps INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_day ON public.workout_sessions(user_id, day, performed_at DESC);
CREATE INDEX idx_setlogs_user_ex ON public.set_logs(user_id, exercise_name, created_at DESC);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own sessions select" ON public.workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own sessions insert" ON public.workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sessions update" ON public.workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own sessions delete" ON public.workout_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own sets select" ON public.set_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own sets insert" ON public.set_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own sets update" ON public.set_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own sets delete" ON public.set_logs FOR DELETE USING (auth.uid() = user_id);
