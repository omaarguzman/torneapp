-- ============================================================================
-- Liguilla (fase final por eliminación)
-- Cada ronda es una jornada más del fixture con `stage` (repechaje, octavos,
-- cuartos, semifinal, tercer_lugar, final). Cada eliminatoria vive en
-- playoff_ties y sus partidos apuntan a ella (matches.playoff_tie_id).
-- La tabla general solo cuenta partidos sin playoff_tie_id.
-- ============================================================================

-- 1) Configuración por torneo
alter table public.tournaments
  add column if not exists playoff_qualifiers integer,
  add column if not exists playoff_direct integer,
  add column if not exists playoff_legs jsonb not null default '{}'::jsonb,
  add column if not exists playoff_tiebreak text not null default 'seed',
  add column if not exists playoff_started_at timestamptz;

alter table public.tournaments drop constraint if exists tournaments_playoff_tiebreak_check;
alter table public.tournaments add constraint tournaments_playoff_tiebreak_check
  check (playoff_tiebreak in ('seed', 'penalties'));
alter table public.tournaments drop constraint if exists tournaments_playoff_qualifiers_check;
alter table public.tournaments add constraint tournaments_playoff_qualifiers_check
  check (playoff_qualifiers is null or playoff_qualifiers in (2, 4, 8, 16));

-- 2) Jornadas de liguilla
alter table public.matchdays
  add column if not exists stage text,
  add column if not exists playoff_leg integer;

-- 3) Lugar de cada equipo en la tabla general al iniciar la liguilla.
--    Llave propia (id) a propósito: con (torneo, equipo) como llave, Supabase la
--    tomaría como tabla puente torneos↔equipos y las consultas "torneo con sus
--    equipos" se volverían ambiguas.
create table if not exists public.playoff_seeds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  seed integer not null,
  unique (tournament_id, team_id)
);

-- 4) Eliminatorias (una por cruce; con 1 o 2 partidos)
create table if not exists public.playoff_ties (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  stage text not null,
  position integer not null,
  high_team_id uuid not null references public.teams (id) on delete cascade,
  low_team_id uuid not null references public.teams (id) on delete cascade,
  high_seed integer not null,
  low_seed integer not null,
  legs integer not null default 1 check (legs in (1, 2)),
  winner_team_id uuid references public.teams (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists playoff_ties_tournament_idx on public.playoff_ties (tournament_id, stage);

alter table public.matches
  add column if not exists playoff_tie_id uuid references public.playoff_ties (id) on delete cascade,
  add column if not exists leg integer,
  add column if not exists penalties_home integer,
  add column if not exists penalties_away integer;

-- 5) Permisos: el admin todo; el delegado solo lee (si no está bloqueado)
alter table public.playoff_seeds enable row level security;
alter table public.playoff_ties enable row level security;
revoke all on public.playoff_seeds, public.playoff_ties from anon;
revoke truncate on public.playoff_seeds, public.playoff_ties from authenticated;

drop policy if exists "admin gestiona lugares de liguilla" on public.playoff_seeds;
create policy "admin gestiona lugares de liguilla" on public.playoff_seeds for all
  using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));
drop policy if exists "delegado ve lugares de liguilla" on public.playoff_seeds;
create policy "delegado ve lugares de liguilla" on public.playoff_seeds for select
  using (tournament_id in (select my_delegate_tournament_ids())
         and tournament_id not in (select my_blocked_tournament_ids()));

drop policy if exists "admin gestiona eliminatorias" on public.playoff_ties;
create policy "admin gestiona eliminatorias" on public.playoff_ties for all
  using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));
drop policy if exists "delegado ve eliminatorias" on public.playoff_ties;
create policy "delegado ve eliminatorias" on public.playoff_ties for select
  using (tournament_id in (select my_delegate_tournament_ids())
         and tournament_id not in (select my_blocked_tournament_ids()));

-- Bitácora de soporte también para la liguilla
drop trigger if exists playoff_ties_support_log on public.playoff_ties;
create trigger playoff_ties_support_log after insert or update or delete on public.playoff_ties
  for each row execute function public.log_support_action();

