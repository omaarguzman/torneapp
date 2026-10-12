-- ============================================================================
-- Auditoría de seguridad · 2026-10-11
-- Correr completo en Supabase → SQL Editor. Es seguro correrlo más de una vez.
-- ============================================================================

-- 1) Revisión previa: si hay datos que mezclan equipos de torneos distintos,
--    se detiene aquí y dice cuántos (no debería haber ninguno).
do $$
declare n int;
begin
  select
    (select count(*) from players p join teams t on t.id = p.team_id where t.tournament_id <> p.tournament_id)
  + (select count(*) from team_charges c join teams t on t.id = c.team_id where t.tournament_id <> c.tournament_id)
  + (select count(*) from match_attendance a join teams t on t.id = a.team_id where t.tournament_id <> a.tournament_id)
  + (select count(*) from matches m join teams t on t.id in (m.home_team_id, m.away_team_id) where t.tournament_id <> m.tournament_id)
  into n;
  if n > 0 then
    raise exception 'Hay % registros con equipos de otro torneo. Avísale a Claude antes de seguir.', n;
  end if;
end $$;

-- 2) (Reemplazado) Las llaves compuestas equipo + torneo que estaban aquí
--    confundían a Supabase al leer equipos con sus jugadores. La protección
--    ahora es un trigger: ver sql/2026-10-11-fix-equipos.sql.

-- 3) Después de la fecha límite, el delegado ya no puede editar ni borrar
--    jugadores (antes podía cambiarle nombre y CURP a uno ya registrado, o
--    borrar a uno con goles y tarjetas). El admin sigue pudiendo todo.
drop policy if exists "Delegado edita jugadores de su equipo" on players;
create policy "Delegado edita jugadores de su equipo" on players
  for update
  using (team_id in (select my_active_delegate_team_ids()) and registration_open_for_team(team_id))
  with check (team_id in (select my_active_delegate_team_ids()) and registration_open_for_team(team_id));

drop policy if exists "Delegado borra jugadores de su equipo" on players;
create policy "Delegado borra jugadores de su equipo" on players
  for delete
  using (team_id in (select my_active_delegate_team_ids()) and registration_open_for_team(team_id));

-- 4) Cédula por link: límites de marcador (máx. 99) y de minutos (0 a 200).
create or replace function public.submit_match_report(
  p_token text,
  p_score_home integer,
  p_score_away integer,
  p_events json,
  p_referee_notes text default null,
  p_attendance json default null,
  p_suspended_minute integer default null,
  p_suspension_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_match matches%rowtype;
  v_events json := coalesce(p_events, '[]'::json);
begin
  select m.* into v_match
  from match_tokens mt join matches m on m.id = mt.match_id
  where mt.token = p_token;

  if v_match.id is null then raise exception 'Partido no encontrado'; end if;
  if v_match.status = 'pending' then raise exception 'MATCH_PENDING'; end if;
  if v_match.validated_at is not null then raise exception 'MATCH_VALIDATED'; end if;

  if p_score_home is null or p_score_away is null
     or p_score_home < 0 or p_score_away < 0
     or p_score_home > 99 or p_score_away > 99 then
    raise exception 'INVALID_SCORE';
  end if;

  if exists (
    select 1
    from json_array_elements(v_events) e
    left join players p on p.id = (e->>'player_id')::uuid
    where p.id is null
       or p.team_id <> (e->>'team_id')::uuid
       or p.team_id not in (v_match.home_team_id, v_match.away_team_id)
       or (e->>'type') not in ('goal', 'yellow_card', 'red_card')
  ) then
    raise exception 'INVALID_PLAYER';
  end if;

  if exists (
    select 1 from json_array_elements(v_events) e
    where nullif(e->>'minute', '') is not null
      and (nullif(e->>'minute', '')::int < 0 or nullif(e->>'minute', '')::int > 200)
  ) then
    raise exception 'INVALID_MINUTE';
  end if;

  if p_attendance is not null and exists (
    select 1
    from json_array_elements_text(p_attendance) a
    left join players p on p.id = a.value::uuid
    where p.id is null or p.team_id not in (v_match.home_team_id, v_match.away_team_id)
  ) then
    raise exception 'INVALID_PLAYER';
  end if;

  if (select count(*) from json_array_elements(v_events) e
      where e->>'type' = 'goal' and (e->>'team_id')::uuid = v_match.home_team_id) <> p_score_home
  or (select count(*) from json_array_elements(v_events) e
      where e->>'type' = 'goal' and (e->>'team_id')::uuid = v_match.away_team_id) <> p_score_away
  then
    raise exception 'GOALS_MISMATCH';
  end if;

  if exists (
    select 1 from json_array_elements(v_events) e
    group by e->>'player_id'
    having count(*) filter (where e->>'type' = 'yellow_card') > 2
        or count(*) filter (where e->>'type' = 'red_card') > 1
  ) then
    raise exception 'INVALID_CARDS';
  end if;

  if p_suspended_minute is not null and (p_suspended_minute < 1 or p_suspended_minute > 200) then
    raise exception 'INVALID_MINUTE';
  end if;

  update matches
    set score_home = p_score_home,
        score_away = p_score_away,
        status = case when p_suspended_minute is not null then 'suspended' else 'played' end,
        walkover = null,
        -- Si estaba marcado como suspendido y ya no, fue una corrección: se limpia.
        -- En una reanudación (programado con minuto) se conserva como dato del partido.
        suspended_minute = case
          when p_suspended_minute is not null then p_suspended_minute
          when v_match.status = 'suspended' then null
          else v_match.suspended_minute end,
        suspension_reason = case
          when p_suspended_minute is not null then left(p_suspension_reason, 200)
          when v_match.status = 'suspended' then null
          else v_match.suspension_reason end,
        referee_notes = left(p_referee_notes, 2000)
  where id = v_match.id;

  delete from match_events where match_id = v_match.id;

  insert into match_events (match_id, player_id, team_id, type, minute)
  select v_match.id,
         (e->>'player_id')::uuid,
         (e->>'team_id')::uuid,
         (e->>'type')::match_event_type,
         nullif(e->>'minute', '')::int
  from json_array_elements(v_events) e;

  if p_attendance is not null then
    delete from match_attendance where match_id = v_match.id;
    insert into match_attendance (match_id, player_id, team_id, tournament_id)
    select v_match.id, p.id, p.team_id, v_match.tournament_id
    from players p
    where p.id in (select a.value::uuid from json_array_elements_text(p_attendance) a);
  end if;

  insert into match_attendance (match_id, player_id, team_id, tournament_id)
  select distinct v_match.id, (e->>'player_id')::uuid, (e->>'team_id')::uuid, v_match.tournament_id
  from json_array_elements(v_events) e
  on conflict do nothing;
end;
$function$;

-- 5) Limpieza menor
-- La función que crea el perfil al registrarse no tenía search_path fijo
alter function public.handle_new_user() set search_path = public;
-- Nadie fuera del dueño de la base necesita vaciar tablas completas
revoke truncate on all tables in schema public from anon, authenticated;
