import { ArrowLeft } from "lucide-react";

interface TermsPageProps {
  onBack: () => void;
}

export function TermsPage({ onBack }: TermsPageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute -top-60 right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]"
          style={{ background: "radial-gradient(circle, #a855f7, transparent)" }}
        />
        <div className="absolute inset-0 bg-background/92" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors text-sm mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="mb-8">
          <p className="text-xs font-mono text-zinc-600 tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-3xl font-black text-white tracking-tight">Términos y Condiciones</h1>
          <p className="text-zinc-600 text-sm mt-2">Última actualización: Abril 2025</p>
        </div>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">

          <p>
            Estos Términos y Condiciones regulan el acceso y uso de la aplicación Koraframe, operada por <span className="text-zinc-300 font-semibold">Appmind</span> ("la Empresa"). Al usar la app, aceptas estos términos.
          </p>

          <section>
            <h2 className="text-white font-bold text-base mb-2">1. Descripción del Servicio</h2>
            <p>
              Koraframe permite a los usuarios generar imágenes mediante inteligencia artificial a partir de fotos proporcionadas por el usuario ("Contenido del Usuario").
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">2. Elegibilidad</h2>
            <p>
              Debes tener al menos 13 años para usar la app. Si eres menor de edad, debes contar con autorización de tus padres o tutores.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">3. Cuentas</h2>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Eres responsable de la seguridad de tu cuenta.</li>
              <li>Toda actividad bajo tu cuenta es tu responsabilidad.</li>
              <li>Podemos suspender o eliminar cuentas por uso indebido.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">4. Uso Aceptable</h2>
            <p className="mb-2">Aceptas NO:</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Subir contenido ilegal, ofensivo o que infrinja derechos de terceros.</li>
              <li>Usar imágenes de otras personas sin su consentimiento.</li>
              <li>Generar contenido engañoso, fraudulento o dañino.</li>
              <li>Intentar vulnerar la seguridad de la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">5. Contenido del Usuario e IA</h2>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Mantienes la propiedad de las imágenes que subes.</li>
              <li>Nos otorgas una licencia limitada para procesarlas y generar resultados.</li>
              <li>Los resultados son generados por inteligencia artificial y pueden no ser precisos o esperados.</li>
              <li>Eres responsable del uso del contenido generado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">6. Créditos (Tokens) y Pagos</h2>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Koraframe opera mediante un sistema de créditos ("tokens").</li>
              <li>Cada generación consume tokens.</li>
              <li>Los tokens se compran dentro de la app.</li>
              <li>Todos los pagos son finales y no reembolsables.</li>
              <li>Los tokens no tienen valor monetario fuera de la plataforma.</li>
              <li>Nos reservamos el derecho de modificar precios en cualquier momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">7. Propiedad Intelectual</h2>
            <p>
              El software, diseño, marca y tecnología pertenecen a Appmind. No puedes copiar, modificar o distribuir la app sin autorización.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">8. Limitación de Responsabilidad</h2>
            <p className="mb-2">Koraframe y Appmind no serán responsables por:</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Resultados inesperados o inexactos de la IA.</li>
              <li>Uso indebido del contenido generado.</li>
              <li>Pérdida de datos o interrupciones del servicio.</li>
            </ul>
            <p className="mt-2">El uso de la app es bajo tu propio riesgo.</p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">9. Terminación</h2>
            <p>
              Podemos suspender o cancelar tu acceso en cualquier momento si incumples estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">10. Modificaciones</h2>
            <p>
              Podemos actualizar estos términos en cualquier momento. El uso continuo de la app implica aceptación de los cambios.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">11. Ley Aplicable</h2>
            <p>
              Estos términos se rigen por las leyes de Panamá.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-2">12. Contacto</h2>
            <p>
              Soporte:{" "}
              <a
                href="mailto:appmindsupport@gmail.com"
                className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
              >
                appmindsupport@gmail.com
              </a>
            </p>
          </section>

          <div className="border-t border-white/10 pt-6 text-zinc-600 text-xs">
            Al usar Koraframe, confirmas que has leído y aceptado estos términos.
          </div>
        </div>
      </div>
    </div>
  );
}
