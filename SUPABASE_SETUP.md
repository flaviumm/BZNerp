# Supabase real + login

## 1. Crear proyecto

1. Entrar a Supabase y crear un proyecto nuevo.
2. Ir a `Project Settings > API`.
3. Copiar:
   - `Project URL` como `VITE_SUPABASE_URL`.
   - `anon public` como `VITE_SUPABASE_ANON_KEY`.
   - `service_role` solo para backups/restauracion, nunca para frontend.

## 2. Crear estructura de base

Opcion recomendada con Supabase CLI:

```bash
npm.cmd run supabase -- login --token TU_ACCESS_TOKEN
npm.cmd run supabase -- link --project-ref TU_PROJECT_REF
npm.cmd run db:push
```

Esto ejecuta las migraciones versionadas de `supabase/migrations`.

Opcion manual en `SQL Editor`, ejecutar en este orden:

1. `database/schema.sql`
2. `database/seed.sql`
3. `database/auth_policies.sql`
4. `database/numbering.sql`
5. `database/documents.sql`
6. `database/audit.sql`
7. `database/calendar.sql`
8. `database/pricing.sql`

Los scripts estan preparados para una base nueva de produccion. `seed.sql` se puede ejecutar mas de una vez: actualiza los registros iniciales por clave natural y evita duplicados.

Para una puesta limpia, conviene ejecutar todos los scripts antes de cargar usuarios reales. Si la base ya tiene datos productivos, hacer backup antes de repetir `schema.sql` o `seed.sql`.

## 3. Activar login

En `Authentication > Providers`, dejar activo `Email`.

Para pruebas rapidas, en `Authentication > Sign In / Providers > Email`, se puede desactivar temporalmente la confirmacion de email. Para operacion real, conviene activarla.

En `Authentication > URL Configuration`, configurar:

```text
Site URL: https://bznerp.vercel.app
Redirect URLs:
https://bznerp.vercel.app
https://bznerp.vercel.app/**
```

Si el email de confirmacion manda a `localhost`, esta configuracion esta pendiente o el usuario fue creado antes de corregirla.

## 4. Crear primer usuario admin

1. Entrar al ERP y usar `Crear usuario`.
2. Luego ejecutar en Supabase:

```sql
update profiles
set role = 'admin'
where full_name = 'NOMBRE DEL USUARIO'
   or id = 'UUID_DEL_USUARIO';
```

Roles validos:

- `admin`
- `direccion`
- `ventas`
- `operaciones`
- `compras`
- `finanzas`
- `rrhh`

Verificar el usuario admin:

```sql
select id, full_name, role
from profiles
order by created_at desc;
```

## 5. Checklist de produccion

Antes de redeploy:

- `Authentication > Providers > Email` activo.
- Confirmacion de email activa para operacion real.
- `Authentication > URL Configuration` apuntando a `https://bznerp.vercel.app`.
- Bucket `erp-documents` creado como privado por `database/documents.sql`.
- `VITE_ALLOW_DEMO_MODE=false` en Vercel.
- No cargar `SUPABASE_SERVICE_ROLE_KEY` en variables `VITE_*`.

## 6. Cargar variables en Vercel

Desde la terminal del proyecto:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_ALLOW_DEMO_MODE production
```

Para `VITE_ALLOW_DEMO_MODE`, usar:

```text
false
```

Despues redeploy:

```bash
vercel --prod
```

## 7. Seguridad

- No subir `.env.local`.
- No usar `SUPABASE_SERVICE_ROLE_KEY` en Vercel frontend.
- El modo demo esta bloqueado por defecto en produccion si faltan las variables de Supabase.
