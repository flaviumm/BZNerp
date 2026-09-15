# Rediseño ERP — Fase 3c (últimos hex neutros/semánticos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el barrido de tokens: reemplazar los 9 fragmentos hex neutros/semánticos que quedan fuera de las exclusiones acordadas (4 archivos), dejando la app sin hex neutro hardcodeado.

**Architecture:** Reemplazo de fragmento hex → `var(--token)` línea por línea (una task batcheada). Los tokens están declarados en `index.html` `:root` desde la fase 3a. Brand y tintes tienen otros valores y no se ven afectados; el conteo de `#ff7900` por archivo es el invariante.

**Tech Stack:** React 19 + Vite 7, Tailwind vía CDN Play. Sin dependencias nuevas.

**Spec:** diseño corto aprobado en conversación (fase acotada).

## Global Constraints

- No tocar el color de marca ni sus tintes (`#ff7900`, `#d85f00`, …). En `Operacion.jsx` L22 el `#d85f00` de la misma línea queda intacto.
- No tocar ningún `#050505`.
- No tocar `src/lib/utils.js`, `Cotizador.jsx` (su `#52525b` está en HTML de impresión), `src/components/CaptadorLeads.jsx`, `src/main.jsx`, `src/components/ui/index.jsx` (lo que queda ahí son rellenos de gráficos y una paleta de estado, decisión aparte).
- Solo cambia el fragmento hex; el resto de cada línea queda byte-idéntico. Clases `zinc-*`/`white` no se tocan.
- No agregar frameworks de testing ni dependencias.

---

### Task 1: Los 9 reemplazos restantes

**Files:**
- Modify: `src/components/screens/Operacion.jsx`
- Modify: `src/components/screens/ProcesoVentas.jsx`
- Modify: `src/components/screens/Usuarios.jsx`
- Modify: `mini_erp_bizon_prototipo.jsx`

**Interfaces:**
- Consumes: `--border`, `--surface`, `--surface-alt`, `--danger` (definidos en `index.html`).
- No produce nada.

- [ ] **Step 1: Registrar el estado inicial**

Run: `grep -n "#ececf0\|#fafaf8\|#b42318" src/components/screens/Operacion.jsx`
Expected: 5 líneas (22, 39, 43, 47, 51):
```
22:          const marginTone = order.margin < 30 ? "text-[#b42318]" : "text-[#d85f00]";
39:                <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
43:                <div className="rounded-xl border border-[#ececf0] bg-[#fafaf8] p-3">
47:                <div className="rounded-xl border border-[#ececf0] bg-white p-3">
51:                <div className="rounded-xl border border-[#ececf0] bg-white p-3">
```

Run: `grep -n "#f9f8f6\|#fafaf9" src/components/screens/ProcesoVentas.jsx` → 2 líneas (6 y 192).
Run: `grep -n "#f6f6f4" mini_erp_bizon_prototipo.jsx` → 1 línea (729).
Run: `grep -n "#e6e6e2" src/components/screens/Usuarios.jsx` → 1 línea (181).
Run: `grep -c "#ff7900" src/components/screens/Operacion.jsx src/components/screens/ProcesoVentas.jsx src/components/screens/Usuarios.jsx mini_erp_bizon_prototipo.jsx` → anotar los 4 números (invariante).
Run: `grep -c "#d85f00" src/components/screens/Operacion.jsx` → anotar (invariante).

- [ ] **Step 2: Aplicar los reemplazos (replace-all del fragmento hex, por archivo)**

`src/components/screens/Operacion.jsx`:
- `#b42318` → `var(--danger)` (1, L22; el `#d85f00` de esa línea no se toca)
- `#ececf0` → `var(--border)` (4)
- `#fafaf8` → `var(--surface)` (2)

`src/components/screens/ProcesoVentas.jsx`:
- `#f9f8f6` → `var(--surface)` (1, L6)
- `#fafaf9` → `var(--surface)` (1, L192)

`mini_erp_bizon_prototipo.jsx`:
- `#f6f6f4` → `var(--surface-alt)` (1, L729: queda `bg-[var(--surface-alt)]`)

`src/components/screens/Usuarios.jsx`:
- `#e6e6e2` → `var(--border)` (1, L181)

- [ ] **Step 3: Confirmar el resultado**

Run: los 4 greps de hex de Step 1 → todos sin resultados.
Run: los `grep -c "#ff7900"` y `grep -c "#d85f00"` de Step 1 → mismos números.
Run: `grep -rn "#ececf0\|#fafaf8\|#fbfbf8\|#f5f5f3\|#f6f6f4\|#f9f8f6\|#fafaf9\|#e6e6e2\|#eeeeec\|#e4e4de\|#f0f0ed\|#ecece6\|#e4e4de\|#b42318\|#0f766e" src/components/screens mini_erp_bizon_prototipo.jsx`
Expected: sin resultados (barrido completo en pantallas y shell; `ui/index.jsx`, `utils.js`, `CaptadorLeads.jsx`, `main.jsx` quedan fuera a propósito).

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/components/screens/Operacion.jsx src/components/screens/ProcesoVentas.jsx src/components/screens/Usuarios.jsx mini_erp_bizon_prototipo.jsx
git commit -m "style: tokenize the last neutral and semantic hex in screens and app canvas"
```

---

## Verificación visual (la corre el controlador al final, con Edge headless)

Dashboard en modo demo: el canvas de la app (`mini_erp_bizon_prototipo.jsx:729`) ahora es `--surface-alt`, 1 unidad más claro que antes — debe verse igual que la captura de 3b.
