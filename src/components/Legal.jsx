// Trafficker Pro — documentos legales
// Política de privacidad y términos, requeridos para revisión en
// Meta, Google y TikTok. Se muestran como modal (dentro de la app)
// y como página pública en /privacidad y /terminos.
// Extraído de App.jsx (Fase 1 de modularización)

import { useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTOS LEGALES — Política de Privacidad y Términos de Servicio
// Requeridos para la revisión de apps en Meta, Google y TikTok.
// ═══════════════════════════════════════════════════════════════════════════

export const LEGAL_TITULAR = "Jorge Falcones";
export const LEGAL_MARCA = "Traffiker Pro";
export const LEGAL_EMPRESA = "Advantagestrat";
export const LEGAL_CONTACTO = "admin@trafficker-pro.com";
export const LEGAL_DOMINIO = "trafficker-pro.com";
export const LEGAL_VIGENCIA = "23 de julio de 2026";
export const LEGAL_ANIO = new Date().getFullYear();

export function LegalModal({ tipo, onClose }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="card"
        style={{ maxWidth: 760, width: "100%", maxHeight: "88vh", display: "flex", flexDirection: "column", padding: 0 }}>
        <LegalContenido tipo={tipo} onClose={onClose} />
      </div>
    </div>
  );
}

// Contenido de los documentos legales (compartido por el modal y la página pública)
export function LegalContenido({ tipo, onClose }) {
  // tipo: "privacidad" | "terminos"
  const esPriv = tipo === "privacidad";

  const H = ({ children }) => (
    <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 22, marginBottom: 8, color: "var(--text)" }}>{children}</h3>
  );
  const P = ({ children }) => (
    <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--muted)", margin: "0 0 10px" }}>{children}</p>
  );
  const UL = ({ children }) => (
    <ul style={{ fontSize: 13, lineHeight: 1.7, color: "var(--muted)", paddingLeft: 20, margin: "0 0 10px" }}>{children}</ul>
  );

  return (
    <>
        {/* Cabecera fija */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>
              {esPriv ? "🔒 Política de Privacidad" : "📄 Términos de Servicio"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {LEGAL_MARCA} · Vigente desde el {LEGAL_VIGENCIA}
            </div>
          </div>
          {onClose && <button className="btn btn-ghost btn-sm" onClick={onClose}>× Cerrar</button>}
        </div>

        {/* Contenido con scroll */}
        <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1 }}>
          {esPriv ? (
            <>
              <P>
                Esta Política de Privacidad describe cómo {LEGAL_MARCA}, marca registrada de
                {" "}{LEGAL_EMPRESA} y operada por {LEGAL_TITULAR} ("nosotros", "la plataforma"),
                recopila, utiliza, almacena y protege la información cuando usted utiliza nuestro
                servicio de análisis y gestión de campañas publicitarias disponible en {LEGAL_DOMINIO}.
              </P>

              <H>1. Información que recopilamos</H>
              <P>Recopilamos únicamente la información necesaria para prestar el servicio:</P>
              <UL>
                <li><b>Datos de cuenta:</b> nombre, nombre de usuario, correo electrónico y contraseña (almacenada de forma cifrada) que usted proporciona al registrarse.</li>
                <li><b>Datos de campañas publicitarias:</b> métricas de rendimiento obtenidas de las plataformas publicitarias que usted conecta voluntariamente, tales como inversión, impresiones, alcance, clics, conversiones y costo por resultado.</li>
                <li><b>Credenciales de acceso a plataformas de terceros:</b> tokens de acceso e identificadores de cuentas publicitarias que usted ingresa para habilitar la consulta de sus propios datos.</li>
                <li><b>Datos operativos:</b> registros y anotaciones que usted crea dentro de la plataforma, como notas de campaña, metas y configuraciones.</li>
                <li><b>Datos técnicos:</b> información mínima de sesión necesaria para mantener su acceso activo.</li>
              </UL>
              <P>
                No recopilamos datos personales de los usuarios finales que interactúan con las campañas
                publicitarias de nuestros clientes. Las métricas que procesamos son agregadas y estadísticas.
              </P>

              <H>2. Cómo utilizamos la información</H>
              <UL>
                <li>Mostrar paneles de métricas, gráficas y reportes de rendimiento publicitario.</li>
                <li>Consultar, en su nombre y con su autorización, las APIs de las plataformas publicitarias que usted conecta.</li>
                <li>Generar históricos que permitan analizar la evolución de sus campañas en el tiempo.</li>
                <li>Enviar notificaciones y alertas operativas dentro de la plataforma, o por los canales que usted configure.</li>
                <li>Permitir la exportación de sus propios datos a formatos como CSV, Excel u hojas de cálculo.</li>
              </UL>
              <P>
                No vendemos, alquilamos ni comercializamos su información con terceros. No utilizamos sus
                datos publicitarios para fines distintos a la prestación del servicio que usted solicita.
              </P>

              <H>3. Integraciones con plataformas de terceros</H>
              <P>
                La plataforma se conecta con servicios externos únicamente cuando usted lo autoriza de
                forma expresa, mediante el ingreso de credenciales o el otorgamiento de permisos:
              </P>
              <UL>
                <li><b>Meta (Facebook e Instagram Ads):</b> para consultar métricas y configuración de las cuentas publicitarias a las que usted tiene acceso legítimo.</li>
                <li><b>TikTok Ads:</b> para consultar métricas de rendimiento de sus cuentas de anunciante.</li>
                <li><b>Google (Sheets y Drive):</b> cuando usted lo autoriza, para crear o actualizar hojas de cálculo con sus propios datos exportados. Solicitamos el permiso mínimo necesario, limitado a los archivos que la propia aplicación crea.</li>
                <li><b>WhatsApp y Telegram:</b> para el envío de notificaciones y reportes a los canales que usted configure.</li>
              </UL>
              <P>
                El uso de estas integraciones está sujeto además a las políticas de privacidad de cada
                proveedor. Usted puede revocar los accesos en cualquier momento, tanto desde nuestra
                plataforma como desde la configuración de seguridad del proveedor correspondiente.
              </P>

              <H>4. Almacenamiento y seguridad</H>
              <P>
                Los datos se almacenan en infraestructura de proveedores de servicios en la nube que
                aplican estándares de seguridad reconocidos en la industria. Las conexiones se realizan
                mediante protocolos cifrados (HTTPS/TLS). Las contraseñas se almacenan de forma cifrada
                y no son recuperables en texto plano.
              </P>
              <P>
                Aplicamos medidas razonables de protección; sin embargo, ningún sistema conectado a
                internet puede garantizar seguridad absoluta. Le recomendamos utilizar contraseñas
                robustas y no compartir sus credenciales de acceso.
              </P>

              <H>5. Conservación de datos</H>
              <P>
                Conservamos su información mientras su cuenta permanezca activa o mientras sea necesario
                para prestar el servicio. Los datos históricos de métricas se conservan por períodos
                limitados definidos en la plataforma, con el fin de permitir análisis comparativos.
                Al solicitar la eliminación de su cuenta, procedemos a borrar sus datos en un plazo
                razonable, salvo aquellos que debamos conservar por obligación legal.
              </P>

              <H>6. Sus derechos</H>
              <P>Usted puede, en cualquier momento:</P>
              <UL>
                <li>Acceder a la información que mantenemos sobre usted.</li>
                <li>Solicitar la corrección de datos inexactos.</li>
                <li>Solicitar la eliminación de su cuenta y de los datos asociados.</li>
                <li>Exportar sus datos en formatos de uso común.</li>
                <li>Revocar los permisos otorgados a integraciones de terceros.</li>
              </UL>
              <P>
                Para ejercer cualquiera de estos derechos, escriba a <b>{LEGAL_CONTACTO}</b>. Atenderemos
                su solicitud en un plazo razonable.
              </P>

              <H>7. Menores de edad</H>
              <P>
                La plataforma está dirigida a profesionales y empresas. No está destinada a personas
                menores de 18 años y no recopilamos intencionadamente información de menores.
              </P>

              <H>8. Cambios a esta política</H>
              <P>
                Podemos actualizar esta Política para reflejar cambios en el servicio o en la normativa
                aplicable. Publicaremos la versión vigente en la plataforma indicando su fecha de
                actualización. El uso continuado del servicio tras la publicación implica la aceptación
                de los cambios.
              </P>

              <H>9. Contacto</H>
              <P>
                Para consultas sobre privacidad o tratamiento de datos: <b>{LEGAL_CONTACTO}</b>
              </P>
            </>
          ) : (
            <>
              <P>
                Estos Términos de Servicio regulan el acceso y uso de {LEGAL_MARCA} ("la plataforma"),
                marca registrada de {LEGAL_EMPRESA} y operada por {LEGAL_TITULAR}. Al utilizar el
                servicio, usted acepta estos términos en su totalidad. Si no está de acuerdo, no debe
                utilizar la plataforma.
              </P>

              <H>1. Descripción del servicio</H>
              <P>
                {LEGAL_MARCA} es una plataforma de análisis y gestión de campañas publicitarias digitales.
                Permite consolidar métricas de plataformas publicitarias, visualizar el rendimiento en
                tiempo real, generar reportes históricos y exportar información para su análisis.
              </P>
              <P>
                La plataforma actúa como una herramienta de consulta y visualización. Los datos mostrados
                provienen de las APIs oficiales de las plataformas publicitarias que usted conecta.
              </P>

              <H>2. Registro y cuenta</H>
              <UL>
                <li>Usted debe proporcionar información veraz al registrarse.</li>
                <li>Es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
                <li>Es responsable de toda actividad realizada desde su cuenta.</li>
                <li>Debe notificarnos si detecta un uso no autorizado de su cuenta.</li>
              </UL>

              <H>3. Uso aceptable</H>
              <P>Al utilizar la plataforma, usted se compromete a:</P>
              <UL>
                <li>Conectar únicamente cuentas publicitarias sobre las que tenga acceso y autorización legítima.</li>
                <li>No utilizar el servicio para fines ilícitos o que infrinjan derechos de terceros.</li>
                <li>No intentar acceder a datos de otros usuarios ni a partes del sistema no destinadas a usted.</li>
                <li>No realizar ingeniería inversa, ni intentar interrumpir o sobrecargar la infraestructura.</li>
                <li>Cumplir con los términos de servicio de las plataformas publicitarias que conecte.</li>
              </UL>

              <H>4. Datos y credenciales de terceros</H>
              <P>
                Usted es responsable de la legitimidad de los accesos que otorga a la plataforma. Al
                ingresar credenciales o tokens de plataformas publicitarias, declara contar con la
                autorización necesaria para consultar y gestionar dichas cuentas.
              </P>
              <P>
                La plataforma utiliza esas credenciales exclusivamente para las funciones que usted
                solicita. No accedemos a cuentas ni datos sin su autorización expresa.
              </P>

              <H>5. Disponibilidad del servicio</H>
              <P>
                Procuramos mantener el servicio disponible de forma continua, pero no garantizamos
                disponibilidad ininterrumpida. El servicio puede verse afectado por mantenimientos,
                actualizaciones, fallos de proveedores de infraestructura, o cambios en las APIs de
                terceros que están fuera de nuestro control.
              </P>
              <P>
                Las plataformas publicitarias pueden modificar, limitar o suspender el acceso a sus APIs
                en cualquier momento. Dichos cambios pueden afectar funcionalidades de la plataforma sin
                que ello constituya un incumplimiento por nuestra parte.
              </P>

              <H>6. Exactitud de los datos</H>
              <P>
                Las métricas mostradas provienen de las plataformas publicitarias de origen. Pueden existir
                diferencias respecto a los paneles nativos de dichas plataformas debido a criterios de
                atribución, zonas horarias, procesos de estimación o momentos de actualización. La
                plataforma no garantiza la exactitud absoluta de los datos de terceros.
              </P>
              <P>
                Las decisiones de negocio que usted tome con base en la información mostrada son de su
                exclusiva responsabilidad.
              </P>

              <H>7. Propiedad intelectual</H>
              <P>
                <b>{LEGAL_MARCA}®</b> es una marca registrada de {LEGAL_EMPRESA}. El software, código
                fuente, diseño de interfaz, arquitectura, documentación, nombre comercial y elementos
                gráficos de la plataforma son propiedad exclusiva de {LEGAL_EMPRESA} y se encuentran
                protegidos por la legislación de propiedad intelectual aplicable.
              </P>
              <P>
                Estos términos no le otorgan derechos sobre la propiedad intelectual de la plataforma
                más allá del derecho de uso limitado, personal y revocable conforme a lo aquí establecido.
                Queda prohibida la reproducción, distribución, modificación, descompilación o creación de
                obras derivadas sin autorización previa y por escrito de {LEGAL_EMPRESA}.
              </P>
              <P>
                Los datos de sus campañas y los contenidos que usted registra permanecen bajo su propiedad.
                Usted nos otorga únicamente la licencia limitada necesaria para procesarlos y mostrárselos.
              </P>

              <H>8. Limitación de responsabilidad</H>
              <P>
                En la máxima medida permitida por la legislación aplicable, la plataforma se proporciona
                "tal cual", sin garantías implícitas de idoneidad para un propósito particular.
              </P>
              <P>
                No seremos responsables por pérdidas de beneficios, pérdida de datos, interrupciones de
                negocio, ni daños indirectos o consecuentes derivados del uso o la imposibilidad de uso
                del servicio, ni por decisiones de inversión publicitaria tomadas con base en la
                información mostrada.
              </P>

              <H>9. Suspensión y terminación</H>
              <P>
                Usted puede dejar de usar el servicio y solicitar la eliminación de su cuenta en cualquier
                momento. Podemos suspender o cancelar el acceso en caso de incumplimiento de estos términos,
                uso indebido de la plataforma, o cuando sea necesario por razones legales o de seguridad.
              </P>

              <H>10. Modificaciones</H>
              <P>
                Podemos actualizar estos Términos para reflejar mejoras del servicio o cambios normativos.
                Publicaremos la versión vigente indicando su fecha. El uso continuado tras la publicación
                implica su aceptación.
              </P>

              <H>11. Legislación aplicable</H>
              <P>
                Estos Términos se rigen por la legislación aplicable en el domicilio del titular del
                servicio. Cualquier controversia se procurará resolver de buena fe entre las partes; de
                no ser posible, se someterá a los tribunales competentes de dicha jurisdicción.
              </P>

              <H>12. Contacto</H>
              <P>
                Para consultas relacionadas con estos Términos: <b>{LEGAL_CONTACTO}</b>
              </P>
            </>
          )}

          <div style={{ marginTop: 24, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
            <b>{LEGAL_MARCA}®</b> es una marca registrada de {LEGAL_EMPRESA}.
            <br />
            © {LEGAL_ANIO} {LEGAL_EMPRESA}. Todos los derechos reservados.
            <br />
            Contacto: {LEGAL_CONTACTO} · {LEGAL_DOMINIO}
            <br /><br />
            <span style={{ opacity: .7 }}>
              Este documento describe las prácticas actuales de la plataforma. No constituye asesoría legal;
              se recomienda su revisión por un profesional según la jurisdicción aplicable.
            </span>
          </div>
        </div>
    </>
  );
}

// Página pública de documentos legales (accesible sin login por URL)
export function LegalPagina({ tipo }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 20 }}>📊 {LEGAL_MARCA}</div>
          <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
            <a href="/privacidad" style={{ color: tipo === "privacidad" ? "var(--accent)" : "var(--muted)", fontWeight: tipo === "privacidad" ? 700 : 400 }}>Privacidad</a>
            <a href="/terminos" style={{ color: tipo === "terminos" ? "var(--accent)" : "var(--muted)", fontWeight: tipo === "terminos" ? 700 : 400 }}>Términos</a>
            <a href="/" style={{ color: "var(--muted)" }}>Ir a la app →</a>
          </div>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <LegalContenido tipo={tipo} />
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
          {LEGAL_MARCA}® es una marca registrada de {LEGAL_EMPRESA}
          <br />
          © {LEGAL_ANIO} {LEGAL_EMPRESA} · Todos los derechos reservados
        </div>
      </div>
    </div>
  );
}

// Pie de página con los enlaces legales (se monta en el sidebar)
export function LegalFooter() {
  const [modal, setModal] = useState(null);
  const linkStyle = {
    background: "none", border: "none", padding: 0, cursor: "pointer",
    color: "var(--muted)", fontSize: 10, textDecoration: "underline", textDecorationColor: "var(--border)",
  };
  return (
    <>
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={linkStyle} onClick={() => setModal("privacidad")}>Privacidad</button>
          <span style={{ color: "var(--border)", fontSize: 10 }}>·</span>
          <button style={linkStyle} onClick={() => setModal("terminos")}>Términos</button>
        </div>
        {/* Marca de agua: propiedad y derechos reservados */}
        <div style={{ textAlign: "center", marginTop: 7, fontSize: 9, lineHeight: 1.5, color: "var(--muted)", opacity: .55 }}>
          {LEGAL_MARCA}® es una marca registrada de {LEGAL_EMPRESA}
          <br />
          © {LEGAL_ANIO} {LEGAL_EMPRESA} · Todos los derechos reservados
        </div>
      </div>
      {modal && <LegalModal tipo={modal} onClose={() => setModal(null)} />}
    </>
  );
}
