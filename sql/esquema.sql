-- ============================================================================
-- Estructura completa de Torneapp (sin datos), generada desde producción el 2026-10-11
-- con sql/exportar-esquema.sql. Correr en un proyecto de Supabase NUEVO y vacío.
-- ============================================================================

begin;

-- Configuración
set check_function_bodies = off;

-- Tipos
create type public.match_event_type as enum ('goal', 'yellow_card', 'red_card');
create type public.user_role as enum ('admin', 'delegate');

-- Funciones
CREATE OR REPLACE FUNCTION public.apply_fixture_update(p_tournament_id uuid, p_first_number integer, p_plan json)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_md record;
  v_m json;
  v_md_id uuid;
  v_id uuid;
  v_keep uuid[] := '{}';
begin
  if not is_tournament_admin(p_tournament_id) then raise exception 'NOT_ADMIN'; end if;

  if exists (
    select 1 from matches m join matchdays md on md.id = m.matchday_id
    where md.tournament_id = p_tournament_id and md.number >= p_first_number and m.status = 'played'
  ) then
    raise exception 'STALE_PLAN';
  end if;

  perform set_config('torneapp.change_source', 'Actualizar fixture', true);

  for v_md in select * from json_to_recordset(p_plan->'matchdays') as x(number int, week_start date) loop
    update matchdays set week_start = v_md.week_start
    where tournament_id = p_tournament_id and number = v_md.number;
    if not found then
      insert into matchdays (tournament_id, number, week_start)
      values (p_tournament_id, v_md.number, v_md.week_start);
    end if;
  end loop;

  for v_m in select * from json_array_elements(p_plan->'matches') loop
    v_md_id := null;
    v_id := null;
    select id into v_md_id from matchdays
    where tournament_id = p_tournament_id and number = (v_m->>'matchday_number')::int;
    if v_md_id is null then raise exception 'STALE_PLAN'; end if;

    if v_m->>'reuse_id' is not null then
      update matches set
        matchday_id = v_md_id,
        home_team_id = (v_m->>'home_team_id')::uuid,
        away_team_id = (v_m->>'away_team_id')::uuid,
        venue_id = (v_m->>'venue_id')::uuid,
        match_date = (v_m->>'match_date')::date,
        start_time = (v_m->>'start_time')::time,
        end_time = (v_m->>'end_time')::time,
        status = 'scheduled',
        postponed_from = null,
        postpone_reason = null,
        original_matchday_id = null, original_match_date = null, original_start_time = null,
        original_end_time = null, original_venue_id = null
      where id = (v_m->>'reuse_id')::uuid
        and tournament_id = p_tournament_id
        and status = 'scheduled'
        and not (id = any(v_keep))
        and matchday_id in (select id from matchdays where tournament_id = p_tournament_id and number >= p_first_number)
      returning id into v_id;
      if v_id is null then raise exception 'STALE_PLAN'; end if;
    else
      insert into matches (tournament_id, matchday_id, home_team_id, away_team_id, venue_id, match_date, start_time, end_time)
      values (
        p_tournament_id, v_md_id,
        (v_m->>'home_team_id')::uuid, (v_m->>'away_team_id')::uuid, (v_m->>'venue_id')::uuid,
        (v_m->>'match_date')::date, (v_m->>'start_time')::time, (v_m->>'end_time')::time
      )
      returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
  end loop;

  for v_m in select * from json_array_elements(p_plan->'pending') loop
    v_id := null;
    if v_m->>'reuse_id' is not null then
      update matches set
        status = 'pending',
        home_team_id = (v_m->>'home_team_id')::uuid,
        away_team_id = (v_m->>'away_team_id')::uuid,
        matchday_id = null, match_date = null, start_time = null, end_time = null, venue_id = null,
        postponed_from = null,
        postpone_reason = null,
        original_matchday_id = null, original_match_date = null, original_start_time = null,
        original_end_time = null, original_venue_id = null
      where id = (v_m->>'reuse_id')::uuid
        and tournament_id = p_tournament_id
        and status = 'scheduled'
        and not (id = any(v_keep))
        and matchday_id in (select id from matchdays where tournament_id = p_tournament_id and number >= p_first_number)
      returning id into v_id;
      if v_id is null then raise exception 'STALE_PLAN'; end if;
    else
      insert into matches (tournament_id, home_team_id, away_team_id, status)
      values (p_tournament_id, (v_m->>'home_team_id')::uuid, (v_m->>'away_team_id')::uuid, 'pending')
      returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
  end loop;

  delete from matches
  where tournament_id = p_tournament_id
    and status = 'scheduled'
    and not (id = any(v_keep))
    and matchday_id in (select id from matchdays where tournament_id = p_tournament_id and number >= p_first_number);

  delete from matchdays
  where tournament_id = p_tournament_id
    and number >= p_first_number
    and number not in (select x.number from json_to_recordset(p_plan->'matchdays') as x(number int));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.can_manage_storage_object(p_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  parts text[] := storage.foldername(p_name);
begin
  if parts[1] = 'players' then
    return public.is_tournament_admin(parts[2]::uuid)
        or (array_length(parts, 1) >= 3 and parts[3]::uuid in (select public.my_active_delegate_team_ids()));
  end if;
  return public.is_tournament_admin(parts[1]::uuid);
exception when others then
  return false;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_team_delegate(p_token text, p_user_id uuid, p_delegate_name text DEFAULT NULL::text, p_delegate_email text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_team_id uuid;
  v_tournament_id uuid;
  v_current_delegate uuid;
begin
  select tm.id, tm.tournament_id, tm.delegate_id into v_team_id, v_tournament_id, v_current_delegate
  from team_private tp join teams tm on tm.id = tp.team_id
  where tp.invite_token = p_token;

  if v_team_id is null then raise exception 'INVALID_LINK'; end if;
  if v_current_delegate is not null and v_current_delegate <> p_user_id then
    raise exception 'ALREADY_CLAIMED';
  end if;

  if not exists (
    select 1 from auth.users u
    where u.id = p_user_id
      and lower(u.email) = lower(p_delegate_email)
      and u.created_at > now() - interval '10 minutes'
  ) then
    raise exception 'INVALID_ACCOUNT';
  end if;

  if exists (select 1 from tournaments where admin_id = p_user_id) then
    raise exception 'ADMIN_ACCOUNT';
  end if;
  if exists (
    select 1 from teams
    where delegate_id = p_user_id and tournament_id = v_tournament_id and id <> v_team_id
  ) then
    raise exception 'ALREADY_DELEGATE';
  end if;
  if exists (
    select 1 from team_private
    where tournament_id = v_tournament_id and team_id <> v_team_id
      and lower(delegate_email) = lower(p_delegate_email)
  ) then
    raise exception 'EMAIL_IN_USE';
  end if;

  insert into profiles (id, email, role)
  values (p_user_id, p_delegate_email, 'delegate')
  on conflict (id) do update set role = 'delegate';

  update teams set delegate_id = p_user_id where id = v_team_id;
  update team_private
    set delegate_name = coalesce(p_delegate_name, delegate_name),
        delegate_email = lower(p_delegate_email)
  where team_id = v_team_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.claim_team_delegate_self(p_token text, p_delegate_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_team_id uuid;
  v_tournament_id uuid;
  v_current_delegate uuid;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select tm.id, tm.tournament_id, tm.delegate_id into v_team_id, v_tournament_id, v_current_delegate
  from team_private tp join teams tm on tm.id = tp.team_id
  where tp.invite_token = p_token;

  if v_team_id is null then raise exception 'INVALID_LINK'; end if;
  if v_current_delegate is not null and v_current_delegate <> v_uid then
    raise exception 'ALREADY_CLAIMED';
  end if;
  if exists (select 1 from tournaments where admin_id = v_uid) then
    raise exception 'ADMIN_ACCOUNT';
  end if;
  if exists (
    select 1 from teams
    where delegate_id = v_uid and tournament_id = v_tournament_id and id <> v_team_id
  ) then
    raise exception 'ALREADY_DELEGATE';
  end if;

  select email into v_email from auth.users where id = v_uid;

  if exists (
    select 1 from team_private
    where tournament_id = v_tournament_id and team_id <> v_team_id
      and lower(delegate_email) = lower(v_email)
  ) then
    raise exception 'EMAIL_IN_USE';
  end if;

  insert into profiles (id, email, role)
  values (v_uid, v_email, 'delegate')
  on conflict (id) do update set role = 'delegate';

  update teams set delegate_id = v_uid where id = v_team_id;
  update team_private
    set delegate_name = coalesce(p_delegate_name, delegate_name),
        delegate_email = lower(v_email)
  where team_id = v_team_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.close_venue_day(p_tournament_id uuid, p_venue_id uuid, p_date date, p_reason text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_count int;
begin
  if not is_tournament_admin(p_tournament_id) then raise exception 'NOT_ADMIN'; end if;
  if not exists (select 1 from venues where id = p_venue_id and tournament_id = p_tournament_id) then
    raise exception 'NOT_FOUND';
  end if;

  insert into venue_closures (tournament_id, venue_id, closed_on, reason)
  values (p_tournament_id, p_venue_id, p_date, nullif(trim(p_reason), ''))
  on conflict (venue_id, closed_on) do update set reason = excluded.reason;

  perform set_config('torneapp.change_source',
    'Cancha cerrada' || coalesce(': ' || nullif(trim(p_reason), ''), ''), true);

  update matches m set
    status = 'pending',
    postponed_from = (select number from matchdays where id = m.matchday_id),
    postpone_reason = 'Cancha cerrada' || coalesce(': ' || nullif(trim(p_reason), ''), ''),
    original_matchday_id = m.matchday_id,
    original_match_date = m.match_date,
    original_start_time = m.start_time,
    original_end_time = m.end_time,
    original_venue_id = m.venue_id,
    matchday_id = null, match_date = null, start_time = null, end_time = null, venue_id = null
  where m.tournament_id = p_tournament_id
    and m.venue_id = p_venue_id
    and m.match_date = p_date
    and m.status = 'scheduled';

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_match_token()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into match_tokens (match_id, tournament_id) values (new.id, new.tournament_id);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_team_private()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into team_private (team_id, tournament_id) values (new.id, new.tournament_id);
  return new;
end;
$function$
;

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
  from teams where id = p_team_id and delegate_id = auth.uid() and not access_blocked;
  if v_tournament is null then return '[]'::json; end if;

  v_locked := exists (select 1 from team_charges where team_id = p_team_id and not paid);

  select coalesce(json_agg(md_json order by md_number), '[]'::json) into result
  from (
    select md.number as md_number, json_build_object(
      'id', md.id,
      'number', md.number,
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

CREATE OR REPLACE FUNCTION public.get_delegate_pending(p_team_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tournament uuid;
  result json;
begin
  select tournament_id into v_tournament
  from teams where id = p_team_id and delegate_id = auth.uid() and not access_blocked;
  if v_tournament is null then return '[]'::json; end if;

  select coalesce(json_agg(json_build_object(
    'id', m.id,
    'home_team_id', m.home_team_id,
    'away_team_id', m.away_team_id,
    'postponed_from', m.postponed_from,
    'home_team', json_build_object('name', ht.name),
    'away_team', json_build_object('name', at.name)
  ) order by m.postponed_from nulls last), '[]'::json) into result
  from matches m
  join teams ht on ht.id = m.home_team_id
  join teams at on at.id = m.away_team_id
  where m.tournament_id = v_tournament and m.status = 'pending';

  return result;
end;
$function$
;

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
    )
  ) then
    return null;
  end if;

  return json_build_object(
    'is_admin', v_is_admin,
    'tournament', (select json_build_object('name', name, 'logo_url', logo_url, 'rol_template', rol_template) from tournaments where id = v_md.tournament_id),
    'matchday', json_build_object('number', v_md.number, 'week_start', v_md.week_start, 'image_note', v_md.image_note, 'rol_template', v_md.rol_template),
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

CREATE OR REPLACE FUNCTION public.get_team_invite_info(p_token text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  result json;
begin
  select json_build_object(
    'team_name', tm.name,
    'tournament_name', t.name,
    'tournament_id', t.id,
    'team_id', tm.id,
    'already_claimed', tm.delegate_id is not null,
    'delegate_name', tp.delegate_name,
    'delegate_email', tp.delegate_email
  )
  into result
  from team_private tp
  join teams tm on tm.id = tp.team_id
  join tournaments t on t.id = tm.tournament_id
  where tp.invite_token = p_token;

  return result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_tournament_template(p_tournament_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_choice text;
begin
  if not (
    is_tournament_admin(p_tournament_id)
    or exists (
      select 1 from teams
      where tournament_id = p_tournament_id and delegate_id = auth.uid() and not access_blocked
    )
  ) then
    return null;
  end if;

  select rol_template into v_choice from tournaments where id = p_tournament_id;

  return json_build_object(
    'rol_template', coalesce(v_choice, 'auto'),
    'custom_image_url', case
      when v_choice like 'custom:%' then
        (select image_url from rol_templates
         where tournament_id = p_tournament_id and id::text = substring(v_choice from 8))
      else null end
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_tournament_admin(p_tournament_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from tournaments t
    where t.id = p_tournament_id
    and t.admin_id = auth.uid()
  )
$function$
;

CREATE OR REPLACE FUNCTION public.log_match_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_kind text;
  v_source text;
begin
  -- Solo cambios de calendario (capturar o reabrir una cédula no cuenta)
  if (old.match_date, old.start_time, old.venue_id, old.matchday_id, old.home_team_id, old.away_team_id)
       is not distinct from
     (new.match_date, new.start_time, new.venue_id, new.matchday_id, new.home_team_id, new.away_team_id)
     and not (old.status is distinct from new.status and 'pending' in (old.status, new.status))
  then
    return new;
  end if;

  v_kind := case
    when new.status = 'pending' and old.status <> 'pending' then 'postponed'
    when old.status = 'pending' and new.status <> 'pending' then 'scheduled'
    else 'moved'
  end;

  v_source := nullif(current_setting('torneapp.change_source', true), '');
  if v_source is null and v_kind = 'postponed' then v_source := new.postpone_reason; end if;

  insert into match_changes (tournament_id, match_id, home_team_id, away_team_id, kind, source, old, new)
  values (
    new.tournament_id, new.id, new.home_team_id, new.away_team_id, v_kind, v_source,
    jsonb_build_object(
      'date', old.match_date, 'time', old.start_time, 'status', old.status,
      'venue', (select name from venues where id = old.venue_id),
      'matchday', (select number from matchdays where id = old.matchday_id)
    ),
    jsonb_build_object(
      'date', new.match_date, 'time', new.start_time, 'status', new.status,
      'venue', (select name from venues where id = new.venue_id),
      'matchday', (select number from matchdays where id = new.matchday_id)
    )
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_team_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update notifications set read_at = now()
  where team_id = p_team_id
    and read_at is null
    and exists (select 1 from teams where id = p_team_id and delegate_id = auth.uid());
end;
$function$
;

CREATE OR REPLACE FUNCTION public.my_active_delegate_team_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from teams where delegate_id = auth.uid() and not access_blocked
$function$
;

CREATE OR REPLACE FUNCTION public.my_blocked_tournament_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select tournament_id from teams where delegate_id = auth.uid() and access_blocked
$function$
;

CREATE OR REPLACE FUNCTION public.my_delegate_team_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from teams where delegate_id = auth.uid()
$function$
;

CREATE OR REPLACE FUNCTION public.my_delegate_tournament_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select tournament_id from teams where delegate_id = auth.uid()
$function$
;

CREATE OR REPLACE FUNCTION public.my_locked_tournament_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select distinct t.tournament_id
  from teams t
  where t.delegate_id = auth.uid()
    and (
      t.access_blocked
      or exists (select 1 from team_charges c where c.team_id = t.id and not c.paid)
    )
$function$
;

CREATE OR REPLACE FUNCTION public.notify_match_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_team uuid;
  v_existing uuid;
begin
  foreach v_team in array array_remove(array[new.home_team_id, new.away_team_id], null) loop
    v_existing := null;
    if new.source is not null then
      select id into v_existing from notifications
      where team_id = v_team and created_at = new.changed_at and source = new.source
      limit 1;
    end if;

    if v_existing is not null then
      update notifications set batch_count = batch_count + 1 where id = v_existing;
    else
      insert into notifications (tournament_id, team_id, match_id, home_team_id, away_team_id, kind, source, old, new, created_at)
      values (new.tournament_id, v_team, new.match_id, new.home_team_id, new.away_team_id, new.kind, new.source, new.old, new.new, new.changed_at);
    end if;
  end loop;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_rules_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_old jsonb;
  v_new jsonb;
begin
  v_old := jsonb_build_object(
    'rules', old.rules, 'yellow', old.yellow_card_suspension_threshold, 'red', old.red_card_suspension_matches,
    'wo_goals', old.walkover_goals, 'double_wo', old.double_walkover_rule, 'deadline', old.player_registration_deadline
  );
  v_new := jsonb_build_object(
    'rules', new.rules, 'yellow', new.yellow_card_suspension_threshold, 'red', new.red_card_suspension_matches,
    'wo_goals', new.walkover_goals, 'double_wo', new.double_walkover_rule, 'deadline', new.player_registration_deadline
  );

  -- Espacios al final de los renglones no cuentan como cambio
  if v_old = v_new
     or (regexp_replace(coalesce(old.rules, ''), '\s+$', '', 'gm') = regexp_replace(coalesce(new.rules, ''), '\s+$', '', 'gm')
         and v_old - 'rules' = v_new - 'rules') then
    return new;
  end if;

  insert into notifications (tournament_id, team_id, kind, source, old, new)
  select new.id, t.id, 'rules', 'Reglamento', v_old, v_new
  from teams t
  where t.tournament_id = new.id;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.registration_open_for_team(p_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((
    select t.player_registration_deadline >= (now() at time zone 'America/Mexico_City')::date
    from teams tm join tournaments t on t.id = tm.tournament_id
    where tm.id = p_team_id
  ), true)
$function$
;

CREATE OR REPLACE FUNCTION public.shift_matchdays(p_tournament_id uuid, p_from_number integer, p_weeks integer, p_cascade boolean)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_ids uuid[];
begin
  if not is_tournament_admin(p_tournament_id) then raise exception 'NOT_ADMIN'; end if;
  if p_weeks = 0 or abs(p_weeks) > 8 then raise exception 'INVALID_WEEKS'; end if;

  v_ids := array(
    select id from matchdays
    where tournament_id = p_tournament_id
      and (number = p_from_number or (p_cascade and number >= p_from_number))
  );

  if exists (select 1 from matches where matchday_id = any(v_ids) and status = 'played') then
    raise exception 'HAS_PLAYED';
  end if;

  perform set_config(
    'torneapp.change_source',
    case when p_cascade then 'Jornadas ' || p_from_number || ' en adelante recorridas' else 'Jornada ' || p_from_number || ' recorrida' end,
    true
  );

  update matches set match_date = match_date + 7 * p_weeks
  where matchday_id = any(v_ids) and status = 'scheduled';
  update matchdays set week_start = week_start + 7 * p_weeks
  where id = any(v_ids);

  if exists (
    select 1 from matches x join matches y
      on x.id <> y.id and x.venue_id = y.venue_id and x.match_date = y.match_date and x.start_time = y.start_time
    where x.matchday_id = any(v_ids) and x.status <> 'pending'
      and y.tournament_id = p_tournament_id and y.status <> 'pending'
  ) then
    raise exception 'SLOT_CLASH';
  end if;

  if exists (
    select 1 from matches m join venue_closures c on c.venue_id = m.venue_id and c.closed_on = m.match_date
    where m.matchday_id = any(v_ids) and m.status = 'scheduled'
  ) then
    raise exception 'VENUE_CLOSED';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_match_report(p_token text, p_score_home integer, p_score_away integer, p_events json, p_referee_notes text DEFAULT NULL::text, p_attendance json DEFAULT NULL::json, p_suspended_minute integer DEFAULT NULL::integer, p_suspension_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.submit_walkover(p_token text, p_absent text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_match matches%rowtype;
  v_goals int;
begin
  select m.* into v_match
  from match_tokens mt join matches m on m.id = mt.match_id
  where mt.token = p_token;

  if v_match.id is null then raise exception 'Partido no encontrado'; end if;
  if v_match.status = 'pending' then raise exception 'MATCH_PENDING'; end if;
  if v_match.validated_at is not null then raise exception 'MATCH_VALIDATED'; end if;
  if p_absent not in ('home', 'away', 'both') then raise exception 'INVALID_ABSENT'; end if;

  select walkover_goals into v_goals from tournaments where id = v_match.tournament_id;

  delete from match_events where match_id = v_match.id;
  delete from match_attendance where match_id = v_match.id;

  update matches set
    status = 'played',
    walkover = p_absent,
    score_home = case p_absent when 'home' then 0 when 'away' then v_goals else 0 end,
    score_away = case p_absent when 'home' then v_goals when 'away' then 0 else 0 end
  where id = v_match.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.swap_matches(p_match_a uuid, p_match_b uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  a matches%rowtype;
  b matches%rowtype;
begin
  select * into a from matches where id = p_match_a for update;
  select * into b from matches where id = p_match_b for update;
  if a.id is null or b.id is null or a.tournament_id <> b.tournament_id then raise exception 'NOT_FOUND'; end if;
  if not is_tournament_admin(a.tournament_id) then raise exception 'NOT_ADMIN'; end if;
  if a.status <> 'scheduled' or b.status <> 'scheduled' then raise exception 'NOT_SCHEDULED'; end if;

  perform set_config('torneapp.change_source', 'Intercambio', true);

  update matches set matchday_id = b.matchday_id, match_date = b.match_date, start_time = b.start_time,
    end_time = b.end_time, venue_id = b.venue_id
  where id = a.id;
  update matches set matchday_id = a.matchday_id, match_date = a.match_date, start_time = a.start_time,
    end_time = a.end_time, venue_id = a.venue_id
  where id = b.id;
end;
$function$
;


-- Tablas
create table public.match_attendance (match_id uuid not null, player_id uuid not null, team_id uuid not null, tournament_id uuid not null);
create table public.match_changes (id uuid default gen_random_uuid() not null, tournament_id uuid not null, match_id uuid, home_team_id uuid, away_team_id uuid, kind text not null, source text, old jsonb, new jsonb, changed_by uuid default auth.uid(), changed_at timestamp with time zone default now() not null);
create table public.match_events (id uuid default gen_random_uuid() not null, match_id uuid not null, player_id uuid not null, team_id uuid not null, type match_event_type not null, minute integer, created_at timestamp with time zone default now());
create table public.match_tokens (match_id uuid not null, tournament_id uuid not null, token text default replace((gen_random_uuid())::text, '-'::text, ''::text) not null);
create table public.matchdays (id uuid default gen_random_uuid() not null, tournament_id uuid not null, number integer not null, week_start date not null, created_at timestamp with time zone default now(), image_note text, rol_template text);
create table public.matches (id uuid default gen_random_uuid() not null, tournament_id uuid not null, matchday_id uuid, home_team_id uuid not null, away_team_id uuid not null, venue_id uuid, match_date date, start_time time without time zone, end_time time without time zone, status text default 'scheduled'::text not null, score_home integer, score_away integer, created_at timestamp with time zone default now(), referee_notes text, validated_at timestamp with time zone, validated_by uuid, postponed_from integer, original_matchday_id uuid, original_match_date date, original_start_time time without time zone, original_end_time time without time zone, original_venue_id uuid, postpone_reason text, walkover text, suspended_minute integer, suspension_reason text, administrative_result boolean default false not null);
create table public.notifications (id uuid default gen_random_uuid() not null, tournament_id uuid not null, team_id uuid not null, match_id uuid, home_team_id uuid, away_team_id uuid, kind text not null, source text, old jsonb, new jsonb, batch_count integer default 1 not null, created_at timestamp with time zone default now() not null, read_at timestamp with time zone);
create table public.players (id uuid default gen_random_uuid() not null, team_id uuid not null, full_name text not null, photo_url text, jersey_number integer, "position" text, created_at timestamp with time zone default now(), birth_date date, curp text, tournament_id uuid);
create table public.profiles (id uuid not null, email text not null, full_name text, role user_role default 'admin'::user_role not null, created_at timestamp with time zone default now());
create table public.rol_templates (id uuid default gen_random_uuid() not null, tournament_id uuid not null, name text not null, image_url text not null, created_at timestamp with time zone default now() not null);
create table public.team_charges (id uuid default gen_random_uuid() not null, tournament_id uuid not null, team_id uuid not null, concept text not null, description text, amount numeric(10,2) default 0 not null, paid boolean default false not null, paid_at timestamp with time zone, created_at timestamp with time zone default now());
create table public.team_private (team_id uuid not null, tournament_id uuid not null, invite_token text default replace((gen_random_uuid())::text, '-'::text, ''::text) not null, delegate_name text, delegate_email text);
create table public.teams (id uuid default gen_random_uuid() not null, tournament_id uuid not null, name text not null, logo_url text, has_scheduling_priority boolean default false not null, created_at timestamp with time zone default now(), preferred_slot_id uuid, delegate_id uuid, access_blocked boolean default false not null);
create table public.tournaments (id uuid default gen_random_uuid() not null, admin_id uuid not null, name text not null, sport_type text default 'futbol_11'::text not null, rules text, start_date date, end_date date, status text default 'draft'::text not null, created_at timestamp with time zone default now(), allow_schedule_priority boolean default true not null, double_round boolean default false not null, yellow_card_suspension_threshold integer, red_card_suspension_matches integer default 1 not null, min_matches_required integer, walkover_goals integer default 3 not null, double_walkover_rule text default 'both_lose'::text not null, logo_url text, rol_template text default 'auto'::text not null, player_registration_deadline date);
create table public.venue_closures (id uuid default gen_random_uuid() not null, tournament_id uuid not null, venue_id uuid not null, closed_on date not null, reason text, created_at timestamp with time zone default now() not null);
create table public.venue_slots (id uuid default gen_random_uuid() not null, venue_id uuid not null, day_of_week integer not null, start_time time without time zone not null, end_time time without time zone not null, created_at timestamp with time zone default now());
create table public.venue_template_slots (id uuid default gen_random_uuid() not null, template_id uuid not null, day_of_week integer not null, start_time time without time zone not null, end_time time without time zone not null);
create table public.venue_templates (id uuid default gen_random_uuid() not null, admin_id uuid not null, name text not null, location text, created_at timestamp with time zone default now());
create table public.venues (id uuid default gen_random_uuid() not null, tournament_id uuid not null, name text not null, location text, created_at timestamp with time zone default now());

-- Llaves primarias, únicas y checks
alter table public.match_attendance add constraint match_attendance_pkey PRIMARY KEY (match_id, player_id);
alter table public.match_changes add constraint match_changes_pkey PRIMARY KEY (id);
alter table public.match_events add constraint match_events_pkey PRIMARY KEY (id);
alter table public.match_tokens add constraint match_tokens_pkey PRIMARY KEY (match_id);
alter table public.match_tokens add constraint match_tokens_token_key UNIQUE (token);
alter table public.matchdays add constraint matchdays_image_note_check CHECK (((image_note IS NULL) OR (char_length(image_note) <= 200)));
alter table public.matchdays add constraint matchdays_pkey PRIMARY KEY (id);
alter table public.matches add constraint matches_pending_shape CHECK ((((status = 'pending'::text) AND (match_date IS NULL) AND (matchday_id IS NULL)) OR ((status <> 'pending'::text) AND (match_date IS NOT NULL) AND (start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (venue_id IS NOT NULL))));
alter table public.matches add constraint matches_pkey PRIMARY KEY (id);
alter table public.matches add constraint matches_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'played'::text, 'pending'::text, 'suspended'::text])));
alter table public.matches add constraint matches_walkover_check CHECK ((walkover = ANY (ARRAY['home'::text, 'away'::text, 'both'::text])));
alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table public.players add constraint players_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.rol_templates add constraint rol_templates_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 60)));
alter table public.rol_templates add constraint rol_templates_pkey PRIMARY KEY (id);
alter table public.team_charges add constraint team_charges_amount_check CHECK ((amount >= (0)::numeric));
alter table public.team_charges add constraint team_charges_concept_check CHECK ((concept = ANY (ARRAY['arbitraje'::text, 'inscripcion'::text, 'horario'::text, 'multa'::text, 'otro'::text])));
alter table public.team_charges add constraint team_charges_pkey PRIMARY KEY (id);
alter table public.team_private add constraint team_private_invite_token_key UNIQUE (invite_token);
alter table public.team_private add constraint team_private_pkey PRIMARY KEY (team_id);
alter table public.teams add constraint teams_id_tournament_key UNIQUE (id, tournament_id);
alter table public.teams add constraint teams_pkey PRIMARY KEY (id);
alter table public.tournaments add constraint tournaments_double_walkover_rule_check CHECK ((double_walkover_rule = ANY (ARRAY['both_lose'::text, 'draw'::text])));
alter table public.tournaments add constraint tournaments_min_matches_required_check CHECK ((min_matches_required > 0));
alter table public.tournaments add constraint tournaments_pkey PRIMARY KEY (id);
alter table public.tournaments add constraint tournaments_walkover_goals_check CHECK (((walkover_goals >= 1) AND (walkover_goals <= 20)));
alter table public.venue_closures add constraint venue_closures_pkey PRIMARY KEY (id);
alter table public.venue_closures add constraint venue_closures_venue_id_closed_on_key UNIQUE (venue_id, closed_on);
alter table public.venue_slots add constraint venue_slots_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
alter table public.venue_slots add constraint venue_slots_pkey PRIMARY KEY (id);
alter table public.venue_template_slots add constraint venue_template_slots_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)));
alter table public.venue_template_slots add constraint venue_template_slots_pkey PRIMARY KEY (id);
alter table public.venue_templates add constraint venue_templates_pkey PRIMARY KEY (id);
alter table public.venues add constraint venues_pkey PRIMARY KEY (id);

-- Llaves foráneas
alter table public.match_attendance add constraint match_attendance_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.match_attendance add constraint match_attendance_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
alter table public.match_attendance add constraint match_attendance_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
alter table public.match_attendance add constraint match_attendance_team_same_tournament FOREIGN KEY (team_id, tournament_id) REFERENCES teams(id, tournament_id);
alter table public.match_attendance add constraint match_attendance_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.match_changes add constraint match_changes_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE SET NULL;
alter table public.match_changes add constraint match_changes_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE SET NULL;
alter table public.match_changes add constraint match_changes_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL;
alter table public.match_changes add constraint match_changes_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.match_events add constraint match_events_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.match_events add constraint match_events_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
alter table public.match_events add constraint match_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
alter table public.match_tokens add constraint match_tokens_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table public.match_tokens add constraint match_tokens_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.matchdays add constraint matchdays_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.matches add constraint matches_away_same_tournament FOREIGN KEY (away_team_id, tournament_id) REFERENCES teams(id, tournament_id);
alter table public.matches add constraint matches_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE;
alter table public.matches add constraint matches_home_same_tournament FOREIGN KEY (home_team_id, tournament_id) REFERENCES teams(id, tournament_id);
alter table public.matches add constraint matches_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE;
alter table public.matches add constraint matches_matchday_id_fkey FOREIGN KEY (matchday_id) REFERENCES matchdays(id) ON DELETE CASCADE;
alter table public.matches add constraint matches_original_matchday_id_fkey FOREIGN KEY (original_matchday_id) REFERENCES matchdays(id) ON DELETE SET NULL;
alter table public.matches add constraint matches_original_venue_id_fkey FOREIGN KEY (original_venue_id) REFERENCES venues(id) ON DELETE SET NULL;
alter table public.matches add constraint matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.matches add constraint matches_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES profiles(id);
alter table public.matches add constraint matches_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id);
alter table public.notifications add constraint notifications_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE SET NULL;
alter table public.notifications add constraint notifications_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE SET NULL;
alter table public.notifications add constraint notifications_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL;
alter table public.notifications add constraint notifications_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
alter table public.notifications add constraint notifications_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.players add constraint players_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
alter table public.players add constraint players_team_same_tournament FOREIGN KEY (team_id, tournament_id) REFERENCES teams(id, tournament_id);
alter table public.players add constraint players_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.rol_templates add constraint rol_templates_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.team_charges add constraint team_charges_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
alter table public.team_charges add constraint team_charges_team_same_tournament FOREIGN KEY (team_id, tournament_id) REFERENCES teams(id, tournament_id);
alter table public.team_charges add constraint team_charges_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.team_private add constraint team_private_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
alter table public.team_private add constraint team_private_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.teams add constraint teams_delegate_id_fkey FOREIGN KEY (delegate_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.teams add constraint teams_preferred_slot_id_fkey FOREIGN KEY (preferred_slot_id) REFERENCES venue_slots(id) ON DELETE SET NULL;
alter table public.teams add constraint teams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.tournaments add constraint tournaments_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.venue_closures add constraint venue_closures_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;
alter table public.venue_closures add constraint venue_closures_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;
alter table public.venue_slots add constraint venue_slots_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;
alter table public.venue_template_slots add constraint venue_template_slots_template_id_fkey FOREIGN KEY (template_id) REFERENCES venue_templates(id) ON DELETE CASCADE;
alter table public.venue_templates add constraint venue_templates_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.venues add constraint venues_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- Índices
CREATE INDEX match_changes_tournament_idx ON public.match_changes USING btree (tournament_id, changed_at DESC);
CREATE INDEX notifications_team_idx ON public.notifications USING btree (team_id, created_at DESC);
CREATE UNIQUE INDEX players_curp_unique_per_tournament ON public.players USING btree (tournament_id, curp) WHERE ((curp IS NOT NULL) AND (curp <> ''::text));
CREATE UNIQUE INDEX team_private_email_per_tournament ON public.team_private USING btree (tournament_id, lower(delegate_email)) WHERE ((delegate_email IS NOT NULL) AND (delegate_email <> ''::text));
CREATE UNIQUE INDEX teams_one_team_per_delegate_per_tournament ON public.teams USING btree (tournament_id, delegate_id) WHERE (delegate_id IS NOT NULL);

-- Triggers
CREATE TRIGGER match_changes_notify AFTER INSERT ON public.match_changes FOR EACH ROW EXECUTE FUNCTION public.notify_match_change();
CREATE TRIGGER matches_log_change AFTER UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.log_match_change();
CREATE TRIGGER on_match_created AFTER INSERT ON public.matches FOR EACH ROW EXECUTE FUNCTION public.create_match_token();
CREATE TRIGGER on_team_created AFTER INSERT ON public.teams FOR EACH ROW EXECUTE FUNCTION public.create_team_private();
CREATE TRIGGER tournaments_rules_notify AFTER UPDATE OF rules, yellow_card_suspension_threshold, red_card_suspension_matches, walkover_goals, double_walkover_rule, player_registration_deadline ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.notify_rules_change();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seguridad por filas (RLS)
alter table public.match_attendance enable row level security;
alter table public.match_changes enable row level security;
alter table public.match_events enable row level security;
alter table public.match_tokens enable row level security;
alter table public.matchdays enable row level security;
alter table public.matches enable row level security;
alter table public.notifications enable row level security;
alter table public.players enable row level security;
alter table public.profiles enable row level security;
alter table public.rol_templates enable row level security;
alter table public.team_charges enable row level security;
alter table public.team_private enable row level security;
alter table public.teams enable row level security;
alter table public.tournaments enable row level security;
alter table public.venue_closures enable row level security;
alter table public.venue_slots enable row level security;
alter table public.venue_template_slots enable row level security;
alter table public.venue_templates enable row level security;
alter table public.venues enable row level security;

-- Políticas
create policy "Admin gestiona asistencia de sus torneos" on public.match_attendance as permissive for all to public using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));
create policy "Delegado ve asistencia de su equipo" on public.match_attendance as permissive for select to public using ((team_id IN ( SELECT my_active_delegate_team_ids() AS my_active_delegate_team_ids)));
create policy "admin lee historial" on public.match_changes as permissive for select to public using (is_tournament_admin(tournament_id));
create policy "Admin gestiona eventos de sus torneos" on public.match_events as permissive for all to public using ((EXISTS ( SELECT 1
   FROM (matches m
     JOIN tournaments t ON ((t.id = m.tournament_id)))
  WHERE ((m.id = match_events.match_id) AND (t.admin_id = auth.uid())))));
create policy "Delegado ve eventos de su torneo" on public.match_events as permissive for select to public using ((EXISTS ( SELECT 1
   FROM matches m
  WHERE ((m.id = match_events.match_id) AND (m.tournament_id IN ( SELECT my_delegate_tournament_ids() AS my_delegate_tournament_ids)) AND (NOT (m.tournament_id IN ( SELECT my_locked_tournament_ids() AS my_locked_tournament_ids)))))));
create policy "Admin ve los links de árbitro de sus partidos" on public.match_tokens as permissive for select to public using (is_tournament_admin(tournament_id));
create policy "Admin gestiona jornadas de sus torneos" on public.matchdays as permissive for all to public using ((EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = matchdays.tournament_id) AND (t.admin_id = auth.uid())))));
create policy "Delegado ve jornadas de su torneo" on public.matchdays as permissive for select to public using (((tournament_id IN ( SELECT my_delegate_tournament_ids() AS my_delegate_tournament_ids)) AND (NOT (tournament_id IN ( SELECT my_blocked_tournament_ids() AS my_blocked_tournament_ids)))));
create policy "Admin gestiona partidos de sus torneos" on public.matches as permissive for all to public using ((EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = matches.tournament_id) AND (t.admin_id = auth.uid())))));
create policy "Delegado ve partidos de su torneo" on public.matches as permissive for select to public using (((tournament_id IN ( SELECT my_delegate_tournament_ids() AS my_delegate_tournament_ids)) AND (NOT (tournament_id IN ( SELECT my_locked_tournament_ids() AS my_locked_tournament_ids)))));
create policy "delegado lee sus avisos" on public.notifications as permissive for select to public using ((team_id IN ( SELECT my_delegate_team_ids() AS my_delegate_team_ids)));
create policy "Admin gestiona jugadores de sus torneos" on public.players as permissive for all to public using ((EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = players.tournament_id) AND (t.admin_id = auth.uid())))));
create policy "Delegado borra jugadores de su equipo" on public.players as permissive for delete to public using (((team_id IN ( SELECT my_active_delegate_team_ids() AS my_active_delegate_team_ids)) AND registration_open_for_team(team_id)));
create policy "Delegado edita jugadores de su equipo" on public.players as permissive for update to public using (((team_id IN ( SELECT my_active_delegate_team_ids() AS my_active_delegate_team_ids)) AND registration_open_for_team(team_id))) with check (((team_id IN ( SELECT my_active_delegate_team_ids() AS my_active_delegate_team_ids)) AND registration_open_for_team(team_id)));
create policy "Delegado registra jugadores dentro del plazo" on public.players as permissive for insert to public with check (((team_id IN ( SELECT my_active_delegate_team_ids() AS my_active_delegate_team_ids)) AND registration_open_for_team(team_id)));
create policy "Delegado ve jugadores de su equipo" on public.players as permissive for select to public using ((team_id IN ( SELECT my_active_delegate_team_ids() AS my_active_delegate_team_ids)));
create policy "Editar mi propio perfil" on public.profiles as permissive for update to public using ((auth.uid() = id));
create policy "Ver mi propio perfil" on public.profiles as permissive for select to public using ((auth.uid() = id));
create policy "admin gestiona plantillas" on public.rol_templates as permissive for all to public using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));
create policy "Admin gestiona cargos de sus torneos" on public.team_charges as permissive for all to public using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));
create policy "Delegado ve los cargos de su equipo" on public.team_charges as permissive for select to public using ((team_id IN ( SELECT my_delegate_team_ids() AS my_delegate_team_ids)));
create policy "Admin gestiona datos privados de sus equipos" on public.team_private as permissive for all to public using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));
create policy "Admin gestiona equipos de sus torneos" on public.teams as permissive for all to public using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));
create policy "Delegado ve equipos de su torneo" on public.teams as permissive for select to public using ((tournament_id IN ( SELECT my_delegate_tournament_ids() AS my_delegate_tournament_ids)));
create policy "Delegado ve su propio equipo" on public.teams as permissive for select to public using ((delegate_id = auth.uid()));
create policy "Admin gestiona sus torneos" on public.tournaments as permissive for all to public using ((auth.uid() = admin_id)) with check ((auth.uid() = admin_id));
create policy "Delegado ve el torneo de su equipo" on public.tournaments as permissive for select to public using ((id IN ( SELECT my_delegate_tournament_ids() AS my_delegate_tournament_ids)));
create policy "admin gestiona cierres" on public.venue_closures as permissive for all to public using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));
create policy "Admin gestiona horarios de sus canchas" on public.venue_slots as permissive for all to public using ((EXISTS ( SELECT 1
   FROM (venues v
     JOIN tournaments t ON ((t.id = v.tournament_id)))
  WHERE ((v.id = venue_slots.venue_id) AND (t.admin_id = auth.uid())))));
