-- ============================================================================
-- Cuentas de súper admin (soporte de Torneapp)
-- Correr en Supabase → SQL Editor del proyecto que corresponda.
-- Cambia 'correo@ejemplo.com' por el correo de la cuenta (ya registrada).
-- ============================================================================

-- Ver quiénes son súper admin
select u.email, s.created_at
from public.super_admins s join auth.users u on u.id = s.user_id;

-- Agregar una cuenta
-- insert into public.super_admins (user_id)
-- select id from auth.users where lower(email) = lower('correo@ejemplo.com')
-- on conflict do nothing;

-- Quitar una cuenta
-- delete from public.super_admins
-- where user_id = (select id from auth.users where lower(email) = lower('correo@ejemplo.com'));

-- Para cambiar de cuenta: primero agrega la nueva, comprueba que entra a /super,
-- y después quita la anterior (así nunca te quedas sin acceso).
