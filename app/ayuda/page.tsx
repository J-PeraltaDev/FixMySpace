import { HelpContactCard } from "@/components/HelpContactCard";
import { SupportReportForm } from "@/components/SupportReportForm";

const faqs = [
  ["¿Cómo se agenda un servicio?", "Publica una solicitud, conversa con el trabajador y confirma una fecha desde el flujo de contratación."],
  ["¿Puedo adjuntar fotos?", "Sí. En esta versión puedes adjuntarlas como referencia inicial en la solicitud."],
  ["¿Qué significa trabajador verificado?", "Indica que el perfil está marcado como revisado dentro de la plataforma."],
  ["¿Dónde veo mis trabajos?", "El historial reúne servicios programados, completados y cancelados."],
];

export default function HelpPage() {
  return (
    <div className="page-shell">
      <div className="mb-8">
        <p className="eyebrow">Centro de ayuda</p>
        <h1 className="mt-3 text-4xl font-black text-slate-950">Soporte simple para clientes y trabajadores.</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          <HelpContactCard title="WhatsApp soporte" detail="Atención inicial para cuentas, solicitudes y dudas de agenda." action="+57 300 000 0000" />
          <HelpContactCard title="Correo de soporte" detail="Canal para reportes, documentación y seguimiento de casos." action="soporte@fixmyspace.local" />
          <HelpContactCard title="Administración" detail="Moderación, reportes y seguimiento de verificación para trabajadores." action="/admin" />
        </div>
        <div className="grid gap-6">
          <SupportReportForm />
          <section className="soft-card p-5 sm:p-6">
            <h2 className="section-title">Preguntas frecuentes</h2>
            <div className="mt-4 grid gap-3">
              {faqs.map(([question, answer]) => (
                <article key={question} className="rounded-3xl bg-slate-50 p-4">
                  <h3 className="font-black text-slate-950">{question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
