-- ============================================================================
-- Súper admin · 2026-10-11
-- Panel general: ver, apoyar, pausar, transferir y borrar cualquier torneo.
-- Correr completo en Supabase → SQL Editor (primero en torneapp-dev).
-- ============================================================================

begin;

-- 1) Quién es súper admin. Nadie puede leer ni escribir esta tabla desde la app:
--    solo se llena corriendo SQL en Supabase (ver el final del archivo).
create table if not exists public.super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.super_admins enable row level security;
revoke all on public.super_admins from anon, authenticated;

create or replace function public.is_super_admin()
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select exists (select 1 from super_admins where user_id = auth.uid())
$$;
-- anon también la puede llamar (siempre responde false): la usan políticas públicas
grant execute on function public.is_super_admin() to anon, authenticated;

-- 2) Torneos pausados
alter table public.tournaments add column if not exists disabled_at timestamptz;

create or replace function public.tournament_paused(p_tournament_id uuid)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select coalesce((select disabled_at is not null from tournaments where id = p_tournament_id), false)
$$;

-- Solo el súper admin puede pausar o reanudar
create or replace function public.guard_tournament_pause()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.disabled_at is not null and not is_super_admin() then new.disabled_at := null; end if;
  elsif new.disabled_at is distinct from old.disabled_at and not is_super_admin() then
    raise exception 'ONLY_SUPER_ADMIN';
  end if;
  return new;
end;
$$;
drop trigger if exists tournaments_guard_pause on public.tournaments;
create trigger tournaments_guard_pause before insert or update on public.tournaments
  for each row execute function public.guard_tournament_pause();

-- 3) "¿Eres admin de este torneo?": el dueño (si no está pausado) o el súper admin.
--    Todas las políticas del admin pasan por aquí.
create or replace function public.is_tournament_admin(p_tournament_id uuid)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select is_super_admin() or exists (
    select 1 from tournaments t
    where t.id = p_tournament_id and t.admin_id = auth.uid() and t.disabled_at is null
  )
$$;

-- Políticas que revisaban al dueño directamente → ahora usan is_tournament_admin
drop policy if exists "Admin gestiona sus torneos" on public.tournaments;
drop policy if exists "Admin ve sus torneos" on public.tournaments;
drop policy if exists "Admin crea torneos" on public.tournaments;
drop policy if exists "Admin edita sus torneos" on public.tournaments;
drop policy if exists "Admin borra sus torneos" on public.tournaments;
-- El dueño siempre ve su torneo (aunque esté pausado, para avisarle)
create policy "Admin ve sus torneos" on public.tournaments for select
  using (admin_id = auth.uid() or is_super_admin());
create policy "Admin crea torneos" on public.tournaments for insert
  with check (admin_id = auth.uid());
create policy "Admin edita sus torneos" on public.tournaments for update
  using (is_tournament_admin(id))
  with check (admin_id = auth.uid() or is_super_admin());
create policy "Admin borra sus torneos" on public.tournaments for delete
  using (is_tournament_admin(id));

drop policy if exists "Admin gestiona jornadas de sus torneos" on public.matchdays;
create policy "Admin gestiona jornadas de sus torneos" on public.matchdays for all
  using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));

drop policy if exists "Admin gestiona partidos de sus torneos" on public.matches;
create policy "Admin gestiona partidos de sus torneos" on public.matches for all
  using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));

drop policy if exists "Admin gestiona jugadores de sus torneos" on public.players;
create policy "Admin gestiona jugadores de sus torneos" on public.players for all
  using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));

drop policy if exists "Admin gestiona canchas de sus torneos" on public.venues;
create policy "Admin gestiona canchas de sus torneos" on public.venues for all
  using (is_tournament_admin(tournament_id)) with check (is_tournament_admin(tournament_id));

drop policy if exists "Admin gestiona horarios de sus canchas" on public.venue_slots;
create policy "Admin gestiona horarios de sus canchas" on public.venue_slots for all
  using (exists (select 1 from venues v where v.id = venue_slots.venue_id and is_tournament_admin(v.tournament_id)))
  with check (exists (select 1 from venues v where v.id = venue_slots.venue_id and is_tournament_admin(v.tournament_id)));

drop policy if exists "Admin gestiona eventos de sus torneos" on public.match_events;
create policy "Admin gestiona eventos de sus torneos" on public.match_events for all
  using (exists (select 1 from matches m where m.id = match_events.match_id and is_tournament_admin(m.tournament_id)))
  with check (exists (select 1 from matches m where m.id = match_events.match_id and is_tournament_admin(m.tournament_id)));

-- 4) Delegados de un torneo pausado: como si su equipo estuviera bloqueado
create or replace function public.my_active_delegate_team_ids()
returns setof uuid
language sql
stable security definer
set search_path = public
as $$
  select tm.id from teams tm join tournaments t on t.id = tm.tournament_id
  where tm.delegate_id = auth.uid() and not tm.access_blocked and t.disabled_at is null
$$;

