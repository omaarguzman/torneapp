# Carpeta `sql/` (histórico)

Estos archivos se corrieron a mano en el SQL Editor de Supabase antes de usar
migraciones. Se conservan como referencia; **ya no se corren**.

Desde el 2026-10-11 los cambios de base de datos viven en `supabase/migrations/`:

| Paso | Comando |
|---|---|
| Crear una migración nueva | `npm run db:nueva nombre_del_cambio` |
| Aplicarla en desarrollo (`torneapp-dev`) | `npm run db:dev` |
| Ver qué falta en desarrollo | `npm run db:estado-dev` |
| Aplicarla en producción | `npm run db:prod` |
| Ver qué falta en producción | `npm run db:estado-prod` |

`supabase/migrations/20261011000000_estructura_inicial.sql` reúne la estructura
completa a esa fecha (`esquema.sql` + súper admin + importar jornadas). En las
bases que ya existían se marcó como aplicada; solo se ejecuta en una base nueva.

Los archivos de consulta (`exportar-esquema.sql`, `super-admin-cuentas.sql`)
siguen siendo útiles para correr a mano.
