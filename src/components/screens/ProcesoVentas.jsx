import { useState } from "react";
import { Badge, Panel } from "../ui";

export function ScriptBox({ boxId, text, copied, onCopy }) {
  return (
    <div className="relative mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <button
        type="button"
        onClick={() => onCopy(text, boxId)}
        className="absolute right-3 top-3 rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-[11px] font-semibold text-zinc-600 transition hover:border-[#ff7900] hover:text-[#ff7900]"
      >
        {copied === boxId ? "Copiado ✓" : "Copiar"}
      </button>
      <pre className="mr-16 whitespace-pre-wrap font-[inherit] text-[13px] leading-relaxed text-zinc-700">{text}</pre>
    </div>
  );
}

export function ProcesoVentas() {
  const [copied, setCopied] = useState(null);

  function copyText(text, id) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const box = (id, text) => <ScriptBox key={id} boxId={id} text={text} copied={copied} onCopy={copyText} />;

  const processSteps = [
    { stage: "Etapa 1", title: "Preparar contacto", desc: "Identificar empresa, rubro, contacto probable y posible necesidad.", meta: "Meta: evitar mensaje genérico.", decision: false },
    { stage: "Etapa 2", title: "Primer WhatsApp", desc: "Mensaje corto, claro y profesional. Pedir contacto correcto o permiso para presentar servicios.", meta: "Meta: lograr respuesta.", decision: false },
    { stage: "Decisión", title: "¿Responde?", desc: "Sí: clasificar necesidad. No: seguimiento cada 2 a 5 días.", meta: "Meta: no quemar el contacto.", decision: true },
    { stage: "Etapa 3", title: "Diagnóstico", desc: "Preguntar si tercerizan, qué necesitan y quién decide.", meta: "Meta: detectar oportunidad real.", decision: false },
    { stage: "Etapa 4", title: "Valor", desc: "Presentar a Bizon como solución técnica seria, disponible y capaz.", meta: "Meta: diferenciarte.", decision: false },
    { stage: "Etapa 5", title: "Cierre suave", desc: "Reunión, visita técnica, carpeta, registro proveedor o cotización.", meta: "Meta: próximo paso concreto.", decision: false },
  ];

  const followUpDays = [
    { day: "Día 0", title: "Primer contacto", desc: "Mensaje personalizado para ubicar decisor o abrir conversación." },
    { day: "Día 2", title: "Seguimiento 1", desc: "\"Hola, [Nombre]. Te consulto si pudiste ver mi mensaje. Queremos presentarnos como proveedor técnico para futuras necesidades.\"" },
    { day: "Día 5", title: "Seguimiento 2", desc: "\"¿Actualmente están incorporando proveedores o cotizando trabajos técnicos?\"" },
    { day: "Día 10", title: "Valor útil", desc: "Enviar presentación corta o recordar un servicio puntual: urgencias, mantenimiento, obra o electricidad." },
    { day: "Día 15", title: "Cierre elegante", desc: "\"Para no insistirte, te dejo nuestros datos. Cuando necesiten cotizar, quedamos disponibles.\"" },
  ];

  const matrixRows = [
    { resp: "\"Mandame información\"", og: "\"Claro. Para enviarte algo útil, ¿conviene enfocarlo en mantenimiento, soldadura, electricidad, reparaciones o registro como proveedor?\"", cons: "\"Claro. ¿Te sirve que lo enfoque en trabajos para obra, estructuras, electricidad o soluciones para proyectos de arquitectura?\"" },
    { resp: "\"Ya tenemos proveedor\"", og: "\"Perfecto. Muchas empresas igual nos tienen como alternativa para urgencias, paradas, exceso de trabajo o cotizaciones comparativas.\"", cons: "\"Perfecto. Podemos quedar como segunda opción para trabajos puntuales, refuerzos de obra o cuando necesiten resolver algo rápido.\"" },
    { resp: "\"No me interesa\"", og: "\"Entiendo. ¿Es porque tienen todo cubierto o porque ahora no hay necesidad? Te lo consulto para no enviarte algo que no corresponda.\"", cons: "\"Entiendo. ¿Actualmente no están incorporando proveedores o no están con obras que requieran estos servicios?\"" },
    { resp: "\"Pasame precio\"", og: "\"Para cotizar responsablemente necesitamos alcance, ubicación, condiciones y urgencia. Si me pasás esos datos, lo revisamos bien.\"", cons: "\"Podemos cotizar por fotos, planos o visita. Así evitamos pasar un número que después no represente bien el trabajo.\"" },
    { resp: "\"Hablá con compras\"", og: "\"Perfecto. ¿Me podrías pasar contacto de compras o el procedimiento para alta de proveedor?\"", cons: "\"Perfecto. ¿Compras centraliza proveedores o lo define cada jefe de obra/proyecto?\"" },
    { resp: "\"Tenemos algo para cotizar\"", og: "\"Excelente. Pasame fotos, alcance, ubicación, fecha estimada y requisitos de ingreso/documentación. Lo revisamos para cotizar.\"", cons: "\"Excelente. Podés pasarme fotos, planos, medidas, ubicación y plazo esperado. Si hace falta, coordinamos visita a obra.\"" },
  ];

  const funnelSteps = [
    { label: "100 contactos cargados", w: "100%" },
    { label: "60 WhatsApp personalizados enviados", w: "85%" },
    { label: "25 respuestas o derivaciones", w: "70%" },
    { label: "12 presentaciones / registros proveedor", w: "55%" },
    { label: "5 oportunidades de reunión o cotización", w: "40%" },
  ];

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-zinc-950">Proceso comercial por WhatsApp</h1>
        <p className="mt-1.5 max-w-3xl text-[14px] text-zinc-500">Flujo práctico para contactar empresas Oil & Gas, constructoras, arquitectos y estudios. El objetivo es identificar necesidad, llegar al decisor, generar confianza y avanzar hacia registro como proveedor, visita técnica, reunión o cotización.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Soldadura industrial", "Electricidad industrial", "Reparaciones", "Construcción", "WhatsApp B2B"].map((tag) => (
            <Badge key={tag} tone="zinc">{tag}</Badge>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">1</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Mapa general del proceso</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {processSteps.map((step, i) => (
            <Panel key={i} className={`p-4 ${step.decision ? "bg-amber-50" : ""}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff7900]">{step.stage}</p>
              <p className="mt-1.5 text-[13px] font-semibold text-zinc-900">{step.title}</p>
              <p className="mt-1 text-[12px] text-zinc-500">{step.desc}</p>
              <p className="mt-2 text-[11px] font-medium text-zinc-400">{step.meta}</p>
            </Panel>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">2</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Dos caminos comerciales</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--border)] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.035)]" style={{ borderTop: "4px solid #4a55c8" }}>
            <h3 className="font-semibold text-zinc-950">Empresas Oil & Gas / Industria</h3>
            <p className="mt-2 text-[13px] text-zinc-500"><span className="font-semibold text-zinc-700">Dolores:</span> urgencias operativas, paradas, seguridad, documentación, mantenimiento correctivo, proveedores disponibles.</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-zinc-600">
              <li>• <span className="font-medium">Enfoque:</span> continuidad operativa y respuesta técnica.</li>
              <li>• <span className="font-medium">Decisor:</span> mantenimiento, operaciones, compras, HSE, ingeniería.</li>
              <li>• <span className="font-medium">Cierre:</span> registro proveedor, visita/relevamiento o cotización técnica.</li>
            </ul>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.035)]" style={{ borderTop: "4px solid #ff7900" }}>
            <h3 className="font-semibold text-zinc-950">Constructoras / Arquitectos / Estudios</h3>
            <p className="mt-2 text-[13px] text-zinc-500"><span className="font-semibold text-zinc-700">Dolores:</span> cumplimiento de obra, coordinación, proveedores que no responden, trabajos metálicos y eléctricos puntuales.</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-zinc-600">
              <li>• <span className="font-medium">Enfoque:</span> apoyo en obra, resolución y cumplimiento.</li>
              <li>• <span className="font-medium">Decisor:</span> dueño, jefe de obra, arquitecto, compras o administración técnica.</li>
              <li>• <span className="font-medium">Cierre:</span> carpeta, reunión breve, cotización por planos/fotos o visita a obra.</li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">3</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Speech WhatsApp para Oil & Gas</h2>
        </div>
        <div className="rounded-[22px] border border-[var(--border)] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.035)]" style={{ borderTop: "4px solid #4a55c8" }}>
          <div className="space-y-5">
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Primer contacto</p>
              {box("og-1", "Hola, [Nombre]. ¿Cómo estás? Soy [Tu nombre], de Bizon Soluciones Industriales.\n\nBrindamos servicios de soldadura industrial, electricidad industrial, reparaciones y trabajos técnicos para empresas, bases, plantas y operaciones.\n\nQuería consultar quién ve en [Empresa] el tema de proveedores técnicos para mantenimiento, reparaciones, obra o urgencias operativas.")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Cuando responde la persona correcta</p>
              {box("og-2", "Gracias, [Nombre]. Te cuento brevemente.\n\nEn Bizon trabajamos como apoyo técnico para empresas que necesitan resolver trabajos de soldadura industrial, electricidad, reparaciones, mantenimiento correctivo o trabajos especiales en campo/planta.\n\nLa idea es presentarnos como proveedor alternativo para urgencias, trabajos programados o futuras cotizaciones.\n\n¿Actualmente trabajan con proveedores externos para este tipo de servicios?")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Diagnóstico</p>
              {box("og-3", "Para orientarme mejor, ¿qué tipo de trabajos suelen tercerizar más?\n\n1. Soldadura industrial\n2. Electricidad / tableros / instalaciones\n3. Reparaciones y mantenimiento\n4. Estructuras metálicas\n5. Trabajos en obra, base o planta\n6. Urgencias o paradas\n\nCon eso te envío una presentación más enfocada y no algo genérico.")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Cierre</p>
              {box("og-4", "Perfecto, [Nombre]. ¿Cuál sería el proceso para que Bizon quede registrado como proveedor o pueda ser considerado en próximas cotizaciones?\n\nTambién podemos coordinar una visita/relevamiento si tienen algún trabajo pendiente o necesidad actual.")}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">4</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Speech WhatsApp para constructoras y arquitectos</h2>
        </div>
        <div className="rounded-[22px] border border-[var(--border)] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.035)]" style={{ borderTop: "4px solid #ff7900" }}>
          <div className="space-y-5">
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Primer contacto para constructora</p>
              {box("cons-1", "Hola, [Nombre]. ¿Cómo estás? Soy [Tu nombre], de Bizon Soluciones Industriales.\n\nTrabajamos con servicios de soldadura, electricidad, reparaciones y apoyo técnico para obras y empresas constructoras.\n\nQuería consultar quién ve en [Empresa] la incorporación o evaluación de proveedores para trabajos en obra, estructuras metálicas, electricidad o reparaciones.")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Primer contacto para arquitectos / estudios</p>
              {box("cons-2", "Hola, [Nombre]. ¿Cómo estás? Soy [Tu nombre], de Bizon Soluciones Industriales.\n\nQuería presentarnos como apoyo técnico para estudios de arquitectura y obras: realizamos trabajos de soldadura, estructuras metálicas, electricidad, reparaciones y soluciones constructivas.\n\n¿Suelen trabajar con proveedores externos para ejecutar este tipo de trabajos en sus proyectos?")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Diagnóstico para obra</p>
              {box("cons-3", "Para entender si podemos serles útiles, te consulto:\n\n¿Actualmente tienen obras en ejecución o próximas donde necesiten apoyo en soldadura, estructuras, electricidad, reparaciones o trabajos especiales?\n\nPodemos cotizar por planos, fotos, visita a obra o alcance preliminar.")}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-zinc-800">Cierre</p>
              {box("cons-4", "Si te parece, te envío una presentación breve de Bizon con servicios y datos de contacto.\n\nY si tienen algún trabajo puntual, nos pueden pasar fotos, planos o ubicación para revisar y cotizar.")}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">5</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Mapa de respuestas según reacción</h2>
        </div>
        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[#fff4ea]">
                  <th className="w-44 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#ff7900]">Respuesta</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#4a55c8]">Oil & Gas / Industria</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#d85f00]">Constructoras / Arquitectos</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, i) => (
                  <tr key={i} className={`border-b border-[var(--border)] last:border-0 ${i % 2 === 1 ? "bg-[var(--surface)]" : ""}`}>
                    <td className="w-44 border-r border-[var(--border)] px-4 py-3 align-top text-[12px] font-semibold text-zinc-800">{row.resp}</td>
                    <td className="border-r border-[var(--border)] px-4 py-3 align-top text-[12px] text-zinc-600">{row.og}</td>
                    <td className="px-4 py-3 align-top text-[12px] text-zinc-600">{row.cons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">6</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Secuencia de seguimiento</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {followUpDays.map((d, i) => (
            <Panel key={i} className="p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff7900]">{d.day}</p>
              <p className="mt-1.5 text-[13px] font-semibold text-zinc-900">{d.title}</p>
              <p className="mt-1.5 text-[12px] text-zinc-500 leading-relaxed">{d.desc}</p>
            </Panel>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff7900] text-[13px] font-black text-black">7</span>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Embudo comercial sugerido</h2>
        </div>
        <Panel className="p-6">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-2">
            {funnelSteps.map((step, i) => (
              <div key={i} className="rounded-xl border border-[#ffe0c2] bg-[#fff4ea] px-4 py-3 text-center text-[13px] font-semibold text-[#d85f00]" style={{ width: step.w }}>
                {step.label}
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-[12.5px] text-zinc-500">La métrica clave no es solo venta inmediata: es contacto correcto, empresa registrada, cotización abierta y reunión técnica generada.</p>
        </Panel>
      </div>

      <div className="rounded-[22px] border border-[#ffe0c2] bg-[#fff8f0] p-5" style={{ borderLeft: "4px solid #ff7900" }}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff7900]">Frase central</p>
        <p className="mt-2 text-[14px] font-semibold leading-relaxed text-zinc-900">Bizon no se presenta como un proveedor más de soldadura o electricidad; se presenta como una solución técnica confiable para empresas que necesitan resolver trabajos industriales, obras, reparaciones y urgencias con rapidez, cumplimiento y responsabilidad.</p>
      </div>
    </div>
  );
}
