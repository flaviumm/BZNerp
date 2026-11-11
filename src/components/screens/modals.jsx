import { useState } from "react";
import { Button, Field, TextInput, Select, TextArea } from "../ui";
import { initialCompanyForm, companyRecordFromForm } from "../../lib/companyUtils";
import { screens } from "../../lib/navigation";

// Campos del alta rapida por pantalla. Tipo "company" = selector de clientes cargados.
const createFields = {
  crm: [
    ["name", "Empresa", "company"],
    ["detail", "Servicio / oportunidad"],
    ["amount", "Importe estimado", "number"],
  ],
  ot: [
    ["client", "Cliente", "company"],
    ["service", "Servicio / trabajo"],
    ["team", "Equipo asignado"],
    ["start", "Inicio", "date"],
    ["end", "Entrega", "date"],
    ["margin", "Margen %", "number"],
  ],
  tareas: [
    ["text", "Tarea"],
    ["owner", "Responsable"],
    ["priority", "Prioridad", "select", ["Alta", "Media", "Baja"]],
    ["due", "Vencimiento", "date"],
    ["notes", "Notas"],
  ],
};

function FieldInput({ type = "text", value, onChange, options = [], companies = [], disabled }) {
  if (type === "select") {
    return <Select value={value} onChange={onChange} disabled={disabled}>{options.map((option) => <option key={option}>{option}</option>)}</Select>;
  }
  if (type === "company") {
    return (
      <>
        <TextInput list="erp-company-names" required value={value} onChange={onChange} placeholder="Elegir o escribir" />
        <datalist id="erp-company-names">{companies.map((company) => <option key={company.id} value={company.name} />)}</datalist>
      </>
    );
  }
  return <TextInput type={type} value={value} onChange={onChange} disabled={disabled} />;
}