-- 6) Crear una ronda (y, en la primera, guardar los lugares de la tabla).
--    Todo o nada. security invoker: aplican las políticas del admin.
create or replace function public.create_playoff_round(p_tournament_id uuid, p_seeds json, p_round json)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_stage text := p_round->>'stage';
  md json;
  v_md_id uuid;
  v_number integer;
begin
  if not is_tournament_admin(p_tournament_id) then raise exception 'NOT_ADMIN'; end if;

  if p_seeds is not null then
    if exists (select 1 from playoff_seeds where tournament_id = p_tournament_id) then
      raise exception 'ALREADY_STARTED';
    end if;
    insert into playoff_seeds (tournament_id, team_id, seed)
    select p_tournament_id, (s->>'team')::uuid, (s->>'seed')::int from json_array_elements(p_seeds) s;
    update tournaments set playoff_started_at = now() where id = p_tournament_id;
  elsif not exists (select 1 from playoff_seeds where tournament_id = p_tournament_id) then
    raise exception 'NOT_STARTED';
  end if;

  if exists (select 1 from playoff_ties where tournament_id = p_tournament_id and stage = v_stage) then
    raise exception 'STAGE_EXISTS';
  end if;

  perform set_config('torneapp.change_source', 'Liguilla', true);

  insert into playoff_ties (id, tournament_id, stage, position, high_team_id, low_team_id, high_seed, low_seed, legs)
  select (t->>'id')::uuid, p_tournament_id, v_stage, (t->>'position')::int,
         (t->>'high')::uuid, (t->>'low')::uuid, (t->>'high_seed')::int, (t->>'low_seed')::int, (t->>'legs')::int
  from json_array_elements(p_round->'ties') t;

  for md in select * from json_array_elements(p_round->'matchdays') loop
    select coalesce(max(number), 0) + 1 into v_number from matchdays where tournament_id = p_tournament_id;
    insert into matchdays (tournament_id, number, week_start, stage, playoff_leg)
    values (p_tournament_id, v_number, (md->>'week_start')::date, v_stage, nullif(md->>'leg', '')::int)
    returning id into v_md_id;

    insert into matches (tournament_id, matchday_id, home_team_id, away_team_id, venue_id,
                         match_date, start_time, end_time, playoff_tie_id, leg)
    select p_tournament_id, v_md_id, (m->>'home')::uuid, (m->>'away')::uuid, (m->>'venue')::uuid,
           (m->>'date')::date, (m->>'start')::time, (m->>'end')::time, (m->>'tie')::uuid, (m->>'leg')::int
    from json_array_elements(md->'matches') m;
  end loop;
end;
$$;
revoke all on function public.create_playoff_round(uuid, json, json) from public, anon;
grant execute on function public.create_playoff_round(uuid, json, json) to authenticated;

-- 7) Deshacer la última ronda mientras no tenga partidos jugados.
--    Si era la primera, la liguilla vuelve a "sin iniciar".
create or replace function public.undo_playoff_round(p_tournament_id uuid, p_stage text)
returns void
language plpgsql
set search_path = public
as $$
begin
  if not is_tournament_admin(p_tournament_id) then raise exception 'NOT_ADMIN'; end if;
  if exists (
    select 1 from matches m join playoff_ties t on t.id = m.playoff_tie_id
    where t.tournament_id = p_tournament_id and t.stage = p_stage
      and (m.status in ('played', 'suspended') or m.suspended_minute is not null)
  ) then
    raise exception 'HAS_PLAYED';
  end if;

  perform set_config('torneapp.change_source', 'Liguilla', true);
  delete from matches where tournament_id = p_tournament_id
    and playoff_tie_id in (select id from playoff_ties where tournament_id = p_tournament_id and stage = p_stage);
  delete from matchdays where tournament_id = p_tournament_id and stage = p_stage;
  delete from playoff_ties where tournament_id = p_tournament_id and stage = p_stage;

  if not exists (select 1 from playoff_ties where tournament_id = p_tournament_id) then
    delete from playoff_seeds where tournament_id = p_tournament_id;
    update tournaments set playoff_started_at = null where id = p_tournament_id;
  end if;