create or replace function public.my_blocked_tournament_ids()
returns setof uuid
language sql
stable security definer
set search_path = public
as $$
  select tm.tournament_id from teams tm join tournaments t on t.id = tm.tournament_id
  where tm.delegate_id = auth.uid() and (tm.access_blocked or t.disabled_at is not null)
$$;

create or replace function public.my_locked_tournament_ids()
returns setof uuid
language sql
stable security definer
set search_path = public
as $$
  select distinct tm.tournament_id
  from teams tm join tournaments t on t.id = tm.tournament_id
  where tm.delegate_id = auth.uid()
    and (
      tm.access_blocked
      or t.disabled_at is not null
      or exists (select 1 from team_charges c where c.team_id = tm.id and not c.paid)
    )
$$;

-- 5) Bitácora de soporte: cada cambio que el súper admin hace en un torneo ajeno
create table if not exists public.support_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid default auth.uid(),
  tournament_id uuid,
  tournament_name text,
  table_name text not null,
  action text not null,
  row_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists support_log_created_idx on public.support_log (created_at desc);
alter table public.support_log enable row level security;
revoke all on public.support_log from anon, authenticated;
grant select on public.support_log to authenticated;
drop policy if exists "super admin lee la bitacora" on public.support_log;
create policy "super admin lee la bitacora" on public.support_log for select
  using (is_super_admin());

create or replace function public.log_support_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_tid uuid;
  v_owner uuid;
  v_name text;
  v_detail jsonb;
begin
  if not is_super_admin() then return null; end if;

  if tg_table_name = 'tournaments' then
    v_tid := (v_row->>'id')::uuid;
    v_name := v_row->>'name';
    v_owner := coalesce((v_old->>'admin_id')::uuid, (v_new->>'admin_id')::uuid);
    -- Transferencias y pausas siempre se registran; lo demás, solo en torneos ajenos
    if v_owner = auth.uid()
       and not (tg_op = 'UPDATE' and (v_old->'admin_id' is distinct from v_new->'admin_id'
                                      or v_old->'disabled_at' is distinct from v_new->'disabled_at')) then
      return null;
    end if;
  else
    v_tid := (v_row->>'tournament_id')::uuid;
    if v_tid is null and tg_table_name = 'match_events' then
      select tournament_id into v_tid from matches where id = (v_row->>'match_id')::uuid;
    elsif v_tid is null and tg_table_name = 'venue_slots' then
      select tournament_id into v_tid from venues where id = (v_row->>'venue_id')::uuid;
    end if;
    select admin_id, name into v_owner, v_name from tournaments where id = v_tid;
    -- Sin torneo = se está borrando el torneo completo (ya quedó registrado)
    if v_owner is null or v_owner = auth.uid() then return null; end if;
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(key, value) into v_detail
    from jsonb_each(v_new) where v_old->key is distinct from value;
    if v_detail is null then return null; end if;
  else
    v_detail := v_row;
  end if;

  insert into support_log (tournament_id, tournament_name, table_name, action, row_id, detail)
  values (v_tid, v_name, tg_table_name, lower(tg_op), coalesce(v_row->>'id', v_row->>'match_id', v_row->>'team_id'), v_detail);
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['tournaments', 'teams', 'team_private', 'players', 'matches', 'matchdays',
    'match_events', 'match_attendance', 'team_charges', 'venues', 'venue_slots', 'venue_closures', 'rol_templates']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_support_log', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.log_support_action()', t || '_support_log', t);
  end loop;
end $$;

-- 6) Links para tomar un torneo
create table if not exists public.tournament_claims (
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid
);
alter table public.tournament_claims enable row level security;
revoke all on public.tournament_claims from anon, authenticated;
grant select, insert, delete on public.tournament_claims to authenticated;
drop policy if exists "super admin gestiona links de torneo" on public.tournament_claims;
create policy "super admin gestiona links de torneo" on public.tournament_claims for all
  using (is_super_admin()) with check (is_super_admin());

-- Lo que ve quien abre el link (sin iniciar sesión): solo el nombre y si sirve
create or replace function public.get_tournament_claim_info(p_token text)
returns json
language sql
stable security definer
set search_path = public
as $$
  select json_build_object(
    'tournament_name', t.name,
    'status', case
      when c.used_at is not null then 'used'
      when c.expires_at < now() then 'expired'
      else 'ok' end
  )
  from tournament_claims c join tournaments t on t.id = c.tournament_id
  where c.token = p_token
$$;
revoke all on function public.get_tournament_claim_info(text) from public;
grant execute on function public.get_tournament_claim_info(text) to anon, authenticated;

