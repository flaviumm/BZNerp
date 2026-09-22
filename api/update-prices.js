// Boton "Actualizar precios" del ERP: dispara el workflow .github/workflows/precios.yml.
// Solo admins / super admins logueados. Requiere GITHUB_TOKEN (PAT con actions:write
// sobre flaviumm/BZNerp) en las variables de entorno de Vercel.
const REPO = "flaviumm/BZNerp";
const WORKFLOW = "precios.yml";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Metodo no permitido" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  if (!supabaseUrl || !anonKey) return res.status(500).json({ error: "Supabase no configurado en el servidor." });
  if (!githubToken) return res.status(500).json({ error: "GITHUB_TOKEN no configurado en Vercel." });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sin sesion." });

  // RLS deja que cada usuario lea su propio perfil; con eso alcanza para chequear el rol.
  const headers = { apikey: anonKey, Authorization: `Bearer ${token}` };
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers });
  if (!userRes.ok) return res.status(401).json({ error: "Sesion invalida." });
  const { id } = await userRes.json();
  const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${id}&select=role,is_super_admin`, { headers });
  const [profile] = profileRes.ok ? await profileRes.json() : [];
  if (!profile || (profile.role !== "admin" && !profile.is_super_admin)) {
    return res.status(403).json({ error: "Solo un admin puede actualizar precios." });
  }

  const gh = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "bizon-erp",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (gh.status !== 204) return res.status(502).json({ error: `GitHub respondio ${gh.status}: ${await gh.text()}` });

  return res.status(202).json({ ok: true, runsUrl: `https://github.com/${REPO}/actions/workflows/${WORKFLOW}` });
}
