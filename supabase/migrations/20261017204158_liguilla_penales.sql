-- ============================================================================
-- Liguilla · penales
-- La cédula (panel del admin y link del árbitro) captura los penales del
-- partido que define una eliminatoria cuando el torneo desempata por penales.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_match_by_token(p_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result json;
begin
  select json_build_object(
    'id', m.id,
    'match_date', m.match_date,
    'start_time', m.start_time,
    'status', m.status,
    'score_home', m.score_home,
    'score_away', m.score_away,
    'referee_notes', m.referee_notes,
    'validated', m.validated_at is not null,
    'walkover', m.walkover,
    'suspended_minute', m.suspended_minute,
    'suspension_reason', m.suspension_reason,
    'venue_name', v.name,
    'tournament_name', t.name,
    'tournament_paused', t.disabled_at is not null,
    'penalties_home', m.penalties_home,
    'penalties_away', m.penalties_away,
    -- Liguilla: ronda, partido (ida/vuelta), regla de desempate y marcador de la ida
    'playoff', case when m.playoff_tie_id is null then null else (
      select json_build_object(
        'stage', pt.stage, 'leg', m.leg, 'legs', pt.legs, 'tiebreak', t.playoff_tiebreak,
        'first_leg', (
          select json_build_object('home_team_id', f.home_team_id, 'score_home', f.score_home, 'score_away', f.score_away)
          from matches f where f.playoff_tie_id = m.playoff_tie_id and f.leg = 1 and f.id <> m.id
        )
      )
      from playoff_ties pt where pt.id = m.playoff_tie_id
    ) end,
    'home_team', json_build_object(
      'id', ht.id, 'name', ht.name, 'logo_url', ht.logo_url,
      'players', (select coalesce(json_agg(json_build_object('id', p.id, 'full_name', p.full_name, 'jersey_number', p.jersey_number) order by p.jersey_number), '[]'::json)
                  from players p where p.team_id = ht.id)
    ),
    'away_team', json_build_object(
      'id', at.id, 'name', at.name, 'logo_url', at.logo_url,
      'players', (select coalesce(json_agg(json_build_object('id', p.id, 'full_name', p.full_name, 'jersey_number', p.jersey_number) order by p.jersey_number), '[]'::json)
                  from players p where p.team_id = at.id)
    ),
    'events', (select coalesce(json_agg(json_build_object('id', e.id, 'player_id', e.player_id, 'team_id', e.team_id, 'type', e.type, 'minute', e.minute)), '[]'::json)
               from match_events e where e.match_id = m.id),
    'attendance', (select coalesce(json_agg(a.player_id), '[]'::json)
                   from match_attendance a where a.match_id = m.id)
  ) into result
  from match_tokens mt
  join matches m on m.id = mt.match_id
  join teams ht on ht.id = m.home_team_id
  join teams at on at.id = m.away_team_id
  left join venues v on v.id = m.venue_id
  join tournaments t on t.id = m.tournament_id
  where mt.token = p_token;

  return result;
end;
$function$
;

-- Nueva firma (con penales): se borra la anterior para no dejar dos versiones
drop function if exists public.submit_match_report(text, integer, integer, json, text, json, integer, text);

CREATE OR REPLACE FUNCTION public.submit_match_report(p_token text, p_score_home integer, p_score_away integer, p_events json, p_referee_notes text DEFAULT NULL::text, p_attendance json DEFAULT NULL::json, p_suspended_minute integer DEFAULT NULL::integer, p_suspension_reason text DEFAULT NULL::text, p_penalties_home integer DEFAULT NULL::integer, p_penalties_away integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_match matches%rowtype;
  v_events json := coalesce(p_events, '[]'::json);
  v_legs integer;
  v_tiebreak text;
begin
  select m.* into v_match
  from match_tokens mt join matches m on m.id = mt.match_id
  where mt.token = p_token;

  if v_match.id is null then raise exception 'Partido no encontrado'; end if;
  if tournament_paused(v_match.tournament_id) then raise exception 'TOURNAMENT_PAUSED'; end if;
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

  -- Penales: solo en el partido que define una eliminatoria con desempate por penales
  if p_penalties_home is not null or p_penalties_away is not null then
    select pt.legs, t.playoff_tiebreak into v_legs, v_tiebreak
    from playoff_ties pt join tournaments t on t.id = pt.tournament_id
    where pt.id = v_match.playoff_tie_id;
    if v_legs is null or v_tiebreak <> 'penalties' or (v_legs = 2 and coalesce(v_match.leg, 1) <> 2)
       or p_penalties_home is null or p_penalties_away is null
       or p_penalties_home not between 0 and 50 or p_penalties_away not between 0 and 50
       or p_penalties_home = p_penalties_away then
      raise exception 'INVALID_PENALTIES';
    end if;
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
        referee_notes = left(p_referee_notes, 2000),
        penalties_home = p_penalties_home,
        penalties_away = p_penalties_away
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
$function$
;

revoke all on function public.submit_match_report(text, integer, integer, json, text, json, integer, text, integer, integer) from public;
grant execute on function public.submit_match_report(text, integer, integer, json, text, json, integer, text, integer, integer) to anon, authenticated;
