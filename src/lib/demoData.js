export const initialCompanies = [
  { id: 1, name: "Neuquen Energy Services", type: "Oil & Gas", city: "Anelo", status: "Prospecto", contact: "Mariana Rios", phone: "+54 299 443-1020", contacts: [{ name: "Mariana Rios", role: "Compras", phone: "+54 299 443-1020", email: "mariana@nes.com" }], next: "Llamar compras", value: 18500000 },
  { id: 2, name: "Constructora Patagonia Norte", type: "Constructora", city: "Neuquen", status: "Activo", contact: "Pablo Castro", phone: "+54 299 521-8870", contacts: [{ name: "Pablo Castro", role: "Direccion", phone: "+54 299 521-8870", email: "pablo@cpn.com" }], next: "Enviar presupuesto", value: 7200000 },
  { id: 3, name: "Estudio Arq. Sur", type: "Arquitectura", city: "Plottier", status: "Contactado", contact: "Lucia Herrera", phone: "+54 299 600-1450", contacts: [{ name: "Lucia Herrera", role: "Proyecto", phone: "+54 299 600-1450", email: "lucia@arqsur.com" }], next: "Reunion tecnica", value: 3900000 },
  { id: 4, name: "Servicios Industriales VM", type: "Industria", city: "Centenario", status: "Negociacion", contact: "Victor Molina", phone: "+54 299 477-3099", contacts: [{ name: "Victor Molina", role: "Operaciones", phone: "+54 299 477-3099", email: "victor@sivm.com" }], next: "Definir alcance", value: 12600000 },
  { id: 5, name: "Municipalidad de San Patricio", type: "Sector publico", city: "San Patricio del Chanar", status: "Activo", contact: "Carolina Funes", phone: "+54 299 489-7721", contacts: [{ name: "Carolina Funes", role: "Compras", phone: "+54 299 489-7721", email: "carolina@sanpatricio.gob.ar" }], next: "Presentar avance", value: 5100000 },
];

export const initialOpportunities = [
  { id: 1, company: "Neuquen Energy Services", service: "Piletas industriales", stage: "Nuevo prospecto", amount: 18500000, probability: 25, owner: "Ventas", due: "2026-05-09" },
  { id: 2, company: "Constructora Patagonia Norte", service: "Estructuras metalicas", stage: "Presupuesto enviado", amount: 7200000, probability: 65, owner: "Direccion", due: "2026-05-07" },
  { id: 3, company: "Estudio Arq. Sur", service: "Barandas y escaleras", stage: "Reunion", amount: 3900000, probability: 40, owner: "Ventas", due: "2026-05-10" },
  { id: 4, company: "Servicios Industriales VM", service: "Tableros electricos", stage: "Negociacion", amount: 12600000, probability: 75, owner: "Ingenieria", due: "2026-05-06" },
  { id: 5, company: "Municipalidad de San Patricio", service: "Mantenimiento urbano", stage: "Ganado", amount: 5100000, probability: 100, owner: "Operaciones", due: "2026-05-13" },
];

export const initialQuotes = [
  { number: "P-0001", client: "Constructora Patagonia Norte", service: "Estructuras metalicas", subtotal: 5950413, tax: 1249587, total: 7200000, status: "Enviado", validUntil: "2026-05-20" },
  { number: "P-0002", client: "Servicios Industriales VM", service: "Tableros electricos", subtotal: 10413223, tax: 2186777, total: 12600000, status: "En revision", validUntil: "2026-05-18" },
  { number: "P-0003", client: "Estudio Arq. Sur", service: "Barandas", subtotal: 3223140, tax: 676860, total: 3900000, status: "Borrador", validUntil: "2026-05-25" },
];

export const initialWorkOrders = [
  { number: "OT-0001", client: "Constructora Patagonia Norte", service: "Estructuras metalicas", status: "En ejecucion", progress: 55, margin: 31, start: "2026-04-28", end: "2026-05-17", team: "Taller A" },
  { number: "OT-0002", client: "Servicios Industriales VM", service: "Tableros electricos", status: "Programada", progress: 15, margin: 38, start: "2026-05-08", end: "2026-05-21", team: "Electricidad" },
  { number: "OT-0003", client: "Neuquen Energy Services", service: "Piletas industriales", status: "Pendiente", progress: 0, margin: 35, start: "2026-05-15", end: "2026-06-02", team: "Taller B" },
  { number: "OT-0004", client: "Municipalidad de San Patricio", service: "Mantenimiento urbano", status: "En ejecucion", progress: 72, margin: 27, start: "2026-04-25", end: "2026-05-12", team: "Campo" },
];

