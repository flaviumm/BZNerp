export const quotePricingSources = [
  {
    name: "Bizon materiales metalurgicos Neuquen",
    date: "2026-04-28",
    type: "excel",
    note: "Precios base de cotizacion. Confirmar medida, stock, envio e IVA antes de emitir oferta formal.",
  },
  {
    name: "Bizon cotizador trabajos metalurgicos",
    date: "2026-03",
    type: "excel",
    note: "Modelo: costo directo + indirectos + contingencia + ganancia + IIBB + IVA.",
  },
  {
    name: "AyC promedio materiales",
    date: "2022-10",
    type: "web-reference",
    url: "https://aycrevista.com.ar/precios-la-construccion/promedio-materiales/",
    note: "Referencia historica estimativa publicada por A&C; no reemplaza precio actualizado local.",
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
  { id: "soldador", trade: "Soldador", agreement: "UOM CCT 260/75", category: "Oficial Multiple / Oficial Superior CNC", baseHour: 6112.95, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 10414.49 },
  { id: "soldador-especializado", trade: "Soldador especializado", agreement: "UOM CCT 260/75", category: "Oficial Multiple Superior CNC", baseHour: 6541.35, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 11121.35 },
  { id: "electricista-taller", trade: "Electricista taller", agreement: "UOM CCT 260/75", category: "Oficial", baseHour: 5675.08, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 9692.01 },
  { id: "electricista-obra", trade: "Electricista obra", agreement: "UOCRA CCT 76/75", category: "Oficial - Lineas e Instalacion", baseHour: 5113, monthlyBonus: 134100, monthlyHours: 176, loadFactor: 0.65, quoteHour: 9693.64 },
  { id: "electricista-obra-especializado", trade: "Electricista obra especializado", agreement: "UOCRA CCT 76/75", category: "Oficial Especializado - Lineas e Instalacion", baseHour: 6279, monthlyBonus: 147000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 11738.48 },
  { id: "ayudante", trade: "Ayudante", agreement: "UOM CCT 260/75", category: "Medio Oficial", baseHour: 4796.27, monthlyBonus: 35000, monthlyHours: 176, loadFactor: 0.65, quoteHour: 8241.97 },
];

export const materialPriceCatalog = [
  { id: "nqn-hierro-torsionado-12m", source: "Bizon Excel NQN", category: "Hierros", name: "Hierro torsionado x 12 metros", spec: "Medidas diam. 6 a diam. 32; precio desde variante minima", unit: "barra", lengthM: 12, listPrice: 6296.13, transferPrice: 5666.52, basePrice: 5666.52, pricePerMeter: 472.21, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-hierro-liso-12m", source: "Bizon Excel NQN", category: "Hierros", name: "Hierro liso x 12 metros", spec: "Medidas diam. 6 a diam. 32; precio desde variante minima", unit: "barra", lengthM: 12, listPrice: 6644.23, transferPrice: 5979.81, basePrice: 5979.81, pricePerMeter: 498.32, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-cano-rectangular-6m", source: "Bizon Excel NQN", category: "Canos estructurales", name: "Cano estructural rectangular x 6 metros", spec: "Medidas 10x20 a 150x50 mm; esp. 1,25 a 6,35 mm", unit: "barra", lengthM: 6, listPrice: 16676.51, transferPrice: 15008.86, basePrice: 15008.86, pricePerMeter: 2501.48, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-cano-cuadrado-6m", source: "Bizon Excel NQN", category: "Canos estructurales", name: "Cano estructural cuadrado x 6 metros", spec: "Medidas 10x10 a 140x140 mm; esp. 0,90 a 6,35 mm", unit: "barra", lengthM: 6, listPrice: 10870.83, transferPrice: 9783.75, basePrice: 9783.75, pricePerMeter: 1630.63, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-cano-redondo-6m", source: "Bizon Excel NQN", category: "Canos estructurales", name: "Cano estructural redondo x 6 metros", spec: "Diametros 12,70 a 127,00 mm; esp. 1,25 a 6,35 mm", unit: "barra", lengthM: 6, listPrice: 10989.32, transferPrice: 9890.39, basePrice: 9890.39, pricePerMeter: 1648.4, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-angulos-6m", source: "Bizon Excel NQN", category: "Perfiles herrero", name: "Angulos", spec: "Medidas 1/2x1/8 a 4x5/16", unit: "barra", lengthM: 6, listPrice: 16748.92, transferPrice: 15074.03, basePrice: 15074.03, pricePerMeter: 2512.34, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-planchuela-6m", source: "Bizon Excel NQN", category: "Perfiles herrero", name: "Planchuela", spec: "Variantes multiples de ancho/espesor", unit: "barra", lengthM: 6, listPrice: 8279.3, transferPrice: 7451.37, basePrice: 7451.37, pricePerMeter: 1241.9, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-hierro-t-6m", source: "Bizon Excel NQN", category: "Perfiles herrero", name: "Hierro T herrero", spec: "Medidas 3/4x1/8 a 2x1/4", unit: "barra", lengthM: 6, listPrice: 27206.38, transferPrice: 24485.74, basePrice: 24485.74, pricePerMeter: 4080.96, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-cuadrado-macizo-6m", source: "Bizon Excel NQN", category: "Perfiles herrero", name: "Cuadrado macizo x 6 metros", spec: "Medidas 7,9 a 19,1 mm", unit: "barra", lengthM: 6, listPrice: 10872.1, transferPrice: 9784.89, basePrice: 9784.89, pricePerMeter: 1630.81, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-redondo-macizo-6m", source: "Bizon Excel NQN", category: "Perfiles herrero", name: "Redondo macizo x 6 metros", spec: "Medidas 7,9 a 19,1 mm", unit: "barra", lengthM: 6, listPrice: 8694.16, transferPrice: 7824.74, basePrice: 7824.74, pricePerMeter: 1304.12, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-chapa-canaleta-galv-27", source: "Bizon Excel NQN", category: "Chapas", name: "Chapa canaleta galvanizada N27", spec: "0,40 mm; largos 3 a 13 m", unit: "unidad", lengthM: 3, listPrice: 43964.94, transferPrice: 39568.45, basePrice: 39568.45, pricePerMeter: 13189.48, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-chapa-canaleta-galv-25", source: "Bizon Excel NQN", category: "Chapas", name: "Chapa canaleta galvanizada N25", spec: "0,50 mm; largos 3 a 13 m", unit: "unidad", lengthM: 3, listPrice: 51974.05, transferPrice: 46776.65, basePrice: 46776.65, pricePerMeter: 15592.22, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-chapa-lisa-negra", source: "Bizon Excel NQN", category: "Chapas", name: "Chapa lisa negra", spec: "Medidas 1,22x2,44 / 1,00x2,00; esp. 0,40 a 9,50 mm", unit: "hoja", lengthM: null, listPrice: 113490.88, transferPrice: 102141.79, basePrice: 102141.79, pricePerMeter: null, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-chapa-lisa-galvanizada", source: "Bizon Excel NQN", category: "Chapas", name: "Chapa lisa galvanizada", spec: "Medidas 1,22x2,44 / 1,00x2,00; esp. 0,30 a 2,00 mm", unit: "hoja", lengthM: null, listPrice: 165919.34, transferPrice: 149327.41, basePrice: 149327.41, pricePerMeter: null, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-malla-sima", source: "Bizon Excel NQN", category: "Mallas", name: "Mallas SIMA / construccion", spec: "Q liviana, Q131, Q188, Q335, Q524, Q754, R131", unit: "pano", lengthM: null, listPrice: 40750.03, transferPrice: 36675.03, basePrice: 36675.03, pricePerMeter: null, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-electrodo-conarco-250", source: "Bizon Excel NQN", category: "Consumibles soldadura", name: "Electrodo CONARCO-13 2,50 mm", spec: "Bolsa/caja x 1 kg", unit: "kg", lengthM: null, listPrice: 18411.59, transferPrice: 16570.43, basePrice: 16570.43, pricePerMeter: null, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-electrodo-conarco-325", source: "Bizon Excel NQN", category: "Consumibles soldadura", name: "Electrodo CONARCO-13 3,25 mm", spec: "Bolsa/caja x 1 kg", unit: "kg", lengthM: null, listPrice: 17821.13, transferPrice: 16039.02, basePrice: 16039.02, pricePerMeter: null, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-alambre-negro-14", source: "Bizon Excel NQN", category: "Alambres", name: "Alambre negro N14", spec: "2,03 mm x kg a granel", unit: "kg", lengthM: null, listPrice: 4539.48, transferPrice: 4085.53, basePrice: 4085.53, pricePerMeter: null, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-alambre-negro-17", source: "Bizon Excel NQN", category: "Alambres", name: "Alambre negro N17", spec: "1,42 mm x kg a granel", unit: "kg", lengthM: null, listPrice: 4725.43, transferPrice: 4252.89, basePrice: 4252.89, pricePerMeter: null, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "nqn-alambre-galvanizado-14", source: "Bizon Excel NQN", category: "Alambres", name: "Alambre galvanizado N14", spec: "2,03 mm x kg a granel", unit: "kg", lengthM: null, listPrice: 7117.63, transferPrice: 6405.87, basePrice: 6405.87, pricePerMeter: null, provider: "Carlos Isla", date: "2026-04-28" },
  { id: "ayc-acero-kg-prom", source: "AyC web", category: "Aceros referencia", name: "ACEROS kg/prom", spec: "Referencia historica A&C octubre 2022", unit: "kg", lengthM: null, listPrice: 290.5, transferPrice: null, basePrice: 351.5, pricePerMeter: null, provider: "AyC", date: "2022-10-01" },
  { id: "ayc-perfil-c-80", source: "AyC web", category: "Aceros referencia", name: "Perfil C 80 40 15 1,6 x 12", spec: "Referencia historica A&C octubre 2022", unit: "un", lengthM: 12, listPrice: 7427.05, transferPrice: null, basePrice: 8986.73, pricePerMeter: 748.89, provider: "AyC", date: "2022-10-01" },
  { id: "ayc-chapa-galv-acanalada-m2", source: "AyC web", category: "Chapas referencia", name: "Chapa galvanizada acanalada CAL 24", spec: "Referencia historica A&C octubre 2022", unit: "m2", lengthM: null, listPrice: 1410.19, transferPrice: null, basePrice: 1706.33, pricePerMeter: null, provider: "AyC", date: "2022-10-01" },
  { id: "ayc-alambre-negro-atar", source: "AyC web", category: "Alambres referencia", name: "Alambre negro atar 16", spec: "Referencia historica A&C octubre 2022", unit: "kg", lengthM: null, listPrice: 289.26, transferPrice: null, basePrice: 350, pricePerMeter: null, provider: "AyC", date: "2022-10-01" },
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
