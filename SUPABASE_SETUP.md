# Supabase real + login

## 1. Crear proyecto

1. Entrar a Supabase y crear un proyecto nuevo.
2. Ir a `Project Settings > API`.
3. Copiar:
   - `Project URL` como `VITE_SUPABASE_URL`.
   - `anon public` como `VITE_SUPABASE_ANON_KEY`.
   - `service_role` solo para backups/restauracion, nunca para frontend.

## 2. Crear estructura de base

En `SQL Editor`, ejecutar en este orden:

1. `database/schema.sql`
2. `database/seed.sql`
3. `database/auth_policies.sql`
4. `database/numbering.sql`
5. `database/documents.sql`
6. `database/audit.sql`
7. `database/calendar.sql`

## 3. Activar login

En `Authentication > Providers`, dejar activo `Email`.

Para pruebas rapidas, en `Authentication > Sign In / Providers > Email`, se puede desactivar temporalmente la confirmacion de email. Para operacion real, conviene activarla.

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

## 5. Cargar variables en Vercel

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

## 6. Seguridad

- No subir `.env.local`.
- No usar `SUPABASE_SERVICE_ROLE_KEY` en Vercel frontend.
- El modo demo esta bloqueado por defecto en produccion si faltan las variables de Supabase.
