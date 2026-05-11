
CREATE TABLE public.exercise_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_name text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_name)
);

ALTER TABLE public.exercise_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notes select" ON public.exercise_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own notes insert" ON public.exercise_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notes update" ON public.exercise_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own notes delete" ON public.exercise_notes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_exercise_notes_user_exercise ON public.exercise_notes(user_id, exercise_name);
