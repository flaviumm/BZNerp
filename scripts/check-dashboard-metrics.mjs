import assert from "node:assert/strict";
import { dueWithinDays, overdueWorkOrders, overdueReceivables, quotesByStatus } from "../src/lib/utils.js";

const today = "2026-09-14";
const in30 = "2026-10-14";

// dueWithinDays: incluye vencidas y las que vencen hasta el límite, excluye posteriores e inválidas
const opportunities = [
  { id: 1, due: "2026-09-01" },
  { id: 2, due: "2026-10-14" },
  { id: 3, due: "2026-10-15" },
  { id: 4, due: "" },
];
assert.deepEqual(dueWithinDays(opportunities, in30).map((o) => o.id), [1, 2]);

// overdueWorkOrders: fin pasado + progreso < 100. Progreso 100 NO cuenta. Fin futuro NO cuenta.
const workOrders = [
  { number: "OT-1", end: "2026-09-01", progress: 55 },
  { number: "OT-2", end: "2026-09-01", progress: 100 },
  { number: "OT-3", end: "2026-09-20", progress: 10 },
  { number: "OT-4", end: "2026-09-13", progress: 0 },
];
assert.deepEqual(overdueWorkOrders(workOrders, today).map((o) => o.number), ["OT-1", "OT-4"]);

// overdueReceivables: no cobrada + vencimiento pasado. Cobrada NO cuenta aunque esté vencida. Hoy mismo NO está vencida.
const invoices = [
  { number: "F-1", status: "Pendiente", due: "2026-09-01", total: 100 },
  { number: "F-2", status: "Cobrada", due: "2026-09-01", total: 200 },
  { number: "F-3", status: "Por vencer", due: "2026-09-14", total: 300 },
  { number: "F-4", status: "Pendiente", due: "2026-09-30", total: 400 },
];
assert.deepEqual(overdueReceivables(invoices, today).map((i) => i.number), ["F-1"]);

// quotesByStatus: conteo por estado, estados ausentes simplemente no aparecen
const quotes = [{ status: "Enviado" }, { status: "Enviado" }, { status: "Borrador" }];
assert.deepEqual(quotesByStatus(quotes), { Enviado: 2, Borrador: 1 });
assert.equal(quotesByStatus(quotes)["En revision"], undefined);

console.log("check-dashboard-metrics: ALL PASS");
