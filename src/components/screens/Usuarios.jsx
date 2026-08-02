import { useState, useEffect } from "react";
import { Button, Badge, Panel, Field, TextInput, Select, StatCard, SectionTitle, DataTable, SearchBar } from "../ui";
import { formatDate } from "../../lib/utils";
import { userRoles, accountStatuses, screensForRole } from "../../lib/navigation";

export function Usuarios({ userProfiles, companies, currentProfile, onCreateUserProfile, onUpdateUserProfile, onRefreshUsers }) {
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", email: "", password: "", role: "ventas", status: "active", companyName: "" });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [menuDraft, setMenuDraft] = useState([]);
  const filtered = userProfiles.filter((user) => `${user.fullName} ${user.role} ${user.status} ${user.companyName || ""}`.toLowerCase().includes(query.toLowerCase()));
  const selectedUser = userProfiles.find((user) => user.id === selectedUserId) || filtered[0] || null;
  const selectedRoleScreens = selectedUser ? screensForRole(selectedUser.role) : [];
  const statusTone = {
    active: "green",
    pending: "amber",
    suspended: "red",
  };

  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserId("");
      setMenuDraft([]);
      return;
    }
    if (selectedUser.id !== selectedUserId) setSelectedUserId(selectedUser.id);
    setMenuDraft(Array.isArray(selectedUser.menuKeys) && selectedUser.menuKeys.length ? selectedUser.menuKeys : selectedRoleScreens.map((screen) => screen.key));
  }, [selectedUserId, selectedUser?.id, selectedUser?.role, selectedUser?.menuKeys?.join("|")]);

  async function updateProfile(user, patch) {
    if (user.id === currentProfile?.id && patch.status && patch.status !== "active") {
      setMessage("No podes suspender tu propia cuenta administradora.");
      return;
    }

    try {
      await onUpdateUserProfile(user.id, patch);
      setMessage("Usuario actualizado.");
    } catch (error) {
      setMessage(error.message || "No se pudo actualizar el usuario.");
    }
  }

  function toggleMenuKey(key) {
    setMenuDraft((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function saveUserMenu() {
    if (!selectedUser) return;
    const allowedKeys = new Set(selectedRoleScreens.map((screen) => screen.key));
    let nextKeys = menuDraft.filter((key) => allowedKeys.has(key));

    if (selectedUser.id === currentProfile?.id && selectedUser.role === "admin" && !nextKeys.includes("usuarios")) {
      nextKeys = [...nextKeys, "usuarios"];
      setMessage("Se mantuvo Usuarios activo para que no pierdas acceso a tu administracion.");
    }

    try {
      await onUpdateUserProfile(selectedUser.id, { menuKeys: nextKeys });
      setMessage("Menu del usuario actualizado.");
    } catch (error) {
      setMessage(error.message || "No se pudo guardar el menu del usuario.");
    }
  }

  async function resetUserMenu() {
    if (!selectedUser) return;

    try {
      await onUpdateUserProfile(selectedUser.id, { menuKeys: [] });
      setMessage("Menu restablecido segun el rol.");
    } catch (error) {
      setMessage(error.message || "No se pudo restablecer el menu.");
    }
  }

  async function createUser(event) {
    event.preventDefault();
    setCreating(true);
    setMessage("");

    try {
      await onCreateUserProfile(newUser);
      setNewUser({ fullName: "", email: "", password: "", role: "ventas", status: "active", companyName: "" });
      setMessage("Usuario creado.");
    } catch (error) {
      setMessage(error.message || "No se pudo crear el usuario.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-5 p-4 md:p-6">
      <SectionTitle title="Usuarios" subtitle="Alta operativa, roles y estado de cuentas" action="Actualizar" onAction={onRefreshUsers} />
      <Panel className="p-4">
        <SectionTitle title="Crear usuario" subtitle="Alta directa para personal autorizado" />
        <form onSubmit={createUser} className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1.3fr_1fr_1fr_1fr_1.2fr_auto] lg:items-end">
          <Field label="Nombre">
            <TextInput required value={newUser.fullName} onChange={(event) => setNewUser({ ...newUser, fullName: event.target.value })} placeholder="Nombre y apellido" />
          </Field>
          <Field label="Email">
            <TextInput type="email" required value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} placeholder="usuario@bizon.com" />
          </Field>
          <Field label="Password">
            <TextInput type="password" required minLength={6} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} placeholder="Min. 6" />
          </Field>
          <Field label="Rol">
            <Select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}>
              {userRoles.map((role) => <option key={role}>{role}</option>)}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={newUser.status} onChange={(event) => setNewUser({ ...newUser, status: event.target.value })}>
              {accountStatuses.map((status) => <option key={status}>{status}</option>)}
            </Select>
          </Field>
          <Field label="Empresa cliente">
            <Select value={newUser.companyName} onChange={(event) => setNewUser({ ...newUser, companyName: event.target.value })}>
              <option value="">Sin empresa</option>
              {companies.map((company) => <option key={company.id} value={company.name}>{company.name}</option>)}
            </Select>
          </Field>
          <Button type="submit">{creating ? "Creando..." : "Crear"}</Button>
        </form>
      </Panel>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Activos" value={userProfiles.filter((item) => item.status === "active").length} subtitle="Pueden operar el ERP" tone="green" />
        <StatCard title="Pendientes" value={userProfiles.filter((item) => item.status === "pending").length} subtitle="Esperan aprobacion admin" tone="amber" />
        <StatCard title="Suspendidos" value={userProfiles.filter((item) => item.status === "suspended").length} subtitle="Acceso operativo bloqueado" tone="red" />
      </div>
      <SearchBar value={query} onChange={setQuery} placeholder="Buscar usuario, rol o estado" />
      {message && <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">{message}</p>}
      <DataTable
        headers={["Usuario", "Rol", "Empresa", "Estado", "Menu", "Creado", "Acciones"]}
        rows={filtered.map((user) => [
          <TextInput value={user.fullName} onChange={(event) => updateProfile(user, { fullName: event.target.value })} />,
          <Select value={user.role} onChange={(event) => updateProfile(user, { role: event.target.value })}>
            {userRoles.map((role) => <option key={role}>{role}</option>)}
          </Select>,
          <Select value={user.companyName || ""} onChange={(event) => updateProfile(user, { companyName: event.target.value })}>
            <option value="">Sin empresa</option>
            {companies.map((company) => <option key={company.id} value={company.name}>{company.name}</option>)}
          </Select>,
          <div className="grid gap-2">
            <Badge tone={statusTone[user.status] || "zinc"}>{user.status}</Badge>
            <Select value={user.status} onChange={(event) => updateProfile(user, { status: event.target.value })}>
              {accountStatuses.map((status) => <option key={status}>{status}</option>)}
            </Select>
          </div>,
          <div className="grid gap-2">
            <Badge tone={Array.isArray(user.menuKeys) && user.menuKeys.length ? "blue" : "zinc"}>
              {Array.isArray(user.menuKeys) && user.menuKeys.length ? `${user.menuKeys.length} modulos` : "Por rol"}
            </Badge>
            <Button variant="ghost" onClick={() => setSelectedUserId(user.id)}>Administrar</Button>
          </div>,
          formatDate(user.createdAt),
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => updateProfile(user, { status: "active" })}>Activar</Button>
            <Button variant="danger" onClick={() => updateProfile(user, { status: "suspended" })}>Baja</Button>
          </div>,
        ])}
        empty="No hay usuarios para mostrar"
      />
      {selectedUser && (
        <Panel className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionTitle
              title="Administracion de menu"
              subtitle={`${selectedUser.fullName} - ${selectedUser.role}`}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={resetUserMenu}>Usar menu por rol</Button>
              <Button onClick={saveUserMenu}>Guardar menu</Button>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {selectedRoleScreens.map((screen) => (
              <label key={screen.key} className="flex min-h-11 items-center gap-3 rounded-lg border border-[#e6e6e2] bg-white px-3 py-2 text-sm font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={menuDraft.includes(screen.key)}
                  onChange={() => toggleMenuKey(screen.key)}
                  disabled={selectedUser.id === currentProfile?.id && screen.key === "usuarios"}
                  className="h-4 w-4 accent-[#ff7900]"
                />
                <span>{screen.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">Si no se guarda una configuracion personalizada, el usuario ve automaticamente todos los modulos habilitados para su rol.</p>
        </Panel>
      )}
    </div>
  );
}