export function NewRecordModal({ active, data, onClose, onCreate }) {
  const fields = createFields[active] || [];
  const [form, setForm] = useState(() => Object.fromEntries(fields.map(([key, , type, options]) => [key, type === "select" ? options[1] || options[0] : ""])));
  const [companyForm, setCompanyForm] = useState(() => initialCompanyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const title = `Nuevo registro - ${screens.find((item) => item.key === active)?.label || "ERP"}`;

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onCreate(active, active === "clientes" ? companyForm : form);
      onClose();
    } catch (submitError) {
      setError(submitError.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-4">
      <form onSubmit={submit} className={`max-h-[92vh] w-full overflow-y-auto rounded-lg bg-[var(--surface-raised)] p-5 shadow-xl ${active === "clientes" ? "max-w-5xl" : "max-w-lg"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{active === "clientes" ? "Ficha completa de empresa, datos comerciales y contacto principal." : "Alta rapida para alimentar el modulo actual."}</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        {active === "clientes" ? (
          <CompanyFormFields form={companyForm} setForm={setCompanyForm} />
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {fields.map(([key, label, type = "text", options], index) => (
              <Field key={key} label={label}>
                <FieldInput
                  type={type}
                  value={form[key] ?? ""}
                  options={options}
                  companies={data.companies}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              </Field>
            ))}
          </div>
        )}
        {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Guardando..." : active === "clientes" ? "Guardar empresa" : "Crear"}</Button>
        </div>
      </form>
    </div>
  );
}

export function CompanyFormFields({ form, setForm }) {
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="mt-5 grid gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Nombre de empresa"><TextInput required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Razon social o nombre comercial" /></Field>
        <Field label="CUIT"><TextInput value={form.taxId} onChange={(event) => update("taxId", event.target.value)} placeholder="30-00000000-0" /></Field>
        <Field label="Rubro"><TextInput value={form.type} onChange={(event) => update("type", event.target.value)} placeholder="Industria, construccion, oil & gas" /></Field>
        <Field label="Tipo de cliente"><TextInput value={form.clientCategory} onChange={(event) => update("clientCategory", event.target.value)} placeholder="Cliente, prospecto, proveedor" /></Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Contacto"><TextInput value={form.contact} onChange={(event) => update("contact", event.target.value)} placeholder="Nombre y apellido" /></Field>
        <Field label="Cargo"><TextInput value={form.role} onChange={(event) => update("role", event.target.value)} placeholder="Compras, operaciones, gerencia" /></Field>
        <Field label="Telefonos"><TextArea value={form.phones} onChange={(event) => update("phones", event.target.value)} placeholder="Uno por linea o separados por coma" /></Field>
        <Field label="Mails"><TextArea value={form.emails} onChange={(event) => update("emails", event.target.value)} placeholder="contacto@empresa.com" /></Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Direccion"><TextInput value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Calle, numero, piso" /></Field>
        <Field label="Localidad"><TextInput value={form.locality} onChange={(event) => update("locality", event.target.value)} placeholder="Neuquen" /></Field>
        <Field label="Paginas web"><TextArea value={form.websites} onChange={(event) => update("websites", event.target.value)} placeholder="https://empresa.com" /></Field>
        <Field label="Redes sociales"><TextArea value={form.socialNetworks} onChange={(event) => update("socialNetworks", event.target.value)} placeholder="LinkedIn, Instagram, Facebook" /></Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Clientes / referencias"><TextArea value={form.clients} onChange={(event) => update("clients", event.target.value)} placeholder="Clientes, obras o referencias relevantes" /></Field>
        <Field label="Estado">
          <Select value={form.status} onChange={(event) => update("status", event.target.value)}>
            {["Prospecto", "Contactado", "Negociacion", "Activo", "Inactivo"].map((status) => <option key={status}>{status}</option>)}
          </Select>
        </Field>
        <Field label="Proxima accion"><TextArea value={form.next} onChange={(event) => update("next", event.target.value)} placeholder="Llamar, enviar presupuesto, agendar visita" /></Field>
        <Field label="Valor potencial"><TextInput type="number" value={form.value} onChange={(event) => update("value", event.target.value)} placeholder="0" /></Field>
      </div>

      <Field label="Notas"><TextArea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Observaciones comerciales, condiciones, origen del contacto" /></Field>
    </div>
  );
}

const editFields = {
  clientes: [
    ["name", "Empresa"],
    ["type", "Rubro"],
    ["city", "Localidad"],
    ["status", "Estado"],
    ["contact", "Contacto"],
    ["phone", "Telefono"],
    ["next", "Proxima accion"],
    ["value", "Valor potencial", "number"],
  ],
  crm: [
    ["company", "Empresa"],
    ["service", "Servicio"],
    ["stage", "Etapa"],
    ["amount", "Importe", "number"],
    ["probability", "Probabilidad", "number"],
    ["owner", "Responsable"],
    ["due", "Vencimiento", "date"],
  ],
  presupuestos: [
    ["number", "Numero"],
    ["client", "Cliente"],
    ["service", "Servicio"],
    ["subtotal", "Subtotal", "number"],
    ["tax", "IVA", "number"],
    ["total", "Total", "number"],
    ["status", "Estado"],
    ["validUntil", "Valido hasta", "date"],
  ],
  ot: [
    ["number", "Numero"],
    ["client", "Cliente", "company"],
    ["service", "Servicio"],
    ["status", "Estado", "select", ["Pendiente", "En ejecucion", "Terminada"]],
    ["progress", "Avance", "number"],
    ["margin", "Margen", "number"],
    ["start", "Inicio", "date"],
    ["end", "Fin", "date"],
    ["team", "Equipo"],
  ],
  tareas: [
    ["text", "Tarea"],
    ["owner", "Responsable"],
    ["priority", "Prioridad", "select", ["Alta", "Media", "Baja"]],
    ["due", "Vencimiento", "date"],
    ["eventType", "Tipo"],
    ["startTime", "Inicio", "time"],
    ["endTime", "Fin", "time"],
    ["notes", "Notas"],
  ],
};

export function EditRecordModal({ editTarget, data, onClose, onSave }) {
  const [form, setForm] = useState(editTarget.record);
  const [companyForm, setCompanyForm] = useState(() => initialCompanyForm(editTarget.module === "clientes" ? editTarget.record : null));
  const fields = editFields[editTarget.module] || [];
  const title = `Editar ${screens.find((item) => item.key === editTarget.module)?.label || "registro"}`;

  function submit(event) {
    event.preventDefault();
    onSave(editTarget.module, editTarget.module === "clientes" ? companyRecordFromForm(companyForm, editTarget.record) : form);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/50 p-4">
      <form onSubmit={submit} className={`max-h-[92vh] w-full overflow-y-auto rounded-lg bg-[var(--surface-raised)] p-5 shadow-xl ${editTarget.module === "clientes" ? "max-w-5xl" : "max-w-2xl"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Los cambios se guardan en Supabase si la base esta conectada.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        {editTarget.module === "clientes" ? (
          <CompanyFormFields form={companyForm} setForm={setCompanyForm} />
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {fields.map(([key, label, type = "text", options]) => (
              <Field key={key} label={label}>
                <FieldInput
                  type={type}
                  value={form[key] ?? ""}
                  options={options}
                  companies={data?.companies || []}
                  onChange={(event) => setForm({ ...form, [key]: type === "number" ? Number(event.target.value || 0) : event.target.value })}
                  disabled={["number", "sku"].includes(key)}
                />
              </Field>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </div>
  );
}
