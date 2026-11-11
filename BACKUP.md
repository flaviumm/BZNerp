# Backups y restauracion

## Objetivo

Mantener una copia recuperable de datos operativos, documentos y auditoria del ERP.

## Alcance del backup

`scripts/backup-supabase.mjs` exporta a JSON:

- organizaciones y perfiles (roles, estado, super admin);
- catalogos de precios (materiales global, mano de obra y perfiles de calculo por organizacion);
- clientes, CRM, presupuestos, OT, inventario, compras, facturas, RRHH y tareas;
- numeradores, metadata de documentos y auditoria;
- leads capturados e interacciones;
- archivos del bucket Supabase Storage `erp-documents`.

Cada corrida escribe `backups/YYYY-MM-DDTHH-mm-ss-*/` con un `manifest.json`.

## Backup automatico (GitHub Actions)

`.github/workflows/backup.yml` corre todas las noches (01:00 Argentina) y guarda la carpeta
como artifact con retencion de 90 dias. Tambien se puede lanzar a mano desde la pestaña
Actions del repo.

Secrets del repositorio (Settings > Secrets and variables > Actions):

- `SUPABASE_URL`: la Project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: la service role key (administrativa, nunca va al frontend ni se commitea).

Para bajar un backup: Actions > Backup Supabase > elegir la corrida > Artifacts.

## Backup manual

```powershell
$env:VITE_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
npm.cmd run backup
```

## Restaurar

1. Crear el proyecto Supabase (o usar el existente) y aplicar las migraciones:

```powershell
npm.cmd run supabase -- link --project-ref TU_PROJECT_REF
npm.cmd run db:push
```

2. Restaurar tablas y archivos:

```powershell
npm.cmd run restore -- C:\ruta\al\backup
```

Usuarios: Supabase Auth guarda las cuentas en `auth.users`, que no se exporta. En una
restauracion a un proyecto nuevo hay que recrear los usuarios desde `Authentication > Users`
con el mismo UUID (o recrear y reasignar `profiles`). Sobre el mismo proyecto, los `profiles`
conservan la relacion.

## Prueba de restauracion

Una vez por mes:

1. Crear un proyecto Supabase de prueba.
2. Aplicar migraciones (`db:push`).
3. Restaurar el backup mas reciente.
4. Correr el ERP contra ese proyecto (`.env.local` apuntando al proyecto de prueba).
5. Validar login, clientes, presupuestos, OT, documentos y auditoria.
6. Borrar el proyecto de prueba.

## Criterios de recuperacion

- RPO objetivo: maximo 24 horas de perdida de datos.
- RTO objetivo: restauracion funcional en menos de 2 horas.
