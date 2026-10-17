/**
 * Contenido del manual de uso. Cada guía tiene secciones con pasos; los
 * textos entre **asteriscos** se muestran en negritas (nombres de botones y pantallas).
 */

export type ManualSection = { id: string; title: string; intro?: string; steps: string[]; tip?: string }
export type ManualGuide = { id: string; icon: string; title: string; summary: string; sections: ManualSection[] }

export const GUIDES: ManualGuide[] = [
  {
    id: 'admin',
    icon: '🏆',
    title: 'Administrador del torneo',
    summary: 'Quien organiza: crea el torneo, las canchas y los equipos, genera el fixture, valida cédulas y lleva los pagos.',
    sections: [
      {
        id: 'admin-cuenta',
        title: 'Crear tu cuenta',
        steps: [
          'Entra a Torneapp y toca **Crear cuenta**. Puedes registrarte con tu correo o con **Continuar con Google**.',
          'Si usas correo, crea una contraseña segura (la app te muestra los requisitos mientras escribes) y confirma tu correo desde el mensaje que te llega.',
          'Si olvidas tu contraseña, en el inicio de sesión toca **¿Olvidaste tu contraseña?** y sigue el enlace que te llega por correo.',
        ],
      },
      {
        id: 'admin-torneo',
        title: 'Crear un torneo',
        steps: [
          'En **Mis torneos** toca **+ Nuevo torneo**.',
          'Escribe el nombre, el tipo de fútbol (11, 7, 5 o salón) y las fechas de inicio y fin.',
          'Elige el formato: **Solo ida (una vuelta)** o **Ida y vuelta (dos vueltas)**.',
          'Si cobras a algunos equipos por un horario fijo, activa la **preferencia de horario pagada**.',
          'Configura las suspensiones: cuántas amarillas acumuladas suspenden un partido y cuántos partidos se suspende por roja. Todo esto lo puedes cambiar después en **Reglas**.',
        ],
      },
      {
        id: 'admin-canchas',
        title: 'Canchas y horarios',
        intro: 'El fixture solo programa partidos en los horarios que registres aquí.',
        steps: [
          'Dentro del torneo, en la pestaña **Canchas**, toca **+ Agregar cancha** y escribe su nombre y ubicación.',
          'En cada cancha usa **+ Generar horarios**: elige los días, la hora de inicio, la de fin y la duración de cada partido. La app crea todos los horarios de golpe.',
          'Si usas las mismas canchas en varios torneos, guárdalas como plantilla en **Canchas guardadas** y reutilízalas en el siguiente torneo.',
        ],
      },
      {
        id: 'admin-equipos',
        title: 'Equipos, delegados y jugadores',
        steps: [
          'En la pestaña **Equipos** toca **+ Nuevo equipo**, escribe el nombre, sube su logo y, si aplica, su horario preferido pagado.',
          'Escribe el nombre y correo del delegado. Al guardar, copia el **link de invitación** del equipo y mándaselo por WhatsApp: con él crea su cuenta y queda a cargo del equipo.',
          'Puedes registrar jugadores tú mismo con **+ Jugador** (foto, número, posición, CURP), o dejar que cada delegado registre a los suyos.',
          'Si necesitas cambiar de delegado, usa **Desvincular**: pierde el acceso, se genera un link nuevo y el anterior deja de funcionar.',
        ],
        tip: 'Agrega todos los equipos antes de generar el fixture. Si llegan equipos a media temporada, usa **Actualizar fixture**.',
      },
      {
        id: 'admin-reglas',
        title: 'Reglas, logo y plantilla del rol',
        steps: [
          'En la pestaña **Reglas** sube el **logo del torneo**: aparece en el rol de juegos y en las estadísticas.',
          'Elige la **plantilla del rol de juegos**: **Automática** (cambia sola con la temporada: Año Nuevo, Primavera, Día del niño, Mes patrio, Día de Muertos, Navidad) o una fija. También puedes subir tus propios fondos.',
          'Escribe el **reglamento**. Los delegados lo ven en su panel y reciben un aviso cada vez que lo cambias, con lo que cambió marcado.',
          'Define la **fecha límite** para que los delegados registren jugadores, el marcador del **W.O.** y qué pasa si no se presenta ningún equipo.',
        ],
      },
      {
        id: 'admin-fixture',
        title: 'Generar el fixture y compartir el rol',
        steps: [
          'Abre el **Fixture** del torneo y toca **Generar fixture**. La app arma todas las jornadas respetando canchas, horarios y preferencias pagadas.',
          'Cada jornada tiene su pestaña (J1, J2…). Ahí ves los partidos, quién descansa y las suspensiones de cada partido.',
          'En **🖼️ Imagen del rol** ves la imagen oficial de la jornada. Puedes escribir una **nota** (por ejemplo, "uniformes iguales"), elegir otra plantilla solo para esa jornada y descargarla como imagen o **📄 PDF**, o compartirla.',
          'Mientras no haya partidos jugados puedes **Regenerar fixture**. Después, usa las herramientas de la siguiente sección para no perder resultados.',
        ],
      },
      {
        id: 'admin-importar',
        title: 'Tu torneo ya empezó: importar jornadas jugadas',
        intro: 'Si empezaste el torneo antes de usar Torneapp (en papel, Excel u otra app), no tienes que empezar de cero.',
        steps: [
          'Da de alta a **todos** los equipos y las canchas con sus horarios, como en un torneo nuevo.',
          'Abre el **Fixture** y toca **📥 Importar jornadas jugadas**.',
          'Para cada jornada que ya se jugó, escribe la **fecha** y, en cada partido, el local, el visitante y el **marcador**. La hora y la cancha vienen llenas; ajústalas si quieres. Debajo verás quién no tuvo partido y si repetiste a algún equipo.',
          'Con **+ Agregar jornada** capturas la siguiente. Al terminar toca **Guardar jornadas y planear el resto**.',
          'La app te muestra la propuesta del resto del torneo (como en **Actualizar fixture**): conserva las jornadas importadas, no repite ningún cruce y empieza a partir de esta semana. Revísala y toca **Aplicar**.',
          'El marcador de los partidos importados ya cuenta en la tabla. Para que también cuenten goleadores, tarjetas, suspensiones y asistencia hay que llenar su cédula.',
          'Si vas a llenar las cédulas, marca **Dejar las cédulas abiertas para capturarlas después** antes de guardar: cada partido queda con su **📋 Link árbitro** para capturarla tú o mandarla a quien tenga los datos. Al terminar, valida cada cédula desde el partido.',
          'Si no marcas la casilla, los partidos quedan validados solo con el marcador. Puedes completar cualquiera después con **Reabrir cédula**.',
        ],
        tip: 'Solo se puede importar mientras el torneo no tenga partidos jugados en Torneapp. Si ya habías generado un fixture, al importar se reemplaza.',
      },
      {
        id: 'admin-nuevos-equipos',
        title: 'Agregar equipos a media temporada',
        intro: 'Ejemplo: 10 equipos a una vuelta (9 jornadas), ya se jugaron 3 y llegan 5 equipos nuevos para la jornada 4.',
        steps: [
          'Da de alta a los equipos nuevos en **Equipos**. Hasta aquí el fixture no cambia.',
          'En el **Fixture** toca **🔄 Actualizar fixture**. Verás una propuesta; nada se guarda hasta que toques **Aplicar**.',
          'Lo jugado no se toca: J1 a J3 se quedan con sus resultados, cédulas y suspensiones.',
          'La app recalcula el torneo con 15 equipos: 15 jornadas de 7 partidos, y en cada una **descansa un equipo**. Quedan J4 a J15 por planear.',
          'Los equipos originales alcanzan a jugar contra todos. A cada equipo nuevo le faltan 14 rivales y solo quedan 12 jornadas, así que los cruces que no caben (casi siempre de nuevos entre sí) van a **⏸ Pendientes**. En este ejemplo son unos 6.',
          'Los partidos que ya estaban programados se reutilizan cuando se puede y conservan su link de árbitro. Se respetan las preferencias de horario pagadas y las canchas cerradas, y se equilibra quién es local.',
          'Al aplicar, cada delegado recibe un aviso de los partidos suyos que cambiaron. Los pendientes los programas cuando haya hueco desde **⏸ Pendientes → Programar**.',
        ],
        tip: 'Agrega a todos los equipos nuevos antes de que se juegue el primer partido de la siguiente jornada y actualiza una sola vez. Si tienes pocos horarios por semana, quedarán más partidos en Pendientes: la propuesta te lo muestra antes de aplicar.',
      },
      {
        id: 'admin-cedulas',
        title: 'Cédulas del árbitro y validación',
        steps: [
          'En cada partido toca **📋 Link árbitro** y mándaselo al árbitro: con ese link captura la cédula desde su celular, sin crear cuenta.',
          'También puedes capturarla tú desde **Capturar cédula**: marcador, goles, tarjetas y asistencia.',
          'Revisa la cédula y toca **✓ Validar cédula**: a partir de ahí nadie puede modificarla. Si hay un error, **Reabrir cédula**.',
          '**Default / W.O.**: si un equipo no se presentó, en la cédula toca **🏳️ Declarar default / W.O.** y elige quién faltó; se usa el marcador de tus reglas.',
          '**Partido suspendido**: si el partido se suspendió (lluvia, luz, riña), en la cédula marca "El partido se suspendió", el minuto y el motivo. Después decides si se **reanuda en otra fecha** o se da un **resultado final**.',
        ],
      },
      {
        id: 'admin-cambios',
        title: 'Cambios al calendario',
        steps: [
          '**⏸ Aplazar**: manda un partido a la pestaña **Pendientes** (sin fecha). Desde ahí lo programas después con los horarios libres sugeridos, o deshaces el aplazamiento.',
          '**✏️ Mover**: cambia fecha, cancha u horario de un partido, o **intercambia** su horario con otro partido.',
          '**📅 Recorrer jornada**: por un día festivo, recorre una jornada (y, si quieres, todas las siguientes) una o más semanas.',
          '**🚧 Canchas cerradas**: cierra una cancha un día; sus partidos pasan a Pendientes y nadie puede programar ahí ese día.',
          '**🔄 Actualizar fixture**: si entran equipos nuevos a media temporada, la app conserva lo jugado y vuelve a planear el resto, con vista previa antes de aplicar.',
          'Todo queda en la pestaña **Historial**, y cada delegado recibe un aviso cuando cambia uno de sus partidos.',
        ],
      },
      {
        id: 'admin-liguilla',
        title: 'Liguilla',
        intro: 'La fase final por eliminación. Se configura antes de iniciarla y después se juega ronda por ronda.',
        steps: [
          'En la página del torneo toca **Liguilla → Configurar** y activa **Este torneo tiene liguilla**.',
          'Elige cuántos equipos van a la fase final (4, 8 o 16) y cuántos **pasan directo**. Ejemplo: 8 a la fase final con 1–4 directo hace un **repechaje** del 5 al 12 (5 vs 12, 6 vs 11, 7 vs 10, 8 vs 9) y los 4 ganadores se unen en cuartos.',
          'Para cada ronda elige **Partido único** o **Ida y vuelta**, y qué pasa si una eliminatoria termina empatada (en el global): avanza el **mejor posicionado** o se define por **penales**. Toca **Guardar configuración**.',
          'Abajo ves cómo quedaría la primera ronda con la tabla de hoy. Cuando termine la fase regular toca **Iniciar liguilla**: la tabla general se congela y se programa la primera ronda con tus canchas y horarios.',
          'Cada ronda aparece en el **Fixture** con su nombre (Repechaje, Cuartos · ida…). Ahí se captura la cédula, se mueve o se aplaza como cualquier partido. Es local el mejor posicionado; en ida y vuelta, cierra en casa.',
          'Si el desempate es por penales y el partido que define queda empatado, la cédula pide los **penales** de cada equipo (también desde el link del árbitro).',
          'Cuando todas las eliminatorias de una ronda tienen la cédula **validada**, en la Liguilla aparece **Programar** la siguiente ronda. Los que siguen vivos se reacomodan por su lugar en la tabla general: el mejor contra el peor.',
          'Al terminar las semifinales puedes marcar **Agregar también el partido por el 3er lugar** al programar la final, o agregarlo después mientras la final no tenga ganador.',
          'Con **🖼️ Imagen de la llave** descargas o compartes la llave con la plantilla del rol. Al terminar la final se muestra el campeón.',
        ],
        tip: 'La tabla general solo cuenta la fase regular; los goles y tarjetas de la liguilla sí cuentan en goleadores y suspensiones (las suspensiones pendientes se cumplen en la liguilla). Si te equivocaste, **Deshacer ronda** borra la última ronda mientras no tenga partidos jugados.',
      },
      {
        id: 'admin-pagos',
        title: 'Pagos, disciplina y asistencia',
        steps: [
          'En **Pagos** registra cargos por equipo (arbitraje, inscripción, multas…) y marca **Marcar pagado** cuando paguen.',
          'Un equipo con adeudos no ve marcadores ni la tabla. Si el atraso es grave, usa **⛔ Bloquear acceso** para cerrarle todo el panel hasta que se ponga al corriente.',
          'La pestaña **Disciplina** muestra quién está suspendido para los próximos partidos y quién está a una amarilla de la suspensión.',
          'En **Asistencia** defines el mínimo de partidos que un jugador debe jugar (por ejemplo, para la liguilla) y ves cuántos lleva cada uno.',
        ],
      },
      {
        id: 'admin-estadisticas',
        title: 'Estadísticas y exportar',
        steps: [
          'En **Estadísticas** ves la tabla de posiciones, goleadores, tarjetas y mejor defensa, siempre al día con las cédulas capturadas.',
          '**📄 PDF** abre una vista previa con dos páginas sobre la plantilla del rol: la tabla y, aparte, goleadores, defensa y tarjetas. Desde ahí lo descargas o lo compartes.',
          '**Excel** descarga las tablas completas para trabajar con ellas.',
        ],
      },
    ],
  },
  {
    id: 'delegado',
    icon: '🛡️',
    title: 'Delegado de equipo',
    summary: 'Quien representa a un equipo: registra a sus jugadores y consulta todo lo del torneo desde su celular.',
    sections: [
      {
        id: 'delegado-unirse',
        title: 'Unirte a tu equipo',
        steps: [
          'Abre el **link de invitación** que te mandó el administrador del torneo.',
          'Crea tu cuenta (o entra si ya tienes una). Puedes usar tu correo o Google. Al terminar quedas como delegado de ese equipo.',
          'Si representas equipos en varios torneos, usa **⇄ Cambiar equipo** en la barra de arriba.',
        ],
      },
      {
        id: 'delegado-jugadores',
        title: 'Tus jugadores',
        steps: [
          'En **Mi equipo** toca **+ Nuevo jugador** y llena sus datos (foto, número, posición, CURP).',
          'Solo puedes registrar jugadores hasta la **fecha límite** que puso el administrador. Después, pídele a él las altas.',
          'Ahí mismo ves la asistencia de cada jugador y la sección **Disciplina de mi equipo**: quién está suspendido y quién está cerca del límite de amarillas.',
        ],
      },
      {
        id: 'delegado-consultar',
        title: 'Calendario, tabla y reglamento',
        steps: [
          '**🗓️ Calendario**: todas las jornadas, con fecha, hora y cancha de cada partido, y la imagen del rol de cada jornada para compartirla con tus jugadores.',
          'La pestaña **Por programar** muestra los partidos aplazados que aún no tienen fecha.',
          '**🏆 Tabla**: posiciones y goleadores, con **📄 PDF** y **Compartir**.',
          '**📜 Reglamento**: las reglas del torneo. Lo que cambió en la última actualización sale marcado como "🆕 Actualizado".',
        ],
        tip: 'Si tu equipo tiene pagos pendientes, los resultados y la tabla se ocultan hasta que se pongan al corriente.',
      },
      {
        id: 'delegado-liguilla',
        title: 'Liguilla',
        steps: [
          'Cuando el administrador inicia la liguilla aparece **🥇 Liguilla** en tu menú, con la llave completa: cada eliminatoria, sus marcadores y quién avanza. Tu equipo sale marcado.',
          'El número junto a cada equipo es su lugar en la tabla general. En cada ronda juega el mejor contra el peor de los que siguen vivos.',
          'Las fechas, horas y canchas de cada ronda están en tu **Calendario**, en la pestaña de la ronda. Desde ahí también descargas la imagen del rol.',
          'Con **🖼️ Imagen de la llave** la compartes con tus jugadores.',
        ],
      },
      {
        id: 'delegado-avisos',
        title: 'Avisos',
        steps: [
          'Cada vez que se aplaza, mueve o reprograma un partido de tu equipo, o cambia el reglamento, te llega un aviso en **🔔 Avisos** con lo que cambió.',
          'El número rojo indica cuántos avisos no has leído.',
        ],
      },
    ],
  },
  {
    id: 'arbitro',
    icon: '📝',
    title: 'Árbitro',
    summary: 'Captura la cédula del partido desde su celular con el link que le manda el administrador. No necesita cuenta.',
    sections: [
      {
        id: 'arbitro-cedula',
        title: 'Capturar la cédula',
        steps: [
          'Abre el link de la cédula que te mandó el administrador.',
          'Escribe el marcador y registra cada gol y tarjeta tocando ⚽ 🟨 🟥 junto al jugador; puedes anotar el minuto.',
          'Marca la **asistencia** de los jugadores que se presentaron.',
          'Si un equipo no se presentó, usa **🏳️ Registrar default / W.O.**. Si el partido se suspendió, marca **El partido se suspendió** con el minuto y el motivo.',
          'Toca **Guardar cédula**. Puedes corregirla mientras el administrador no la valide.',
        ],
      },
    ],
  },
]

