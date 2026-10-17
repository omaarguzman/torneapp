import type { Metadata } from 'next'
import LegalPage from '@/components/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Aviso de privacidad',
  description: 'Cómo Torneapp recaba, usa y protege los datos personales.',
}

export default function PrivacyPage() {
  const { appName, responsable, domicilio, email } = LEGAL
  return (
    <LegalPage title="Aviso de privacidad">
      <h2>1. Quién es responsable de tus datos</h2>
      <p>
        <strong>{responsable}</strong>, con domicilio en {domicilio}, es responsable del tratamiento de los datos personales que se
        recaban a través de {appName} (la aplicación web para organizar torneos de fútbol). Para cualquier asunto relacionado con
        este aviso puedes escribir a <strong>{email}</strong>.
      </p>

      <h2>2. Qué datos recabamos</h2>
      <p>Según cómo uses {appName}:</p>
      <ul>
        <li>
          <strong>Cuenta (administradores y delegados):</strong> nombre, correo electrónico y contraseña cifrada. Si entras con
          Google, recibimos tu nombre y tu correo de tu cuenta de Google; no recibimos tu contraseña.
        </li>
        <li>
          <strong>Jugadores</strong> (los registra el administrador del torneo o el delegado del equipo): nombre, número de
          playera, posición, fecha de nacimiento, CURP y fotografía (opcional).
        </li>
        <li>
          <strong>Datos del torneo:</strong> equipos, logotipos, canchas, horarios, partidos, cédulas (goles, tarjetas,
          asistencia), cargos y pagos registrados por el administrador.
        </li>
        <li>
          <strong>Datos técnicos:</strong> cookies necesarias para mantener tu sesión iniciada y registros técnicos del servidor
          (por ejemplo, fecha y hora de una solicitud) para seguridad y para resolver errores.
        </li>
      </ul>
      <p>
        No recabamos datos personales sensibles (como salud, religión u origen étnico). No usamos cookies de publicidad ni de
        rastreo.
      </p>

      <h2>3. Para qué los usamos</h2>
      <p>Finalidades necesarias para prestar el servicio:</p>
      <ul>
        <li>Crear y administrar tu cuenta e identificarte al iniciar sesión.</li>
        <li>Organizar el torneo: equipos, jugadores, calendario, cédulas, tabla de posiciones, suspensiones y asistencia.</li>
        <li>Validar la identidad y elegibilidad de los jugadores (por ejemplo, que una CURP no se repita en el torneo).</li>
        <li>Enviarte correos del servicio: confirmación de cuenta, recuperación de contraseña y avisos del torneo.</li>
        <li>Dar soporte, mantener la seguridad de la aplicación y corregir errores.</li>
      </ul>
      <p>
        No usamos tus datos para publicidad, no los vendemos y no los compartimos con terceros para sus propios fines.
      </p>

      <h2>4. Quién puede ver los datos</h2>
      <ul>
        <li>El <strong>administrador del torneo</strong> ve todos los datos de su torneo.</li>
        <li>Cada <strong>delegado</strong> ve los datos de su propio equipo y la información general del torneo.</li>
        <li>
          Si el administrador activa la <strong>página pública</strong> del torneo, cualquier persona con el link puede ver la tabla
          de posiciones (nombres y escudos de los equipos y sus resultados). Nunca se muestran jugadores, CURP, fotografías, pagos
          ni datos de contacto.
        </li>
        <li>El soporte de {appName} puede acceder a un torneo solo para ayudar a resolver un problema.</li>
      </ul>

      <h2>5. Proveedores que nos ayudan</h2>
      <p>
        Para operar usamos proveedores que tratan los datos por cuenta nuestra y bajo sus propias medidas de seguridad: Supabase
        (base de datos, almacenamiento de imágenes y autenticación), Vercel (alojamiento de la aplicación), Brevo (envío de
        correos) y Google (inicio de sesión con Google, si lo eliges). Algunos de estos servicios guardan la información en
        servidores fuera de México. No realizamos otras transferencias de datos personales que requieran tu consentimiento.
      </p>

      <h2>6. Datos de menores de edad</h2>
      <p>
        En muchos torneos participan jugadores menores de edad. Quien registra a un menor (el administrador del torneo o el
        delegado del equipo) declara contar con la autorización de su madre, padre o tutor para proporcionar sus datos a{' '}
        {appName} con las finalidades de este aviso. Si eres madre, padre o tutor y quieres que se corrijan o eliminen los datos
        de un menor, escríbenos a {email}.
      </p>

      <h2>7. Tus derechos (ARCO) y cómo revocar tu consentimiento</h2>
      <p>
        Puedes <strong>acceder</strong> a tus datos, pedir que se <strong>rectifiquen</strong> si están mal, que se{' '}
        <strong>cancelen</strong> (eliminen) o <strong>oponerte</strong> a su uso, así como revocar tu consentimiento o limitar su
        uso. Para hacerlo, envía un correo a <strong>{email}</strong> con:
      </p>
      <ul>
        <li>Tu nombre y el correo de tu cuenta (o, si se trata de un jugador, su nombre y el torneo).</li>
        <li>Qué derecho quieres ejercer y sobre qué datos.</li>
        <li>Un documento que acredite tu identidad o, en su caso, la de tu representante.</li>
      </ul>
      <p>
        Te responderemos en un plazo máximo de 20 días hábiles. Ten en cuenta que si eliminamos los datos necesarios para el
        servicio (por ejemplo, tu cuenta), ya no podrás seguir usándolo. Los datos de un jugador también los puede corregir o
        eliminar directamente el administrador del torneo.
      </p>

      <h2>8. Cuánto tiempo los guardamos</h2>
      <p>
        Conservamos los datos mientras la cuenta o el torneo existan. Cuando el administrador borra un torneo, se eliminan sus
        equipos, jugadores, partidos e imágenes. Puedes pedir la eliminación de tu cuenta en cualquier momento escribiendo a{' '}
        {email}.
      </p>

      <h2>9. Seguridad</h2>
      <p>
        Las contraseñas se guardan cifradas, la conexión es siempre segura (HTTPS) y cada persona solo puede consultar los datos
        que le corresponden según su papel en el torneo. Ningún sistema es infalible; si detectamos un incidente que afecte tus
        datos, te lo informaremos.
      </p>

      <h2>10. Cambios a este aviso</h2>
      <p>
        Si cambiamos este aviso, publicaremos la nueva versión en esta misma página con su fecha de actualización y, si el cambio
        es importante, te avisaremos por correo o dentro de la aplicación.
      </p>
    </LegalPage>
  )
}
