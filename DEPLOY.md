# Bizon ERP - puesta operativa

## 1. Crear la base de datos

1. Crear un proyecto en Supabase.
2. Abrir `SQL Editor`.
3. Ejecutar `database/schema.sql`.
4. Ejecutar `database/seed.sql` para cargar datos iniciales.
5. Ejecutar `database/auth_policies.sql` para activar usuarios, roles y permisos.
6. Ejecutar `database/numbering.sql` para numeradores transaccionales.
7. Ejecutar `database/documents.sql` para adjuntos y bucket privado de documentos.
8. Ejecutar `database/audit.sql` para historial de cambios.
9. Ejecutar `database/calendar.sql` para campos de agenda/calendario.

`schema.sql` arranca con policies abiertas para facilitar el MVP. `auth_policies.sql` las reemplaza por acceso autenticado y permisos por rol.

Roles disponibles:

- `admin`: acceso total.
- `direccion`: lectura gerencial y reportes.
- `ventas`: clientes, CRM y presupuestos.
- `operaciones`: ordenes de trabajo e inventario.
- `compras`: inventario y compras.
- `finanzas`: presupuestos y facturas.
- `rrhh`: personal.

El primer usuario creado queda por defecto como `ventas`. Para convertirlo en administrador, ejecutar en Supabase:

```sql
update profiles
set role = 'admin'
where full_name = 'Nombre del usuario'
   or id = 'UUID_DEL_USUARIO';
```

## 2. Configurar variables

Copiar `.env.example` a `.env.local`:

```bash
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

En Vercel, Netlify o Render usar las mismas variables de entorno.

En produccion el modo demo queda bloqueado por defecto si faltan `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`. Ver `SUPABASE_SETUP.md` para la puesta real con login y roles.

## 3. Correr local

```bash
npm.cmd install
npm.cmd run dev
```

Abrir `http://127.0.0.1:5173/`.

## 4. Subir a produccion

Build:

```bash
npm.cmd run build
```

Deploy recomendado:

- Vercel: importar carpeta del proyecto, framework Vite, output `dist`.
- Netlify: build command `npm run build`, publish directory `dist`.
- Hosting propio: subir el contenido de `dist` a un servidor web estatico.

## 5. Pendientes para operacion real

- Multiempresa si Bizon administra mas de una razon social.

## Alcance actual del MVP

- Autenticacion y roles con Supabase Auth.
- Base local persistente cuando Supabase no esta configurado.
- Backup JSON desde la interfaz.
- CRUD de clientes, CRM, presupuestos, ordenes de trabajo, inventario, compras, finanzas, RRHH y tareas.
- Numeradores transaccionales para presupuestos, OT, OC y facturas cuando Supabase esta configurado.
- Adjuntos/documentos para presupuestos, facturas, remitos, certificados y operaciones, con Base local o Supabase Storage.
- Auditoria de altas, ediciones, borrados y documentos para roles `admin` y `direccion`.
- Calendario integrado con vencimientos, OT, compras, facturas, tareas y eventos manuales.
- Backups y restauracion documentados en `BACKUP.md`, con scripts `npm.cmd run backup` y `npm.cmd run restore`.
- Reportes gerenciales integrados.

## Backups

Ver `BACKUP.md` para configurar backups programados, restauracion y prueba mensual de recuperacion.
