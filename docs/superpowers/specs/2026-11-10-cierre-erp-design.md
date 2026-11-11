# Cierre del ERP Bizon: seguridad, usabilidad, utilidad — Design

Date: 2026-11-10
Status: Approved in brainstorming, pending builder check

## Intent

El ERP está desarrollado a medias: lo comercial funciona contra Supabase con RLS,
pero media app (Operación, Reportes) sigue siendo vitrina con datos demo. El
objetivo es dejarlo **cerrado**: todo lo que se ve en el menú funciona de verdad,
es seguro para varias empresas compartiendo el mismo deploy, y las pantallas que
se usan todos los días no hacen renegar.

Hay una segunda empresa esperando entrar, así que el alta de organización tiene
que funcionar de punta a punta.

## Usuarios (en esta etapa)

- **Vendedor / dueño** (roles admin, direccion, ventas): clientes, CRM,
  cotizador, presupuestos, leads. Uso diario. Es el núcleo.
- **Taller / operación** (rol operaciones): órdenes de trabajo y tareas. Mínimo
  viable: alta, edición, cambio de estado, baja.
- **Administración / finanzas** (rol finanzas): ver presupuestos con su estado y
  montos; reportes calculados sobre datos reales.
- **Cliente externo** (rol cliente): contacto de una empresa cliente de Bizon al
  que un admin le crea usuario. Ve solo los presupuestos y OT de su empresa. Sin
  auto-registro.
- **Super admin** (plataforma): crea organizaciones y su primer admin.

## Goals

1. Ninguna fila ni archivo de una organización es visible o escribible desde otra.
2. El rol cliente solo ve lo de su empresa (`company_id`), nunca otras empresas de
   la misma organización.
3. Modo demo apagado en producción; ninguna clave de servicio llega al navegador.
4. Backup automático verificado y procedimiento de restore probado una vez.
5. Todo ítem visible en el menú tiene CRUD real contra Supabase. Lo que no lo
   tiene se oculta.
6. Reportes y Presupuestos calculan sobre datos reales.
7. Alta de organización + primer admin + branding + alta de usuarios probado
   de punta a punta en el deploy real.
8. Clientes y Cotizador/Presupuestos recorridos en navegador como vendedor y
   corregidos los puntos de fricción encontrados.

## Non-goals

- Inventario, Compras, Finanzas (facturación/cobranzas), RRHH: se ocultan del
  menú, no se construyen. Sus tablas quedan en la base con RLS correcto.
- Exportar a Excel.
- Dependencias nuevas de npm.
- Rediseño visual. Solo fricción de uso.
- Billing, self-signup, switch de organización.

## Anti-goals (fallaría aunque "funcione")

- Que un fix de usabilidad abra un agujero de RLS (p. ej. consultar con service
  key desde el cliente, o policies `using (true)`).
- Que el cliente externo vea el pipeline o los clientes de Bizon.
- Que la segunda empresa entre y vea datos demo o datos de Bizon.
- Que "ocultar del menú" sea solo CSS: la ruta y la policy también deben negar.

## Constraints

- Stack existente: React + Vite, Supabase (Postgres, Auth, Storage, Edge
  Functions), Vercel. Migraciones versionadas en `supabase/migrations/`.
- Estilo ponytail: el diff más corto que cierra cada goal. Sin abstracciones
  nuevas. Cada cambio de seguridad deja un check corrible
  (`scripts/test-multitenant-isolation.mjs` ya existe; se extiende, no se
  duplica).
- Commits chicos por tema, en `main`, con mensaje en español como el historial.
- Producción: `erp-snowy-one.vercel.app`. El usuario que prueba es super admin
  sin organización.

## Decisiones tomadas por el usuario

| Tema | Decisión |
|---|---|
| Módulos de Operación | Ocultar Inventario, Compras, Finanzas, RRHH. OT y Tareas quedan con CRUD real. |
| Multiempresa | Se mantiene y se endurece. Hay una empresa esperando. |
| Cliente externo | Entra ahora, ve presupuestos y OT de su empresa. |
| Finanzas hoy | Solo ver presupuestos con estado y reportes reales. Sin facturación. |
| Usabilidad | Foco en Clientes y Cotizador/Presupuestos. |
| Seguridad, prioridades | (1) aislamiento entre empresas/clientes, (2) demo y claves en prod, (3) pérdida de datos. |

## Orden de trabajo

1. **Seguridad**: auditoría de RLS tabla por tabla (incluidas las de operación),
   scope del rol cliente, gate de demo, env vars y edge functions, test de
   aislamiento extendido, backup + restore.
2. **Menú + OT/Tareas**: ocultar los cuatro módulos; CRUD real para
   `work_orders` y `tasks`; vista cliente restringida.
3. **Alta de empresa**: recorrido end-to-end en producción, arreglar trabas.
4. **Reportes + Presupuestos**: sacar demo, calcular sobre reales.
5. **Usabilidad**: recorrido en navegador de Clientes y Cotizador/Presupuestos,
   fixes.

## Decisiones tras el builder check

| Duda | Decisión |
|---|---|
| Scope del cliente: `company_id` real o match por nombre | Match por nombre (`profiles.company_name = quotes.client`), endurecido: el cliente no ve presupuestos en `Borrador`. FK real queda para después. |
| Claves únicas globales (`quotes.number`, `work_orders.number`, `companies.name`, etc.) | Se vuelven únicas por organización en una migración no destructiva. Sin eso la segunda empresa choca en P-0001. |
| Captador de Leads | Se oculta: llama a `/api/captured-leads`, ruta que no existe en Vercel, y sube fotos a un bucket público. Conectarlo es trabajo aparte. |
| Proceso ventas | Visible para todas las empresas (decisión del usuario). |
| Super admin sin organización | No puede insertar datos operativos (quedarían huérfanos). Solo administra. |
| Reportes para finanzas | Finanzas gana lectura de `companies` y `opportunities` y acceso a Reportes. |
| Backup | GitHub Actions nocturno, artifact con retención 90 días. Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` como secrets del repo. |
| Datos en producción | El usuario no tiene datos críticos cargados todavía; los leads están en su correo y en agentes externos. Las migraciones igual no borran filas. |
| Registro público | Se quita del login. Además hay que desactivar "Enable signups" en Supabase Auth (ajuste manual en el dashboard). |

## Dejado al constructor

- Cómo se "oculta" cada módulo (quitar de `screens`, o `roles: []`), siempre que
  la policy también niegue.
- Forma exacta del CRUD de OT/Tareas: puede reutilizar los modales y
  `saveErpRecord/updateErpRecord/deleteErpRecord` existentes.
- Qué indicadores concretos van en Reportes, mientras salgan de `companies`,
  `opportunities` y `quotes` reales.
- Si el backup automático va por GitHub Actions (ya hay un workflow para el
  catálogo) o por cron de Supabase.
- Qué fricciones de usabilidad corregir: las que encuentre en el recorrido,
  priorizando flujos de alta/edición/búsqueda y re-edición de presupuesto.