create policy "Admin gestiona horarios de canchas guardadas" on public.venue_template_slots as permissive for all to public using ((EXISTS ( SELECT 1
   FROM venue_templates vt
  WHERE ((vt.id = venue_template_slots.template_id) AND (vt.admin_id = auth.uid())))));
create policy "Admin gestiona sus canchas guardadas" on public.venue_templates as permissive for all to public using ((auth.uid() = admin_id)) with check ((auth.uid() = admin_id));
create policy "Admin gestiona canchas de sus torneos" on public.venues as permissive for all to public using ((EXISTS ( SELECT 1
   FROM tournaments t
  WHERE ((t.id = venues.tournament_id) AND (t.admin_id = auth.uid())))));
create policy "Delegado ve canchas de su torneo" on public.venues as permissive for select to public using ((EXISTS ( SELECT 1
   FROM teams tm
  WHERE ((tm.tournament_id = venues.tournament_id) AND (tm.delegate_id = auth.uid())))));
create policy "Actualizar imágenes de mis torneos" on storage.objects as permissive for update to authenticated using (((bucket_id = 'logos'::text) AND can_manage_storage_object(name))) with check (((bucket_id = 'logos'::text) AND can_manage_storage_object(name)));
create policy "Borrar imágenes de mis torneos" on storage.objects as permissive for delete to authenticated using (((bucket_id = 'logos'::text) AND can_manage_storage_object(name)));
create policy "Subir imágenes de mis torneos" on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'logos'::text) AND can_manage_storage_object(name)));
create policy "Ver imágenes de mis torneos" on storage.objects as permissive for select to authenticated using (((bucket_id = 'logos'::text) AND can_manage_storage_object(name)));

