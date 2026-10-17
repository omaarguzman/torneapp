import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage from '@/components/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Condiciones del servicio',
  description: 'Reglas para usar Torneapp.',
}

export default function TermsPage() {
  const { appName, responsable, email } = LEGAL
  return (
    <LegalPage title="Condiciones del servicio">
      <p>
        Estas condiciones regulan el uso de {appName}, una aplicación web para organizar torneos de fútbol, operada por{' '}
        {responsable}. Al crear una cuenta o usar la aplicación aceptas estas condiciones y el{' '}
        <Link href="/privacidad" className="text-amber-300 hover:text-amber-200">
          aviso de privacidad
        </Link>
        .
      </p>

      <h2>1. El servicio</h2>
      <p>
        {appName} permite crear torneos, registrar equipos y jugadores, generar el calendario, capturar cédulas, calcular la tabla
        de posiciones y compartir información del torneo. Actualmente está en <strong>etapa de pruebas</strong> y es gratuito.
        Las funciones pueden cambiar, agregarse o retirarse mientras mejoramos la aplicación. Si en el futuro hay planes de pago,
        se avisará con anticipación y nunca se cobrará sin tu aceptación expresa.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes proporcionar datos reales y mantener tu contraseña en secreto. Eres responsable de lo que se haga con tu cuenta.</li>
        <li>
          Hay dos tipos de cuenta: <strong>administrador</strong> (organiza torneos) y <strong>delegado</strong> (representa a un
          equipo, entra con el link de invitación del administrador).
        </li>
        <li>Avísanos de inmediato a {email} si crees que alguien más entró a tu cuenta.</li>
      </ul>

      <h2>3. Responsabilidad del administrador y de los delegados</h2>
      <ul>
        <li>
          Quien registra datos de jugadores declara tener su autorización y, en el caso de menores de edad, la de su madre, padre
          o tutor.
        </li>
        <li>
          El administrador es responsable de la organización del torneo: reglas, resultados, sanciones, cobros y decisiones
          deportivas. {appName} es una herramienta y no interviene en esas decisiones ni en los pagos entre las partes.
        </li>
        <li>
          Los logotipos, fotografías y textos que subas deben ser tuyos o contar con permiso para usarlos. No se permite contenido
          ofensivo, ilegal o que viole derechos de terceros.
        </li>
      </ul>

      <h2>4. Uso permitido</h2>
      <p>No está permitido:</p>
      <ul>
        <li>Intentar acceder a cuentas, torneos o datos que no te corresponden.</li>
        <li>Interferir con el funcionamiento de la aplicación o usarla para enviar spam.</li>
        <li>Usar {appName} para actividades ilegales o para recabar datos de otras personas sin su consentimiento.</li>
      </ul>
      <p>
        Podemos pausar o eliminar cuentas o torneos que incumplan estas condiciones, avisándote cuando sea posible.
      </p>

      <h2>5. Disponibilidad y respaldo de la información</h2>
      <p>
        Hacemos lo posible por que {appName} funcione siempre, pero durante la etapa de pruebas puede haber interrupciones,
        errores o cambios. El servicio se ofrece «tal como está», sin garantía de disponibilidad continua. Te recomendamos
        conservar por tu cuenta la información importante del torneo (por ejemplo, exportando la tabla o las estadísticas).
      </p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>
        En la medida que lo permita la ley, {responsable} no será responsable por daños indirectos, pérdida de datos o de
        ganancias derivados del uso de la aplicación, ni por las decisiones que tomen los organizadores, delegados o árbitros con
        base en la información de {appName}.
      </p>

      <h2>7. Terminar el uso</h2>
      <p>
        Puedes dejar de usar {appName} cuando quieras y pedir la eliminación de tu cuenta escribiendo a {email}. El administrador
        puede borrar sus torneos en cualquier momento.
      </p>

      <h2>8. Cambios a estas condiciones</h2>
      <p>
        Si actualizamos estas condiciones publicaremos la nueva versión aquí con su fecha. Si el cambio es importante, te
        avisaremos con anticipación. Seguir usando la aplicación después de un cambio significa que lo aceptas.
      </p>

      <h2>9. Ley aplicable y contacto</h2>
      <p>
        Estas condiciones se rigen por las leyes de los Estados Unidos Mexicanos. Para dudas o aclaraciones escríbenos a{' '}
        <strong>{email}</strong>.
      </p>
    </LegalPage>
  )
}
