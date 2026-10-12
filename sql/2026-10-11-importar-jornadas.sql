-- ============================================================================
-- Importar jornadas jugadas · 2026-10-11
-- Para torneos que empezaron fuera de Torneapp: el admin captura las jornadas
-- ya jugadas (cruces y marcadores) y después "Actualizar fixture" planea el resto.
-- Correr en Supabase → SQL Editor (primero en torneapp-dev, luego en producción).
-- ============================================================================

-- p_validated = false deja las cédulas abiertas (con su link de árbitro) para
-- capturar goleadores, tarjetas y asistencia después.
-- Todo o nada: si algo falla, el torneo queda como estaba.
drop function if exists public.import_played_matchdays(uuid, json);

-- security invoker: las políticas del admin (RLS) aplican igual que en la app.
create or replace function public.import_played_matchdays(p_tournament_id uuid, p_matchdays json, p_validated boolean default true)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  md json;
  m json;
  v_md_id uuid;
  v_number int := 0;
begin
  if not is_tournament_admin(p_tournament_id) then raise exception 'NOT_ADMIN'; end if;
  if exists (
    select 1 from matches
    where tournament_id = p_tournament_id
      and (status in ('played', 'suspended') or suspended_minute is not null)
  ) then
    raise exception 'HAS_PLAYED';
  end if;
  if json_array_length(p_matchdays) = 0 then raise exception 'EMPTY'; end if;

  perform set_config('torneapp.change_source', 'Importación', true);

  -- Se reemplaza el fixture que hubiera (sin partidos jugados, no se pierde nada)
  delete from matches where tournament_id = p_tournament_id;
  delete from matchdays where tournament_id = p_tournament_id;

  for md in select * from json_array_elements(p_matchdays) loop
    v_number := v_number + 1;
    insert into matchdays (tournament_id, number, week_start)
    values (p_tournament_id, v_number, (md->>'week_start')::date)
    returning id into v_md_id;

    for m in select * from json_array_elements(md->'matches') loop
      if (m->>'score_home')::int not between 0 and 99 or (m->>'score_away')::int not between 0 and 99 then
        raise exception 'INVALID_SCORE';
      end if;
      if m->>'home' = m->>'away' then raise exception 'SAME_TEAM'; end if;
      if not exists (select 1 from venues where id = (m->>'venue')::uuid and tournament_id = p_tournament_id) then
        raise exception 'INVALID_VENUE';
      end if;

      insert into matches (
        tournament_id, matchday_id, home_team_id, away_team_id, venue_id,
        match_date, start_time, end_time, status, score_home, score_away, validated_at, validated_by
      ) values (
        p_tournament_id, v_md_id, (m->>'home')::uuid, (m->>'away')::uuid, (m->>'venue')::uuid,
        (m->>'date')::date, (m->>'start')::time, (m->>'end')::time, 'played',
        (m->>'score_home')::int, (m->>'score_away')::int,
        case when p_validated then now() end, case when p_validated then v_uid end
      );
    end loop;
  end loop;
end;
$$;

revoke all on function public.import_played_matchdays(uuid, json, boolean) from public, anon;
grant execute on function public.import_played_matchdays(uuid, json, boolean) to authenticated;