-- Quien abre el link con sesión iniciada queda como admin del torneo
create or replace function public.claim_tournament(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_claim tournament_claims%rowtype;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_claim from tournament_claims where token = p_token for update;
  if v_claim.token is null then raise exception 'INVALID_LINK'; end if;
  if v_claim.used_at is not null then raise exception 'LINK_USED'; end if;
  if v_claim.expires_at < now() then raise exception 'LINK_EXPIRED'; end if;
  if exists (select 1 from teams where delegate_id = v_uid) then raise exception 'DELEGATE_ACCOUNT'; end if;

  update tournaments set admin_id = v_uid where id = v_claim.tournament_id;
  update tournament_claims set used_at = now(), used_by = v_uid where token = p_token;
  insert into profiles (id, email, role)
  select v_uid, u.email, 'admin' from auth.users u where u.id = v_uid
  on conflict (id) do update set role = 'admin';

  return v_claim.tournament_id;
end;
$$;
revoke all on function public.claim_tournament(text) from public, anon;
grant execute on function public.claim_tournament(text) to authenticated;

-- 7) Transferir un torneo a una cuenta que ya existe (solo súper admin)
create or replace function public.transfer_tournament(p_tournament_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if not is_super_admin() then raise exception 'ONLY_SUPER_ADMIN'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then raise exception 'USER_NOT_FOUND'; end if;
  if exists (select 1 from teams where delegate_id = v_user) then raise exception 'DELEGATE_ACCOUNT'; end if;
  if not exists (select 1 from tournaments where id = p_tournament_id) then raise exception 'NOT_FOUND'; end if;

  update tournaments set admin_id = v_user where id = p_tournament_id;
  insert into profiles (id, email, role)
  select v_user, u.email, 'admin' from auth.users u where u.id = v_user
  on conflict (id) do update set role = 'admin';
end;
$$;
revoke all on function public.transfer_tournament(uuid, text) from public, anon;
grant execute on function public.transfer_tournament(uuid, text) to authenticated;

-- 8) Datos del portal (solo súper admin)
create or replace function public.super_tournaments()
returns json
language plpgsql
stable security definer
set search_path = public
as $$
begin
  if not is_super_admin() then raise exception 'ONLY_SUPER_ADMIN'; end if;
  return coalesce((
    select json_agg(row_to_json(x) order by x.created_at desc)
    from (
      select t.id, t.name, t.sport_type, t.logo_url, t.start_date, t.end_date, t.created_at, t.disabled_at,
             t.admin_id, u.email as admin_email,
             (select count(*) from teams where tournament_id = t.id) as teams,
             (select count(*) from matches where tournament_id = t.id) as matches,
             (select count(*) from matches where tournament_id = t.id and status = 'played') as played,
             greatest(
               t.created_at,
               (select max(changed_at) from match_changes where tournament_id = t.id),
               (select max(created_at) from teams where tournament_id = t.id),
               (select max(created_at) from players where tournament_id = t.id)
             ) as last_activity
      from tournaments t
      left join auth.users u on u.id = t.admin_id
    ) x
  ), '[]'::json);
end;
$$;
revoke all on function public.super_tournaments() from public, anon;
grant execute on function public.super_tournaments() to authenticated;

create or replace function public.super_admins_overview()
returns json
language plpgsql
stable security definer
set search_path = public
as $$
begin
  if not is_super_admin() then raise exception 'ONLY_SUPER_ADMIN'; end if;
  return coalesce((
    select json_agg(row_to_json(x) order by x.last_sign_in_at desc nulls last)
    from (
      select u.id, u.email, u.created_at, u.last_sign_in_at,
             exists (select 1 from super_admins s where s.user_id = u.id) as is_super,
             (select count(*) from tournaments where admin_id = u.id) as tournaments,
             (select count(*) from tournaments where admin_id = u.id and disabled_at is not null) as paused,
             (select count(*) from teams tm join tournaments t on t.id = tm.tournament_id where t.admin_id = u.id) as teams,
             (select count(*) from matches m join tournaments t on t.id = m.tournament_id
               where t.admin_id = u.id and m.status = 'played') as played
      from auth.users u
      join profiles p on p.id = u.id
      where p.role = 'admin'
    ) x
  ), '[]'::json);
end;
$$;
revoke all on function public.super_admins_overview() from public, anon;
grant execute on function public.super_admins_overview() to authenticated;

-- 9) Funciones del delegado: un torneo pausado no muestra nada

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
  from teams where id = p_team_id and delegate_id = auth.uid() and not access_blocked
    and not tournament_paused(tournament_id);
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
        and not tournament_paused(tournament_id)
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

-- 10) Cédula del árbitro: en un torneo pausado no se puede capturar

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
  if tournament_paused(v_match.tournament_id) then raise exception 'TOURNAMENT_PAUSED'; end if;
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

commit;

-- ============================================================================
-- 11) Darte el permiso de súper admin (correr APARTE, después de lo anterior).
--     Cambia el correo por el de tu cuenta:
--
-- insert into public.super_admins (user_id)
-- select id from auth.users where lower(email) = lower('TU-CORREO@gmail.com')
-- on conflict do nothing;
--
-- Para quitarlo:
-- delete from public.super_admins
-- where user_id = (select id from auth.users where lower(email) = lower('TU-CORREO@gmail.com'));
-- ============================================================================