-- Permisos de tablas
revoke all on public.match_attendance from anon, authenticated;
grant SELECT, TRIGGER, REFERENCES, DELETE, UPDATE, INSERT on public.match_attendance to authenticated;
grant SELECT, TRIGGER, DELETE, REFERENCES, INSERT, UPDATE on public.match_attendance to anon;
revoke all on public.match_changes from anon, authenticated;
grant DELETE, TRIGGER, UPDATE, REFERENCES, SELECT, INSERT on public.match_changes to anon;
grant SELECT, INSERT, TRIGGER, REFERENCES, DELETE, UPDATE on public.match_changes to authenticated;
revoke all on public.match_events from anon, authenticated;
grant UPDATE, INSERT, SELECT, DELETE, REFERENCES, TRIGGER on public.match_events to anon;
grant TRIGGER, INSERT, SELECT, UPDATE, DELETE, REFERENCES on public.match_events to authenticated;
revoke all on public.match_tokens from anon, authenticated;
grant TRIGGER, REFERENCES, DELETE, UPDATE, SELECT, INSERT on public.match_tokens to anon;
grant INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER on public.match_tokens to authenticated;
revoke all on public.matchdays from anon, authenticated;
grant TRIGGER, INSERT, REFERENCES, DELETE, UPDATE, SELECT on public.matchdays to authenticated;
grant SELECT, UPDATE, DELETE, REFERENCES, TRIGGER, INSERT on public.matchdays to anon;
revoke all on public.matches from anon, authenticated;
grant INSERT, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT on public.matches to anon;
grant UPDATE, DELETE, REFERENCES, TRIGGER, INSERT, SELECT on public.matches to authenticated;
revoke all on public.notifications from anon, authenticated;
grant INSERT, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT on public.notifications to anon;
grant SELECT, TRIGGER, REFERENCES, DELETE, INSERT, UPDATE on public.notifications to authenticated;
revoke all on public.players from anon, authenticated;
grant REFERENCES, DELETE, UPDATE, SELECT, INSERT, TRIGGER on public.players to anon;
grant INSERT, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT on public.players to authenticated;
revoke all on public.profiles from anon, authenticated;
grant TRIGGER, INSERT, SELECT, DELETE, REFERENCES on public.profiles to anon;
grant REFERENCES, INSERT, SELECT, DELETE, TRIGGER on public.profiles to authenticated;
grant UPDATE (full_name) on public.profiles to authenticated;
revoke all on public.rol_templates from anon, authenticated;
grant SELECT, DELETE, REFERENCES, TRIGGER, INSERT, UPDATE on public.rol_templates to anon;
grant TRIGGER, INSERT, SELECT, UPDATE, DELETE, REFERENCES on public.rol_templates to authenticated;
revoke all on public.team_charges from anon, authenticated;
grant INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER on public.team_charges to authenticated;
grant INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER on public.team_charges to anon;
revoke all on public.team_private from anon, authenticated;
grant INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER on public.team_private to authenticated;
grant INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER on public.team_private to anon;
revoke all on public.teams from anon, authenticated;
grant INSERT, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT on public.teams to anon;
grant INSERT, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT on public.teams to authenticated;
revoke all on public.tournaments from anon, authenticated;
grant REFERENCES, INSERT, SELECT, UPDATE, DELETE, TRIGGER on public.tournaments to anon;
grant INSERT, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT on public.tournaments to authenticated;
revoke all on public.venue_closures from anon, authenticated;
grant INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER on public.venue_closures to authenticated;
grant INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER on public.venue_closures to anon;
revoke all on public.venue_slots from anon, authenticated;
grant INSERT, REFERENCES, DELETE, UPDATE, SELECT, TRIGGER on public.venue_slots to anon;
grant INSERT, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT on public.venue_slots to authenticated;
revoke all on public.venue_template_slots from anon, authenticated;
grant INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER on public.venue_template_slots to anon;
grant SELECT, TRIGGER, REFERENCES, DELETE, UPDATE, INSERT on public.venue_template_slots to authenticated;
revoke all on public.venue_templates from anon, authenticated;
grant TRIGGER, INSERT, SELECT, UPDATE, DELETE, REFERENCES on public.venue_templates to anon;
grant TRIGGER, INSERT, SELECT, UPDATE, DELETE, REFERENCES on public.venue_templates to authenticated;
revoke all on public.venues from anon, authenticated;
grant INSERT, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT on public.venues to anon;
grant SELECT, TRIGGER, REFERENCES, DELETE, UPDATE, INSERT on public.venues to authenticated;

