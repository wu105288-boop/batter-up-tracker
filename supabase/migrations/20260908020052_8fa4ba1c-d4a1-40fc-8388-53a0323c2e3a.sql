CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  number TEXT,
  throws TEXT NOT NULL DEFAULT 'R',
  bats TEXT NOT NULL DEFAULT 'R',
  is_pitcher BOOLEAN NOT NULL DEFAULT true,
  is_batter BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own players" ON public.players FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '練習賽',
  played_on DATE NOT NULL DEFAULT current_date,
  inning INT NOT NULL DEFAULT 1,
  outs INT NOT NULL DEFAULT 0,
  base1 UUID,
  base2 UUID,
  base3 UUID,
  current_pitcher UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own games" ON public.games FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.plate_appearances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  game_id UUID REFERENCES public.games ON DELETE CASCADE,
  pitcher_id UUID REFERENCES public.players ON DELETE SET NULL,
  batter_id UUID REFERENCES public.players ON DELETE SET NULL,
  balls INT NOT NULL DEFAULT 0,
  strikes INT NOT NULL DEFAULT 0,
  pitches INT NOT NULL DEFAULT 0,
  strike_pitches INT NOT NULL DEFAULT 0,
  result TEXT NOT NULL,
  rbi INT NOT NULL DEFAULT 0,
  outs_made INT NOT NULL DEFAULT 0,
  runs INT NOT NULL DEFAULT 0,
  inning INT NOT NULL DEFAULT 1,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plate_appearances TO authenticated;
GRANT ALL ON public.plate_appearances TO service_role;
ALTER TABLE public.plate_appearances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pa" ON public.plate_appearances FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE INDEX idx_pa_owner_time ON public.plate_appearances (owner_id, occurred_at);
CREATE INDEX idx_pa_pitcher ON public.plate_appearances (pitcher_id);
CREATE INDEX idx_pa_batter ON public.plate_appearances (batter_id);