export const inventory = [
  { sku: "MAT-001", name: "Chapa galvanizada 2mm", category: "Metales", stock: 18, min: 12, unit: "planchas", cost: 86500 },
  { sku: "MAT-002", name: "Perfil UPN 100", category: "Metales", stock: 34, min: 20, unit: "barras", cost: 112000 },
  { sku: "ELE-014", name: "Disyuntor trifasico 40A", category: "Electricidad", stock: 6, min: 10, unit: "unidades", cost: 74200 },
  { sku: "SEG-009", name: "EPP soldador completo", category: "Seguridad", stock: 9, min: 8, unit: "kits", cost: 156000 },
  { sku: "PNT-003", name: "Pintura epoxi industrial", category: "Pintura", stock: 4, min: 6, unit: "latas", cost: 91300 },
];

export const purchases = [
  { number: "OC-0041", supplier: "Aceros del Valle", area: "Taller", total: 1865000, status: "Recibida", due: "2026-05-04" },
  { number: "OC-0042", supplier: "Electro Patagonia", area: "Electricidad", total: 942000, status: "Pendiente", due: "2026-05-08" },
  { number: "OC-0043", supplier: "Pintureria Industrial Sur", area: "Terminacion", total: 318000, status: "Autorizacion", due: "2026-05-06" },
];

export const invoices = [
  { number: "F-00084", client: "Constructora Patagonia Norte", concept: "Anticipo OT-0001", total: 2880000, status: "Cobrada", due: "2026-04-30" },
  { number: "F-00085", client: "Municipalidad de San Patricio", concept: "Certificado avance", total: 1530000, status: "Pendiente", due: "2026-05-12" },
  { number: "F-00086", client: "Servicios Industriales VM", concept: "Anticipo tablero", total: 3780000, status: "Por vencer", due: "2026-05-09" },
];

export const employees = [
  { id: 1, name: "Sofia Becerra", role: "Administracion", team: "Backoffice", status: "Disponible", hours: 148 },
  { id: 2, name: "Diego Saez", role: "Soldador", team: "Taller A", status: "Asignado", hours: 162 },
  { id: 3, name: "Martin Quiroga", role: "Tecnico electrico", team: "Electricidad", status: "Asignado", hours: 154 },
  { id: 4, name: "Nadia Perez", role: "Jefa de obra", team: "Campo", status: "Asignado", hours: 170 },
  { id: 5, name: "Tomas Aguilar", role: "Compras", team: "Backoffice", status: "Disponible", hours: 144 },
];

export const tasks = [
  { id: 1, text: "Cerrar alcance de piletas industriales", owner: "Ingenieria", priority: "Alta", due: "2026-05-06" },
  { id: 2, text: "Confirmar entrega de disyuntores", owner: "Compras", priority: "Media", due: "2026-05-08" },
  { id: 3, text: "Enviar certificado de avance municipal", owner: "Administracion", priority: "Alta", due: "2026-05-07" },
  { id: 4, text: "Revisar margen de OT-0004", owner: "Direccion", priority: "Media", due: "2026-05-09" },
];

export const initialDocuments = [
  { id: 1, kind: "Presupuesto", relatedType: "Presupuesto", relatedNumber: "P-0001", name: "presupuesto-estructuras.pdf", mimeType: "application/pdf", size: 248000, storagePath: "demo/presupuesto-estructuras.pdf", url: "", notes: "Version enviada al cliente", createdAt: "2026-05-05" },
  { id: 2, kind: "Certificado", relatedType: "OT", relatedNumber: "OT-0004", name: "certificado-avance-municipal.pdf", mimeType: "application/pdf", size: 184000, storagePath: "demo/certificado-avance-municipal.pdf", url: "", notes: "Avance mensual", createdAt: "2026-05-05" },
];

export const initialAuditLog = [
  { id: 1, action: "create", module: "system", recordKey: "init", summary: "ERP inicializado con datos base", actorName: "Sistema", createdAt: "2026-05-05T18:00:00.000Z" },
];

export const localDatabaseKey = "bizon_erp_local_database_v1";