end;
$$;
revoke all on function public.undo_playoff_round(uuid, text) from public, anon;
grant execute on function public.undo_playoff_round(uuid, text) to authenticated;

-- 8) El calendario del delegado y la imagen del rol conocen la ronda de cada jornada

CREATE OR REPLACE FUNCTION public.get_delegate_fixture(p_team_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tournament uuid;
  v_locked boolean;
  result json;
begin
  select tournament_id into v_tournament
  from teams where id = p_team_id and delegate_id = auth.uid() and not access_blocked
    and not tournament_paused(tournament_id);
  if v_tournament is null then return '[]'::json; end if;

  v_locked := exists (select 1 from team_charges where team_id = p_team_id and not paid);

  select coalesce(json_agg(md_json order by md_number), '[]'::json) into result
  from (
    select md.number as md_number, json_build_object(
      'id', md.id,
      'number', md.number,
      'stage', md.stage,
      'playoff_leg', md.playoff_leg,
      'matches', coalesce((
        select json_agg(json_build_object(
          'id', m.id,
          'home_team_id', m.home_team_id,
          'away_team_id', m.away_team_id,
          'match_date', m.match_date,
          'start_time', m.start_time,
          'status', m.status,
          'walkover', m.walkover,
          'score_home', case when v_locked then null else m.score_home end,
          'score_away', case when v_locked then null else m.score_away end,
          'home_team', json_build_object('name', ht.name),
          'away_team', json_build_object('name', at.name),
          'venue', json_build_object('name', v.name)
        ))
        from matches m
        join teams ht on ht.id = m.home_team_id
        join teams at on at.id = m.away_team_id
        left join venues v on v.id = m.venue_id
        where m.matchday_id = md.id
      ), '[]'::json)
    ) as md_json
    from matchdays md
    where md.tournament_id = v_tournament
  ) s;

  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_matchday_image_data(p_matchday_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_md matchdays%rowtype;
  v_is_admin boolean;
begin
  select * into v_md from matchdays where id = p_matchday_id;
  if v_md.id is null then return null; end if;

  v_is_admin := is_tournament_admin(v_md.tournament_id);
  if not (
    v_is_admin
    or exists (
      select 1 from teams
      where tournament_id = v_md.tournament_id and delegate_id = auth.uid() and not access_blocked
        and not tournament_paused(tournament_id)
    )
  ) then
    return null;
  end if;

  return json_build_object(
    'is_admin', v_is_admin,
    'tournament', (select json_build_object('name', name, 'logo_url', logo_url, 'rol_template', rol_template) from tournaments where id = v_md.tournament_id),
    'matchday', json_build_object('number', v_md.number, 'week_start', v_md.week_start, 'image_note', v_md.image_note, 'stage', v_md.stage, 'playoff_leg', v_md.playoff_leg, 'rol_template', v_md.rol_template),
    'matches', coalesce((
      select json_agg(json_build_object(
        'home_team_id', m.home_team_id,
        'away_team_id', m.away_team_id,
        'match_date', m.match_date,
        'start_time', m.start_time,
        'venue_name', v.name
      ))
      from matches m
      left join venues v on v.id = m.venue_id
      where m.matchday_id = v_md.id and m.status <> 'pending'
    ), '[]'::json),
    'teams', coalesce((
      select json_agg(json_build_object('id', id, 'name', name, 'logo_url', logo_url))
      from teams where tournament_id = v_md.tournament_id
    ), '[]'::json),
    'postponed_team_ids', coalesce((
      select json_agg(x.team_id) from (
        select home_team_id as team_id from matches
        where tournament_id = v_md.tournament_id and status = 'pending' and postponed_from = v_md.number
        union
        select away_team_id from matches
        where tournament_id = v_md.tournament_id and status = 'pending' and postponed_from = v_md.number
      ) x
    ), '[]'::json),
    'custom_templates', coalesce((
      select json_agg(json_build_object('id', id, 'name', name, 'image_url', image_url))
      from rol_templates where tournament_id = v_md.tournament_id
    ), '[]'::json)
  );
end;
$function$
;
