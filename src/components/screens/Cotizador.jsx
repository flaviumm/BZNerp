import { useState, useEffect } from "react";
import { Button, Badge, Panel, Field, TextInput, Select, TextArea, SectionTitle } from "../ui";
import { money, quoteLineTotal, catalogPrice, htmlEscape, openQuotePdfWindow, generateQuotePdf, normalizeKey, addDaysIso } from "../../lib/utils";
import { companyContacts } from "../../lib/companyUtils";
import { laborRates, materialPriceCatalog, quoteParameters } from "../../lib/pricingData";

export function Cotizador({ companies, setCompanies, quotes, setQuotes, persistRecord, getDocumentNumber }) {
  const defaultValidUntil = addDaysIso(quoteParameters.offerValidityDays || 7);
  const [clientMode, setClientMode] = useState("existing");
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.name || "");
  const [clientDetails, setClientDetails] = useState({ name: companies[0]?.name || "", taxId: "", contact: companies[0]?.contact || "", phone: companies[0]?.phone || "", email: "", address: "" });
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [lineItems, setLineItems] = useState([]);
  const [materialQuery, setMaterialQuery] = useState("");
  const [materialProvider, setMaterialProvider] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState(1);
  const [jobTitle, setJobTitle] = useState("");
  const [laborAgreement, setLaborAgreement] = useState("");
  const [selectedLaborId, setSelectedLaborId] = useState(laborRates[0]?.id || "");
  const [laborHours, setLaborHours] = useState(1);
  const [laborDescription, setLaborDescription] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [saving, setSaving] = useState(false);

  const filteredMaterials = materialQuery.trim().length < 2 ? [] : materialPriceCatalog
    .filter((item) => (!materialProvider || item.provider === materialProvider) &&
      `${item.name} ${item.category} ${item.spec} ${item.provider} ${item.sku} ${item.brand}`.toLowerCase().includes(materialQuery.toLowerCase()))
    .slice(0, 60);
  const selectedMaterial = materialPriceCatalog.find((item) => item.id === selectedMaterialId) || null;
  const selectedLabor = laborRates.find((item) => item.id === selectedLaborId) || null;
  const subtotal = lineItems.reduce((total, line) => total + quoteLineTotal(line), 0);
  const tax = Math.round(subtotal * Number(quoteParameters.iva || 0));
  const total = subtotal + tax;

  useEffect(() => {
    if (!selectedCompany && companies[0]?.name) {
      updateClientFromCompany(companies[0].name);
    }
  }, [companies, selectedCompany]);

  function updateClientFromCompany(name) {
    const company = companies.find((item) => item.name === name);
    setSelectedCompany(name);
    setClientDetails({
      name,
      taxId: "",
      contact: company?.contact || "",
      phone: company?.phone || "",
      email: companyContacts(company || {})[0]?.email || "",
      address: company?.city || "",
    });
  }

  function updateLine(index, patch) {
    setGeneratedQuote(null);
    setLineItems((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function addLine() {
    setGeneratedQuote(null);
    setLineItems((items) => [...items, { id: Date.now(), detail: "", quantity: 1, unitPrice: 0 }]);
  }

  function addTitleLine() {
    if (!titleInput.trim()) return;
    setGeneratedQuote(null);
    setLineItems((items) => [...items, { id: Date.now(), type: "title", detail: titleInput.trim() }]);
    setTitleInput("");
  }

  function removeLine(index) {
    setGeneratedQuote(null);
    setLineItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function addMaterialLine() {
    if (!selectedMaterial) return;
    const price = catalogPrice(selectedMaterial);
    const meta = {
      category: selectedMaterial.category || "",
      sku: selectedMaterial.sku || "",
      unit: selectedMaterial.unit || "",
      provider: selectedMaterial.provider || "",
      source: selectedMaterial.source || "",
      spec: selectedMaterial.spec || "",
    };
    const detail = [
      selectedMaterial.name,
      meta.spec,
      meta.unit ? `Unidad: ${meta.unit}` : "",
      meta.provider ? `Proveedor: ${meta.provider}` : "",
      meta.sku ? `SKU: ${meta.sku}` : "",
      `Precio base: ${money(price)}`,
    ].filter(Boolean).join(" - ");

    setGeneratedQuote(null);
    setLineItems((items) => [...items, {
      id: `mat-${selectedMaterial.id}-${Date.now()}`,
      type: "material",
      detail,
      quantity: Number(materialQuantity || 1),
      unitPrice: price,
      sourceId: selectedMaterial.id,
      meta,
    }]);
  }

  function addLaborLine() {
    if (!selectedLabor) return;
    const meta = {
      category: selectedLabor.category || "",
      agreement: selectedLabor.agreement || "",
      unit: "hora",
      provider: "Mano de obra Bizon",
      source: "Tarifario interno",
    };
    const detail = laborDescription.trim() || `${selectedLabor.trade} - ${selectedLabor.category} - ${selectedLabor.agreement}`;

    setGeneratedQuote(null);
    setLineItems((items) => [...items, {
      id: `labor-${selectedLabor.id}-${Date.now()}`,
      type: "labor",
      detail,
      quantity: Number(laborHours || 1),
      unitPrice: Number(selectedLabor.quoteHour || 0),
      sourceId: selectedLabor.id,
      meta,
    }]);
    setLaborDescription("");
  }

  function buildQuote(number) {
    const normalizedLines = lineItems.map((line) => ({
      detail: line.type === "title" ? (line.detail || "") : (line.detail || "Producto sin detalle"),
      quantity: line.type === "title" ? 0 : Number(line.quantity || 0),
      unitPrice: line.type === "title" ? 0 : Number(line.unitPrice || 0),
      total: quoteLineTotal(line),
      type: line.type || "manual",
      sourceId: line.sourceId || "",
      meta: line.meta || {},
    }));
    return {
      number,
      client: clientDetails.name || selectedCompany || "Cliente sin nombre",
      service: jobTitle.trim() || normalizedLines.find((l) => l.type !== "title")?.detail || "Presupuesto",
      subtotal,
      tax,
      total,
      status: "Borrador",
      validUntil,
      lineItems: normalizedLines,
      clientDetails,
    };
  }

  async function saveQuote({ openPdf = false, pdfWindow = null } = {}) {
    if (openPdf && generatedQuote) {
      generateQuotePdf(generatedQuote, pdfWindow);
      return generatedQuote;
    }

    setSaving(true);
    try {
      let companyName = clientDetails.name?.trim();
      if (clientMode === "new" && companyName && !companies.some((company) => normalizeKey(company.name) === normalizeKey(companyName))) {
        const record = {
          id: Date.now(),
          name: companyName,
          type: "Cliente",
          city: clientDetails.address || "Neuquen",
          status: "Prospecto",
          contact: clientDetails.contact || "Sin asignar",
          phone: clientDetails.phone || "-",
          contacts: [{ name: clientDetails.contact || "Sin asignar", role: "Principal", phone: clientDetails.phone || "-", email: clientDetails.email || "" }],
          next: "Seguimiento presupuesto",
          value: total,
        };
        setCompanies((items) => [...items, record]);
        await persistRecord("companies", record);
      }

      const number = await getDocumentNumber("quote", quotes, "P", 4);
      const quote = buildQuote(number);
      setQuotes((items) => [...items, quote]);
      await persistRecord("quotes", quote);
      setGeneratedQuote(quote);
      if (openPdf) generateQuotePdf(quote, pdfWindow);
      return quote;
    } catch (error) {
      if (pdfWindow && !pdfWindow.closed) {
        pdfWindow.document.open();
        pdfWindow.document.write(`
          <!doctype html>
          <html>
            <head><title>Error al generar presupuesto</title></head>
            <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#fff5f5;font-family:Arial,sans-serif;color:#991b1b">
              <div style="max-width:520px;padding:24px;border:1px solid #fecaca;border-radius:10px;background:white">
                <h1 style="margin:0 0 8px;font-size:22px">No se pudo generar el PDF</h1>
                <p style="margin:0;color:#52525b">${htmlEscape(error?.message || "Error desconocido")}</p>
              </div>
            </body>
          </html>
        `);
        pdfWindow.document.close();
      }
      throw error;
    } finally {
      setSaving(false);
    }
  }

  function handleGeneratePdf() {
    const pdfWindow = openQuotePdfWindow();
    saveQuote({ openPdf: true, pdfWindow }).catch((error) => {
      console.error("No se pudo generar el presupuesto PDF:", error);
    });
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Cotizador Bizon" subtitle="Armado de presupuesto con empresa, detalle de productos, cantidades, precios y PDF" />

      <Panel className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cliente">
              <Select value={clientMode} onChange={(event) => setClientMode(event.target.value)}>
                <option value="existing">Empresa cargada</option>
                <option value="new">Empresa nueva</option>
              </Select>
            </Field>
            {clientMode === "existing" ? (
              <Field label="Empresa">
                <Select value={selectedCompany} onChange={(event) => updateClientFromCompany(event.target.value)}>
                  {companies.map((company) => <option key={company.id || company.name} value={company.name}>{company.name}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="Empresa">
                <TextInput value={clientDetails.name} onChange={(event) => setClientDetails({ ...clientDetails, name: event.target.value })} placeholder="Razon social" />
              </Field>
            )}
            <Field label="CUIT"><TextInput value={clientDetails.taxId} onChange={(event) => setClientDetails({ ...clientDetails, taxId: event.target.value })} placeholder="30-00000000-0" /></Field>
            <Field label="Contacto"><TextInput value={clientDetails.contact} onChange={(event) => setClientDetails({ ...clientDetails, contact: event.target.value })} /></Field>
            <Field label="Telefono"><TextInput value={clientDetails.phone} onChange={(event) => setClientDetails({ ...clientDetails, phone: event.target.value })} /></Field>
            <Field label="Email"><TextInput type="email" value={clientDetails.email} onChange={(event) => setClientDetails({ ...clientDetails, email: event.target.value })} /></Field>
            <Field label="Direccion / ciudad"><TextInput value={clientDetails.address} onChange={(event) => setClientDetails({ ...clientDetails, address: event.target.value })} /></Field>
            <Field label="Valido hasta"><TextInput type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></Field>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-sm font-semibold text-[var(--text)]">Resumen</p>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between"><span>Numero</span><strong>{generatedQuote?.number || "Automatico"}</strong></div>
              <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="flex justify-between"><span>IVA</span><strong>{money(tax)}</strong></div>
              <div className="border-t border-[var(--border)] pt-2" />
              <div className="flex justify-between text-base text-[var(--text)]"><span>Total</span><strong>{money(total)}</strong></div>
            </div>
            {generatedQuote && <Badge tone="green">Generado {generatedQuote.number}</Badge>}
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="grid gap-4">
          <Field label="Nombre del trabajo (aparece en el PDF)">
            <TextInput
              value={jobTitle}
              onChange={(event) => { setGeneratedQuote(null); setJobTitle(event.target.value); }}
              placeholder="Ej. Estructura metalica para nave industrial"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_max-content] items-end">
            <Field label="Titulo de seccion">
              <TextInput
                value={titleInput}
                onChange={(event) => setTitleInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") addTitleLine(); }}
                placeholder="Ej. Materiales, Mano de obra, Trabajos de campo..."
              />
            </Field>
            <Button variant="ghost" onClick={addTitleLine}>Agregar titulo</Button>
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="grid gap-3">
            <SectionTitle title="Base de materiales" subtitle={`${materialPriceCatalog.length} materiales disponibles para agregar al detalle`} />
            <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_96px_max-content] md:items-end">
              <Field label="Proveedor">
                <Select value={materialProvider} onChange={(event) => { setMaterialProvider(event.target.value); setSelectedMaterialId(""); }}>
                  <option value="">Todos</option>
                  {["Carlos Isla", "Neucon", "Ferromundo"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Buscar material">
                <TextInput value={materialQuery} onChange={(event) => { setMaterialQuery(event.target.value); setSelectedMaterialId(""); }} placeholder="Nombre, categoría, SKU, marca…" />
              </Field>
              <Field label="Cantidad">
                <TextInput type="number" min="0" step="0.01" value={materialQuantity} onChange={(event) => setMaterialQuantity(event.target.value)} />
              </Field>
              <Button onClick={addMaterialLine} disabled={!selectedMaterial}>Agregar material</Button>
            </div>
            {filteredMaterials.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
                {filteredMaterials.map((item) => {
                  const isSelected = selectedMaterial?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedMaterialId(item.id)}
                      className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${isSelected ? "bg-zinc-900 text-white" : "bg-[var(--surface-raised)] hover:bg-[var(--surface)] text-[var(--text)]"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`shrink-0 w-12 h-12 rounded overflow-hidden flex items-center justify-center ${isSelected ? "bg-zinc-700" : "bg-[var(--surface)]"} ${item.imagen ? "cursor-zoom-in" : ""}`}
                          onClick={item.imagen ? (e) => { e.stopPropagation(); setLightboxImage({ src: item.imagen, name: item.name }); } : undefined}
                        >
                          {item.imagen
                            ? <img src={item.imagen} alt={item.name} className="w-full h-full object-contain" loading="lazy" onError={(e) => { e.target.style.display = "none"; }} />
                            : <span className="text-lg">{item.provider === "Carlos Isla" ? "🏗️" : item.provider === "Neucon" ? "🧱" : "🔧"}</span>
                          }
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold leading-snug truncate ${isSelected ? "text-white" : "text-[var(--text)]"}`}>{item.name}</p>
                          {item.spec && <p className={`text-xs mt-0.5 ${isSelected ? "text-[var(--text-muted)]" : "text-[var(--text-muted)]"}`}>{item.spec}</p>}
                          <p className={`text-xs mt-0.5 ${isSelected ? "text-[var(--text-muted)]" : "text-[var(--text-muted)]"}`}>
                            {[item.brand, item.sku, item.unit ? `Unidad: ${item.unit}` : null, item.provider].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-bold text-sm whitespace-nowrap ${isSelected ? "text-white" : "text-[var(--text)]"}`}>{money(catalogPrice(item))}</p>
                          {item.stock !== null && (
                            <p className={`text-xs mt-0.5 ${item.stock > 0 ? (isSelected ? "text-green-300" : "text-green-600") : (isSelected ? "text-red-300" : "text-red-500")}`}>
                              {item.stock > 0 ? `Stock: ${item.stock}` : "Sin stock"}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {materialQuery && filteredMaterials.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">Sin resultados para "{materialQuery}"</p>
            )}
          </div>

          <div className="grid gap-3">
            <SectionTitle title="Mano de obra" subtitle="Carga de horas por oficio con tarifa de cotizacion" />
            <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)_96px_max-content] md:items-end">
              <Field label="Convenio">
                <Select value={laborAgreement} onChange={(event) => { setLaborAgreement(event.target.value); setSelectedLaborId(""); }}>
                  <option value="">Todos</option>
                  {[...new Set(laborRates.map((r) => r.agreement))].map((ag) => (
                    <option key={ag} value={ag}>{ag}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Oficio">
                <Select value={selectedLaborId} onChange={(event) => setSelectedLaborId(event.target.value)}>
                  <option value="">Seleccionar oficio...</option>
                  {laborRates.filter((r) => !laborAgreement || r.agreement === laborAgreement).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.trade} - {money(item.quoteHour)}/h
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Horas">
                <TextInput type="number" min="0" step="0.25" value={laborHours} onChange={(event) => setLaborHours(event.target.value)} />
              </Field>
              <Button onClick={addLaborLine} disabled={!selectedLabor}>Agregar horas</Button>
            </div>
            <Field label="Descripcion del trabajo cotizado">
              <TextArea
                value={laborDescription}
                onChange={(event) => setLaborDescription(event.target.value)}
                placeholder="Ej. Soldadura de estructura metalica, corte y preparacion de materiales..."
              />
            </Field>
            {selectedLabor && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-muted)]">
                <p className="font-semibold text-[var(--text)]">{selectedLabor.trade}</p>
                <p>{selectedLabor.category}</p>
                <p className="mt-1">Convenio: {selectedLabor.agreement} · Tarifa: <strong>{money(selectedLabor.quoteHour)}/h</strong></p>
                {selectedLabor.baseHour && selectedLabor.quoteHour !== selectedLabor.baseHour && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">Base: {money(selectedLabor.baseHour)}/h + 40% costo laboral + 30% ganancia</p>
                )}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 md:flex-row md:items-center md:justify-between">
          <SectionTitle title="Detalle de productos" subtitle="Columnas de producto, cantidad, precio unitario y precio total" />
          <Button onClick={addLine}>Agregar renglon</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="bg-[var(--surface)] text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Detalle del producto</th>
                <th className="w-[150px] px-4 py-3">Cantidad</th>
                <th className="w-[180px] px-4 py-3 text-right">Precio unitario</th>
                <th className="w-[180px] px-4 py-3 text-right">Precio total</th>
                <th className="w-[100px] px-4 py-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {lineItems.map((line, index) => {
                if (line.type === "title") {
                  return (
                    <tr key={line.id || index} className="bg-[var(--surface)]">
                      <td className="px-4 py-3" colSpan={4}>
                        <TextInput
                          value={line.detail}
                          onChange={(event) => updateLine(index, { detail: event.target.value })}
                          placeholder="Titulo de seccion (ej. Materiales, Mano de obra...)"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="danger" onClick={() => removeLine(index)}>Quitar</Button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={line.id || index} className="align-top">
                    <td className="px-4 py-4">
                      <TextInput value={line.detail} onChange={(event) => updateLine(index, { detail: event.target.value })} placeholder="Producto, trabajo o servicio cotizado" />
                      {(line.meta?.unit || line.meta?.provider || line.meta?.sku || line.meta?.source || line.meta?.spec) && (
                        <div className="mt-2 grid gap-1 text-xs font-medium text-[var(--text-muted)]">
                          {line.meta?.spec && <p>{line.meta.spec}</p>}
                          <p>
                            {[
                              line.meta?.unit ? `Unidad: ${line.meta.unit}` : "",
                              line.meta?.provider ? `Proveedor: ${line.meta.provider}` : "",
                              line.meta?.sku ? `SKU: ${line.meta.sku}` : "",
                              line.meta?.source ? `Base: ${line.meta.source}` : "",
                            ].filter(Boolean).join(" | ")}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <TextInput type="number" min="0" step="0.01" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} />
                    </td>
                    <td className="px-4 py-4">
                      <TextInput type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-base font-semibold text-[var(--text)]">{money(quoteLineTotal(line))}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button variant="danger" onClick={() => removeLine(index)}>Quitar</Button>
                    </td>
                  </tr>
                );
              })}
              {!lineItems.length && (
                <tr>
                  <td className="px-4 py-6 text-sm text-[var(--text-muted)]" colSpan={5}>
                    Agrega materiales desde la base, horas de mano de obra o un renglon manual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <p className="text-sm text-[var(--text-muted)]">Revisar el detalle, generar la numeracion automatica y abrir el PDF del presupuesto.</p>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <Button onClick={handleGeneratePdf} disabled={saving || !total}>{saving ? "Generando..." : "Generar presupuesto PDF"}</Button>
            {generatedQuote && <Button variant="ghost" onClick={() => generateQuotePdf(generatedQuote)}>Reimprimir PDF</Button>}
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--text-muted)]">La numeracion se asigna automaticamente al generar el PDF usando el contador de Presupuestos.</p>
      </Panel>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-xl w-full bg-[var(--surface-raised)] rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <p className="text-sm font-semibold text-[var(--text)] truncate pr-4">{lightboxImage.name}</p>
              <button
                onClick={() => setLightboxImage(null)}
                className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none"
              >✕</button>
            </div>
            <div className="flex items-center justify-center bg-[var(--surface)] p-6 min-h-[280px]">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.name}
                className="max-h-72 max-w-full object-contain"
                onError={(e) => { e.target.src = ""; e.target.alt = "Sin imagen"; }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
