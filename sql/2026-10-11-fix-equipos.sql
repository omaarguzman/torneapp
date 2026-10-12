-- ============================================================================
-- Corrección · 2026-10-11
-- Las llaves compuestas de la auditoría (equipo + torneo) crearon una segunda
-- relación entre tablas (p. ej. teams ↔ players). Supabase ya no sabía cuál
-- usar al pedir "equipos con sus jugadores" y la pantalla del torneo se quedaba
-- sin equipos (los datos nunca se borraron).
-- Se reemplazan por un trigger con la misma protección.
-- Correr en Supabase → SQL Editor, en torneapp-dev Y en producción.
-- ============================================================================

begin;

alter table public.players drop constraint if exists players_team_same_tournament;
alter table public.team_charges drop constraint if exists team_charges_team_same_tournament;
alter table public.match_attendance drop constraint if exists match_attendance_team_same_tournament;
alter table public.matches drop constraint if exists matches_home_same_tournament;
alter table public.matches drop constraint if exists matches_away_same_tournament;
alter table public.teams drop constraint if exists teams_id_tournament_key;

-- Cada jugador, cargo, asistencia y partido debe usar equipos de SU torneo
create or replace function public.ensure_team_in_tournament()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'matches' then
    if exists (
      select 1 from teams
      where id in (new.home_team_id, new.away_team_id) and tournament_id <> new.tournament_id
    ) then
      raise exception 'TEAM_OTHER_TOURNAMENT';
    end if;
  elsif new.team_id is not null and new.tournament_id is not null and exists (
    select 1 from teams where id = new.team_id and tournament_id <> new.tournament_id
  ) then
    raise exception 'TEAM_OTHER_TOURNAMENT';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['players', 'team_charges', 'match_attendance', 'matches'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_team_same_tournament', t);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.ensure_team_in_tournament()',
      t || '_team_same_tournament', t);
  end loop;
end $$;

commit;

-- Supabase vuelve a leer las relaciones entre tablas
notify pgrst, 'reload schema';