export const FAQ: { q: string; a: string }[] = [
  {
    q: '¿Cómo funciona la liguilla?',
    a: 'Configúrala en Liguilla (cuántos clasifican, cuántos pasan directo, partido único o ida y vuelta, desempate). Al iniciarla se congela la tabla general y en cada ronda juega el mejor posicionado contra el peor de los que siguen vivos.',
  },
  {
    q: 'Mi torneo ya empezó en otro lado, ¿puedo pasarlo a Torneapp?',
    a: 'Sí. Da de alta equipos y canchas, y en el Fixture usa "Importar jornadas jugadas" para capturar las jornadas que ya se jugaron. La app planea el resto sin repetir cruces.',
  },
  {
    q: '¿Qué pasa si llegan equipos nuevos con el torneo ya empezado?',
    a: 'Dalos de alta y usa "Actualizar fixture". Se conserva lo jugado y se vuelve a planear lo que falta con todos los equipos; lo que no cabe queda en Pendientes para programarlo después.',
  },
  {
    q: '¿Cuánto cuesta Torneapp?',
    a: 'Durante la etapa de pruebas es gratis.',
  },
  {
    q: 'Un delegado no recibió el correo de confirmación, ¿qué hago?',
    a: 'Que revise la carpeta de spam y espere unos minutos. También puede entrar con Google desde el mismo link de invitación.',
  },
  {
    q: '¿Puedo cambiar el fixture después de que empezó el torneo?',
    a: 'Sí: aplaza, mueve o intercambia partidos, recorre jornadas o usa Actualizar fixture. Los resultados ya capturados nunca se pierden.',
  },
  {
    q: '¿Quién puede ver los resultados?',
    a: 'El administrador siempre. Los delegados, mientras su equipo no tenga adeudos ni esté bloqueado.',
  },
  {
    q: '¿Se puede usar desde el celular?',
    a: 'Sí, toda la app está pensada para usarse desde el celular, incluida la cédula del árbitro.',
  },
]
