ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS base1_pitcher uuid REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base2_pitcher uuid REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base3_pitcher uuid REFERENCES public.players(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.run_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id uuid REFERENCES public.games(id) ON DELETE CASCADE,
  pa_id uuid REFERENCES public.plate_appearances(id) ON DELETE CASCADE,
  pitcher_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  runs numeric NOT NULL DEFAULT 0,
  inning integer NOT NULL DEFAULT 1,
  kind text NOT NULL DEFAULT 'run',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.run_charges TO authenticated;
GRANT ALL ON public.run_charges TO service_role;

ALTER TABLE public.run_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own run charges" ON public.run_charges
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_run_charges_pitcher ON public.run_charges(pitcher_id, created_at);
CREATE INDEX IF NOT EXISTS idx_run_charges_game ON public.run_charges(game_id);