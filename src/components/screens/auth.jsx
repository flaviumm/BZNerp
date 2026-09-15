import { useState } from "react";
import { Button, Panel, Field, TextInput } from "../ui";
import { signInWithEmail, signUpWithEmail } from "../../lib/authRepository";

export function LoginScreen({ onSessionReady }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const session = mode === "login"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password, fullName || email);

      if (session) {
        onSessionReady(session);
      } else {
        setMessage("Usuario creado. Revisar el email si Supabase exige confirmacion.");
      }
    } catch (error) {
      setMessage(error.message || "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--surface-alt)] p-4">
      <Panel className="w-full max-w-md p-5">
        <div className="mb-5">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="mb-4 h-14 w-14 rounded-lg bg-black object-contain p-1" />
          <p className="text-xs font-bold uppercase tracking-wide text-[#ff7900]">Bizon ERP Industrial</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950">{mode === "login" ? "Ingresar" : "Crear usuario"}</h1>
          <p className="mt-2 text-sm text-zinc-500">Acceso protegido por Supabase Auth y permisos por rol.</p>
        </div>

        <form onSubmit={submit} className="grid gap-3">
          {mode === "signup" && (
            <Field label="Nombre">
              <TextInput value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nombre y apellido" />
            </Field>
          )}
          <Field label="Email">
            <TextInput type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="usuario@bizon.com" />
          </Field>
          <Field label="Password">
            <TextInput type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimo 6 caracteres" />
          </Field>
          {message && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}
          <Button type="submit">{loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}</Button>
        </form>

        <div className="mt-4">
          <Button variant="ghost" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Crear usuario" : "Ya tengo usuario"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}

export function AccountStatusScreen({ profile, onSignOut }) {
  const status = profile?.status || "pending";
  const title = status === "suspended" ? "Cuenta suspendida" : "Cuenta pendiente";
  const detail = status === "suspended"
    ? "Un administrador debe reactivar esta cuenta para volver a operar."
    : "Un administrador debe activar tu cuenta y asignarte un rol antes de usar el ERP.";

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--surface-alt)] p-4">
      <Panel className="w-full max-w-md p-5">
        <div className="mb-5">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="mb-4 h-14 w-14 rounded-lg bg-black object-contain p-1" />
          <p className="text-xs font-bold uppercase tracking-wide text-[#ff7900]">Bizon ERP Industrial</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{detail}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-zinc-700">
          <p><strong>Usuario:</strong> {profile?.fullName || "Sin perfil"}</p>
          <p><strong>Estado:</strong> {status}</p>
        </div>
        <div className="mt-4">
          <Button variant="ghost" onClick={onSignOut}>Salir</Button>
        </div>
      </Panel>
    </div>
  );
}

export function DatabaseSetupScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--surface-alt)] p-4">
      <Panel className="w-full max-w-xl p-5">
        <div className="mb-5">
          <img src="/brand/isotipo_bizon.png" alt="Bizon" className="mb-4 h-14 w-14 rounded-lg bg-black object-contain p-1" />
          <p className="text-xs font-bold uppercase tracking-wide text-[#ff7900]">Bizon ERP Industrial</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-950">Configurar base real</h1>
          <p className="mt-2 text-sm text-zinc-500">Produccion requiere Supabase para habilitar login, roles y datos persistentes.</p>
        </div>
        <div className="grid gap-3 text-sm text-zinc-700">
          <p>Crear el proyecto en Supabase, ejecutar los SQL de la carpeta <strong>database</strong> y cargar estas variables en Vercel:</p>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs text-zinc-900">
            <p>VITE_SUPABASE_URL</p>
            <p>VITE_SUPABASE_ANON_KEY</p>
          </div>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">El modo demo queda bloqueado en produccion para evitar operar con datos locales por error.</p>
        </div>
      </Panel>
    </div>
  );
}
