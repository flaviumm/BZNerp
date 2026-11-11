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

En `Authentication > Sign In / Providers`, desactivar `Allow new users to sign up`: el ERP no
tiene registro publico. Los usuarios los crea un admin desde `Usuarios` y las empresas el
super admin desde `Organizaciones`.

Para pruebas rapidas, en `Authentication > Sign In / Providers > Email`, se puede desactivar temporalmente la confirmacion de email. Para operacion real, conviene activarla.

En `Authentication > URL Configuration`, configurar:

```text
Site URL: https://erp-snowy-one.vercel.app
Redirect URLs:
https://erp-snowy-one.vercel.app
https://erp-snowy-one.vercel.app/**
```

Si el email de confirmacion manda a `localhost`, esta configuracion esta pendiente o el usuario fue creado antes de corregirla.

## 4. Crear primer usuario admin

1. En Supabase, `Authentication > Users > Add user` (email + password, con `Auto Confirm`).
   El trigger `handle_new_user` crea el perfil en estado `pending`.
2. Luego ejecutar en Supabase:

```sql
update profiles
set role = 'admin', status = 'active'
where id = 'UUID_DEL_USUARIO';
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
- `Authentication > URL Configuration` apuntando a `https://erp-snowy-one.vercel.app`.
- Bucket `erp-documents` creado como privado por `database/documents.sql`.
- `Allow new users to sign up` desactivado.
- No cargar `SUPABASE_SERVICE_ROLE_KEY` en variables `VITE_*`.
- Secrets `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` cargados en GitHub para el backup nocturno (ver `BACKUP.md`).

## 6. Cargar variables en Vercel

Desde la terminal del proyecto:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

Despues redeploy:

```bash
vercel --prod
```

## 7. Seguridad

- No subir `.env.local`.
- No usar `SUPABASE_SERVICE_ROLE_KEY` en Vercel frontend.
- El modo demo no existe en builds de produccion: si faltan las variables de Supabase se muestra la pantalla de configuracion.
- Los usuarios de la plataforma (super admin) no cargan datos operativos: no tienen organizacion y la base rechaza esos inserts.

## 8. Multiempresa: crear el primer super-admin

El sistema es multiempresa: cada organizacion tiene sus datos aislados. Un
super-admin (vos) crea cada organizacion nueva y su primer usuario admin
invocando la funcion `create-organization`.

1. Crear un usuario desde `Authentication > Users > Add user` en Supabase (o via
   `admin-create-user` si ya existe una organizacion).
2. Promoverlo a super-admin en Supabase:

```sql
update profiles
set is_super_admin = true
where full_name = 'NOMBRE DEL SUPER-ADMIN'
   or id = 'UUID_DEL_USUARIO';
```

3. Ese usuario ya puede llamar a `create-organization` con su token de sesion
   para dar de alta empresas nuevas (nombre de la empresa + datos del primer
   admin de esa empresa):

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/create-organization" \
  -H "Authorization: Bearer <token-del-super-admin>" \
  -H "Content-Type: application/json" \
  -d '{"organizationName":"Nombre Empresa Cliente","email":"admin@empresa.com","password":"password-temporal","fullName":"Nombre Admin"}'
```

## 9. Operar como super admin (panel de plataforma)

El super admin no pertenece a ninguna empresa. En el encabezado elige la **empresa activa** y
el ERP completo (clientes, presupuestos, OT, usuarios, configuracion) pasa a operar sobre esa
empresa, con su numeracion y sus tarifas. La eleccion se guarda en `profiles.acting_organization_id`.

En **Plataforma** puede crear, renombrar, suspender/reactivar y borrar empresas (escribiendo el
nombre para confirmar; borra datos, archivos y usuarios). En **Usuarios** crea usuarios en la
empresa activa y cambia contrasenas con el boton "Clave". En **Configuracion** edita marca,
tarifas de mano de obra y parametros de calculo de la empresa activa.

Requisitos: migracion `20261111120000_super_admin_panel.sql` aplicada (`npm run db:push`) y
la funcion `admin-create-user` redeployada:

```bash
npm.cmd run supabase -- functions deploy admin-create-user
```

Verificar organizaciones existentes:

```sql
select id, name, created_at from organizations order by created_at desc;
```
