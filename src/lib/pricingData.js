export const quotePricingSources = [
  {
    name: "Carlos Isla",
    date: "2026-06-11",
    type: "web-catalog",
    url: "https://carlosisla.com.ar",
    note: "Catálogo Carlos Isla Neuquén. Confirmar stock, medida y condiciones antes de emitir oferta formal.",
  },
  {
    name: "Neucon",
    date: "2026-06-11",
    type: "web-catalog",
    url: "https://www.neuconmateriales.com.ar",
    note: "Materiales de construcción. Confirmar stock y precios antes de emitir oferta.",
  },
  {
    name: "Ferromundo",
    date: "2026-06-11",
    type: "web-catalog",
    url: "https://ferromundo.com.ar",
    note: "Herramientas y accesorios. Verificar disponibilidad antes de cotizar.",
  },
];

export const quoteParameters = {
  iva: 0.21,
  iibb: 0.035,
  targetProfit: 0.25,
  adminOverhead: 0.1,
  technicalContingency: 0.05,
  energyPerKwh: 150,
  travelPerKm: 700,
  roundTo: 1000,
  offerValidityDays: 7,
};

export const laborRates = [
  { id: "soldador", trade: "Soldador", agreement: "UOM CCT 260/75", category: "Oficial Multiple / Oficial Superior CNC", baseHour: 6112.95, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 16975.62 },
  { id: "soldador-especializado", trade: "Soldador especializado", agreement: "UOM CCT 260/75", category: "Oficial Multiple Superior CNC", baseHour: 6541.35, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 18127.8 },
  { id: "electricista-taller", trade: "Electricista taller", agreement: "UOM CCT 260/75", category: "Oficial", baseHour: 5675.08, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 15797.98 },
  { id: "electricista-obra", trade: "Electricista obra", agreement: "UOCRA CCT 76/75 - Electricidad", category: "Oficial - Lineas e Instalacion", baseHour: 5113, monthlyBonus: 134100, monthlyHours: 176, loadFactor: 0.65, quoteHour: 15800.63 },
  { id: "electricista-obra-especializado", trade: "Electricista obra especializado", agreement: "UOCRA CCT 76/75 - Electricidad", category: "Oficial Especializado - Lineas e Instalacion", baseHour: 6279, monthlyBonus: 147000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 19133.72 },
  { id: "ayudante", trade: "Ayudante", agreement: "UOM CCT 260/75", category: "Medio Oficial", baseHour: 4796.27, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 13434.41 },
  { id: "uocra-oficial-especializado-zona-b", trade: "Oficial Especializado (Zona B)", agreement: "UOCRA CCT 76/75 - Construccion (Zona B)", category: "Oficial Especializado - Zona B", baseHour: 6792, quoteHour: 12361.44 },
  { id: "uocra-oficial-zona-b", trade: "Oficial (Zona B)", agreement: "UOCRA CCT 76/75 - Construccion (Zona B)", category: "Oficial - Zona B", baseHour: 5813, quoteHour: 10579.66 },
  { id: "uocra-medio-oficial", trade: "Medio Oficial", agreement: "UOCRA CCT 76/75 - Construccion (Zona B)", category: "Medio Oficial", baseHour: 4832, quoteHour: 8794.24 },
  { id: "uocra-ayudante", trade: "Ayudante UOCRA", agreement: "UOCRA CCT 76/75 - Construccion (Zona B)", category: "Ayudante", baseHour: 4451, quoteHour: 8100.82 },
];


export function roundUp(value, step = quoteParameters.roundTo) {
  const numeric = Number(value || 0);
  const roundStep = Number(step || 1);
  return Math.ceil(numeric / roundStep) * roundStep;
}

export function calculateQuotePricing({ materialLines = [], laborLines = [], directExtras = [], parameters = quoteParameters }) {
  const materials = materialLines.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitCost || 0), 0);
  const labor = laborLines.reduce((total, line) => total + Number(line.hours || 0) * Number(line.hourCost || 0), 0);
  const extras = directExtras.reduce((total, line) => total + Number(line.quantity || 0) * Number(line.unitCost || 0), 0);
  const directSubtotal = materials + labor + extras;
  const overhead = directSubtotal * Number(parameters.adminOverhead || 0);
  const contingency = directSubtotal * Number(parameters.technicalContingency || 0);
  const costBeforeProfit = directSubtotal + overhead + contingency;
  const profit = costBeforeProfit * Number(parameters.targetProfit || 0);
  const subtotalBeforeTax = costBeforeProfit + profit;
  const iibb = subtotalBeforeTax * Number(parameters.iibb || 0);
  const taxableSubtotal = subtotalBeforeTax + iibb;
  const iva = taxableSubtotal * Number(parameters.iva || 0);
  const total = taxableSubtotal + iva;

  return {
    materials,
    labor,
    extras,
    directSubtotal,
    overhead,
    contingency,
    costBeforeProfit,
    profit,
    subtotalBeforeTax,
    iibb,
    taxableSubtotal,
    iva,
    total,
    roundedTotal: roundUp(total, parameters.roundTo),
    marginOnSaleWithoutIva: taxableSubtotal ? profit / taxableSubtotal : 0,
  };
}
