-- ============================================================================
-- Página pública del torneo (solo la tabla de posiciones)
-- El admin la activa y elige el nombre del link: /t/<public_slug>.
-- La función pública solo entrega nombres y escudos de equipos y marcadores
-- de la fase regular: nada de jugadores, CURP, pagos ni contactos.
-- ============================================================================

alter table public.tournaments
  add column if not exists public_enabled boolean not null default false,
  add column if not exists public_slug text;

alter table public.tournaments drop constraint if exists tournaments_public_slug_format;
alter table public.tournaments add constraint tournaments_public_slug_format
  check (public_slug is null or public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(public_slug) between 3 and 60);

create unique index if not exists tournaments_public_slug_key on public.tournaments (public_slug);

create or replace function public.get_public_standings(p_slug text)
returns json
language sql
stable security definer
set search_path = public
as $$
  select json_build_object(
    'name', t.name,
    'logo_url', t.logo_url,
    'double_walkover_rule', t.double_walkover_rule,
    'teams', coalesce((
      select json_agg(json_build_object('id', tm.id, 'name', tm.name, 'logo_url', tm.logo_url))
      from teams tm where tm.tournament_id = t.id
    ), '[]'::json),
    'matches', coalesce((
      select json_agg(json_build_object(
        'home_team_id', m.home_team_id, 'away_team_id', m.away_team_id,
        'score_home', m.score_home, 'score_away', m.score_away, 'walkover', m.walkover
      ))
      from matches m
      where m.tournament_id = t.id and m.status = 'played' and m.playoff_tie_id is null
        and m.score_home is not null and m.score_away is not null
    ), '[]'::json),
    'last_played', (
      select max(m.match_date) from matches m
      where m.tournament_id = t.id and m.status = 'played' and m.playoff_tie_id is null
    )
  )
  from tournaments t
  where t.public_slug = lower(p_slug) and t.public_enabled and t.disabled_at is null
$$;

revoke all on function public.get_public_standings(text) from public;
grant execute on function public.get_public_standings(text) to anon, authenticated;
