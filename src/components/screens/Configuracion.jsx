import { useEffect, useState } from "react";
import { Button, Panel, Field, TextInput, SectionTitle } from "../ui";

const LOGO_SIZE = 256;

function resizeToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(LOGO_SIZE / image.width, LOGO_SIZE / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = url;
  });
}

export function Configuracion({ organization, onUpdateOrganization }) {
  const [name, setName] = useState(organization?.name || "");
  const [color, setColor] = useState(organization?.primaryColor || "#ff7900");
  const [logo, setLogo] = useState(organization?.logoDataUrl || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(organization?.name || "");
    setColor(organization?.primaryColor || "#ff7900");
    setLogo(organization?.logoDataUrl || null);
  }, [organization?.id]);

  async function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await resizeToDataUrl(file));
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onUpdateOrganization({ name: name.trim(), primaryColor: color, logoDataUrl: logo });
      setMessage("Configuracion guardada.");
    } catch (error) {
      setMessage(error.message || "No se pudo guardar la configuracion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Configuracion" subtitle="Nombre, color y logo de tu empresa" />
      <Panel className="p-5">
        <form onSubmit={save} className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="grid gap-4">
            <Field label="Nombre de la empresa">
              <TextInput required value={name} onChange={(event) => setName(event.target.value)} placeholder="Mi Empresa SA" />
            </Field>
            <Field label="Color principal">
              <div className="flex items-center gap-3">
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-9 w-14 cursor-pointer rounded-lg border border-[var(--border)] bg-white p-1" aria-label="Elegir color" />
                <TextInput value={color} onChange={(event) => setColor(event.target.value)} pattern="^#[0-9a-fA-F]{6}$" placeholder="#ff7900" />
                <span className="inline-flex h-9 items-center rounded-lg px-3 text-[11px] font-semibold text-black" style={{ background: color }}>Muestra</span>
              </div>
            </Field>
            <Field label="Logo">
              <input type="file" accept="image/*" onChange={handleLogo} className="block w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-zinc-700" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              {logo && <Button variant="ghost" onClick={() => setLogo(null)}>Quitar logo</Button>}
            </div>
            {message && <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-zinc-700">{message}</p>}
          </div>
          <div className="grid content-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Vista previa</p>
            <div className="flex items-center gap-3">
              {logo ? <img src={logo} alt="Logo" className="h-14 w-14 rounded-xl object-contain" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-black text-xs font-semibold text-white">Logo</div>}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{name || "Nombre de la empresa"}</p>
                <p className="text-sm font-semibold text-[var(--text)]">Asi se ve en el encabezado</p>
              </div>
            </div>
          </div>
        </form>
      </Panel>
    </div>
  );
}
