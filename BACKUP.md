# Backups y restauracion

## Objetivo

Mantener una copia recuperable de datos operativos, documentos y auditoria del ERP.

## Alcance del backup

El script `npm.cmd run backup` exporta:

- tablas operativas: clientes, CRM, presupuestos, OT, inventario, compras, facturas, RRHH y tareas;
- perfiles y roles;
- numeradores;
- documentos metadata;
- auditoria;
- archivos del bucket Supabase Storage `erp-documents`.

Los backups se guardan en `backups/YYYY-MM-DDTHH-mm-ss-*`.

## Variables requeridas

Configurar en la terminal o en el entorno del servidor:

```powershell
$env:VITE_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
```

La `service_role_key` es administrativa. No debe usarse con prefijo `VITE_`, no debe ir al navegador y no debe commitearse.

## Crear backup manual

```powershell
npm.cmd run backup
```

## Restaurar backup

Primero crear el proyecto Supabase y ejecutar las migraciones en este orden:

1. `database/schema.sql`
2. `database/auth_policies.sql`
3. `database/numbering.sql`
4. `database/documents.sql`
5. `database/audit.sql`

Luego restaurar:

```powershell
npm.cmd run restore -- C:\ruta\al\backup
```

Nota sobre usuarios: Supabase Auth guarda usuarios en `auth.users`, que no se exporta desde este backup de tablas públicas. En una restauración a un proyecto nuevo hay que recrear usuarios desde Supabase Auth y reasignar roles en `profiles`. En una restauración sobre el mismo proyecto, los `profiles` existentes deberían conservar la relación.

## Programar backup en Windows

Crear una tarea programada que ejecute:

```powershell
powershell.exe -ExecutionPolicy Bypass -File C:\ruta\ERP\scripts\run-backup.ps1
```

La tarea debe tener las variables `VITE_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` disponibles para el usuario que ejecuta el proceso.

Frecuencia recomendada:

- diario a las 23:00 para operación normal;
- cada 6 horas si hay carga administrativa alta;
- retener 30 backups diarios y 12 backups mensuales.

## Prueba de restauracion

Una vez por mes:

1. Crear un proyecto Supabase de prueba.
2. Ejecutar migraciones.
3. Restaurar el backup más reciente.
4. Correr el ERP contra ese proyecto.
5. Validar login, clientes, presupuestos, OT, documentos y auditoria.

## Criterios de recuperacion

- RPO objetivo: máximo 24 horas de pérdida de datos.
- RTO objetivo: restauración funcional en menos de 2 horas.

## Pendiente recomendado

Agregar un destino externo para copiar la carpeta `backups`: OneDrive empresarial, S3, Google Drive, SharePoint o almacenamiento del proveedor cloud.
