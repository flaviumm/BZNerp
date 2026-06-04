import React from "react";
import { createRoot } from "react-dom/client";
import MiniErpBizonPrototype from "../mini_erp_bizon_prototipo.jsx";

function AppFallback({ title = "No se pudo cargar el ERP", detail }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f5f3", padding: 16, fontFamily: "Inter, system-ui, sans-serif" }}>
      <section style={{ width: "100%", maxWidth: 520, border: "1px solid #ececf0", borderRadius: 18, background: "white", padding: 24, boxShadow: "0 18px 45px rgba(15,23,42,0.05)" }}>
        <img src="/brand/isotipo_bizon.png" alt="Bizon" style={{ width: 56, height: 56, objectFit: "contain", background: "#000", borderRadius: 10, padding: 4, marginBottom: 16 }} />
        <p style={{ margin: 0, color: "#ff7900", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Bizon ERP Industrial</p>
        <h1 style={{ margin: "6px 0 8px", color: "#09090b", fontSize: 24, fontWeight: 700 }}>{title}</h1>
        <p style={{ margin: 0, color: "#52525b", fontSize: 14 }}>Actualizá la página. Si vuelve a pasar, cerrá sesión o borrá los datos del sitio para renovar la sesión local.</p>
        {detail && <pre style={{ marginTop: 14, whiteSpace: "pre-wrap", color: "#991b1b", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: 12, fontSize: 12 }}>{detail}</pre>}
      </section>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error renderizando Bizon ERP:", error, info);
  }

  render() {
    if (this.state.error) {
      return <AppFallback detail={this.state.error?.message || String(this.state.error)} />;
    }

    return this.props.children;
  }
}

try {
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ErrorBoundary>
        <MiniErpBizonPrototype />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error("No se pudo iniciar Bizon ERP:", error);
  createRoot(document.getElementById("root")).render(<AppFallback detail={error?.message || String(error)} />);
}