-- Permisos de funciones
revoke all on function public.apply_fixture_update(p_tournament_id uuid, p_first_number integer, p_plan json) from public, anon, authenticated;
grant execute on function public.apply_fixture_update(p_tournament_id uuid, p_first_number integer, p_plan json) to authenticated, service_role;
revoke all on function public.can_manage_storage_object(p_name text) from public, anon, authenticated;
grant execute on function public.can_manage_storage_object(p_name text) to anon, authenticated, public, service_role;
revoke all on function public.claim_team_delegate(p_token text, p_user_id uuid, p_delegate_name text, p_delegate_email text) from public, anon, authenticated;
grant execute on function public.claim_team_delegate(p_token text, p_user_id uuid, p_delegate_name text, p_delegate_email text) to anon, authenticated, public, service_role;
revoke all on function public.claim_team_delegate_self(p_token text, p_delegate_name text) from public, anon, authenticated;
grant execute on function public.claim_team_delegate_self(p_token text, p_delegate_name text) to authenticated, service_role;
revoke all on function public.close_venue_day(p_tournament_id uuid, p_venue_id uuid, p_date date, p_reason text) from public, anon, authenticated;
grant execute on function public.close_venue_day(p_tournament_id uuid, p_venue_id uuid, p_date date, p_reason text) to authenticated, service_role;
revoke all on function public.create_match_token() from public, anon, authenticated;
grant execute on function public.create_match_token() to anon, authenticated, public, service_role;
revoke all on function public.create_team_private() from public, anon, authenticated;
grant execute on function public.create_team_private() to anon, authenticated, public, service_role;
revoke all on function public.get_delegate_fixture(p_team_id uuid) from public, anon, authenticated;
grant execute on function public.get_delegate_fixture(p_team_id uuid) to authenticated, service_role;
revoke all on function public.get_delegate_pending(p_team_id uuid) from public, anon, authenticated;
grant execute on function public.get_delegate_pending(p_team_id uuid) to authenticated, service_role;
revoke all on function public.get_match_by_token(p_token text) from public, anon, authenticated;
grant execute on function public.get_match_by_token(p_token text) to anon, authenticated, public, service_role;
revoke all on function public.get_matchday_image_data(p_matchday_id uuid) from public, anon, authenticated;
grant execute on function public.get_matchday_image_data(p_matchday_id uuid) to authenticated, service_role;
revoke all on function public.get_team_invite_info(p_token text) from public, anon, authenticated;
grant execute on function public.get_team_invite_info(p_token text) to anon, authenticated, public, service_role;
revoke all on function public.get_tournament_template(p_tournament_id uuid) from public, anon, authenticated;
grant execute on function public.get_tournament_template(p_tournament_id uuid) to authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to anon, authenticated, public, service_role;
revoke all on function public.is_tournament_admin(p_tournament_id uuid) from public, anon, authenticated;
grant execute on function public.is_tournament_admin(p_tournament_id uuid) to anon, authenticated, public, service_role;
revoke all on function public.log_match_change() from public, anon, authenticated;
grant execute on function public.log_match_change() to anon, authenticated, public, service_role;
revoke all on function public.mark_notifications_read(p_team_id uuid) from public, anon, authenticated;
grant execute on function public.mark_notifications_read(p_team_id uuid) to authenticated, service_role;
revoke all on function public.my_active_delegate_team_ids() from public, anon, authenticated;
grant execute on function public.my_active_delegate_team_ids() to anon, authenticated, public, service_role;
revoke all on function public.my_blocked_tournament_ids() from public, anon, authenticated;
grant execute on function public.my_blocked_tournament_ids() to anon, authenticated, public, service_role;
revoke all on function public.my_delegate_team_ids() from public, anon, authenticated;
grant execute on function public.my_delegate_team_ids() to anon, authenticated, public, service_role;
revoke all on function public.my_delegate_tournament_ids() from public, anon, authenticated;
grant execute on function public.my_delegate_tournament_ids() to anon, authenticated, public, service_role;
revoke all on function public.my_locked_tournament_ids() from public, anon, authenticated;
grant execute on function public.my_locked_tournament_ids() to anon, authenticated, public, service_role;
revoke all on function public.notify_match_change() from public, anon, authenticated;
grant execute on function public.notify_match_change() to anon, authenticated, public, service_role;
revoke all on function public.notify_rules_change() from public, anon, authenticated;
grant execute on function public.notify_rules_change() to anon, authenticated, public, service_role;
revoke all on function public.registration_open_for_team(p_team_id uuid) from public, anon, authenticated;
grant execute on function public.registration_open_for_team(p_team_id uuid) to anon, authenticated, public, service_role;
revoke all on function public.shift_matchdays(p_tournament_id uuid, p_from_number integer, p_weeks integer, p_cascade boolean) from public, anon, authenticated;
grant execute on function public.shift_matchdays(p_tournament_id uuid, p_from_number integer, p_weeks integer, p_cascade boolean) to authenticated, service_role;
revoke all on function public.submit_match_report(p_token text, p_score_home integer, p_score_away integer, p_events json, p_referee_notes text, p_attendance json, p_suspended_minute integer, p_suspension_reason text) from public, anon, authenticated;
grant execute on function public.submit_match_report(p_token text, p_score_home integer, p_score_away integer, p_events json, p_referee_notes text, p_attendance json, p_suspended_minute integer, p_suspension_reason text) to anon, authenticated, service_role;
revoke all on function public.submit_walkover(p_token text, p_absent text) from public, anon, authenticated;
grant execute on function public.submit_walkover(p_token text, p_absent text) to anon, authenticated, service_role;
revoke all on function public.swap_matches(p_match_a uuid, p_match_b uuid) from public, anon, authenticated;
grant execute on function public.swap_matches(p_match_a uuid, p_match_b uuid) to authenticated, service_role;

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('logos', 'logos', true, 2097152, '{image/png,image/jpeg,image/webp,image/gif}'::text[]) on conflict (id) do nothing;

commit;
