# Diseno de contraofertas para solicitudes

## Objetivo

Permitir que cliente y trabajador negocien las condiciones de una solicitud dirigida desde un chat creado automaticamente para esa solicitud. La solicitud y cada contraoferta se muestran como cards interactivas dentro del hilo. Cada parte puede aceptar, rechazar o contraofertar la propuesta activa. El booking se crea unicamente cuando la contraparte acepta explicitamente una propuesta.

## Alcance

Las condiciones negociables son:

- Fecha.
- Hora.
- Precio acordado.
- Mensaje o condiciones adicionales.

Permanecen fijos durante la negociacion:

- Cliente.
- Trabajador.
- Servicio solicitado.
- Categoria.
- Municipio.
- Direccion.

La negociacion aplica solo a solicitudes dirigidas a un trabajador concreto.

## Flujo funcional

### Crear solicitud dirigida

1. El cliente crea una solicitud dirigida a un trabajador.
2. La solicitud se guarda con estado `negotiating`.
3. Se crea la propuesta inicial con las condiciones indicadas por el cliente.
4. Se crea una conversacion nueva y exclusiva para la solicitud entre cliente y trabajador.
5. Se crea un mensaje de solicitud que aparece como una card dentro del chat y muestra los detalles fijos y negociables.
6. Se notifica al trabajador.
7. No se crea ningun booking.

La conversacion usa el mismo identificador de la solicitud. Esto garantiza una conversacion nueva por cada solicitud dirigida, simplifica los enlaces y evita duplicados si se reintenta el batch.

### Responder una propuesta

Solo la contraparte de quien envio la propuesta activa puede responderla.

La contraparte puede:

- `Aceptar`: acepta todas las condiciones de la propuesta.
- `Rechazar`: termina la negociacion.
- `Contraofertar`: crea una nueva propuesta con fecha, hora, precio y condiciones nuevas.

El boton `Contraofertar` abre un modal sobre el chat. El modal conserva la propuesta actual como referencia y permite editar fecha, hora, precio y condiciones. Al enviarlo, se cierra solo cuando la escritura fue confirmada; si ocurre un error, mantiene los datos introducidos.

Cuando se crea una contraoferta:

1. La propuesta activa anterior pasa a estado `countered`.
2. Se crea una propuesta nueva en estado `pending`.
3. La nueva propuesta referencia a la propuesta anterior.
4. El turno de respuesta pasa a la otra parte.
5. Se actualiza el resumen de la conversacion y se notifica a la contraparte.

### Aceptar

La aceptacion se realiza con un batch atomico:

1. La propuesta activa pasa a `accepted`.
2. La solicitud pasa a `scheduled`.
3. La solicitud guarda el identificador de la propuesta aceptada.
4. Se crea exactamente un booking con las condiciones aceptadas.
5. Se crean los documentos iniciales de historial para cliente y trabajador.
6. Se actualiza la conversacion para mostrar la aceptacion.

Una solicitud `scheduled`, `rejected`, `cancelled` o `completed` no admite nuevas propuestas.

### Rechazar

El rechazo se realiza con un batch atomico:

1. La propuesta activa pasa a `rejected`.
2. La solicitud pasa a `rejected`.
3. Se actualiza la conversacion.
4. Se notifica a quien envio la propuesta rechazada.

## Modelo de datos

### `serviceRequests`

Se conservan los campos actuales y se agregan:

- `status`: incluye `negotiating` y `rejected`.
- `activeProposalId`: identificador de la unica propuesta pendiente.
- `acceptedProposalId`: identificador de la propuesta aceptada, si existe.
- `conversationId`: conversacion donde se negocia la solicitud.
- `lastActionBy`: usuario que realizo la ultima accion.
- `updatedAt`: timestamp de servidor.

Al crear una solicitud dirigida:

- `status` es `negotiating`.
- `activeProposalId` apunta a la propuesta inicial.
- `acceptedProposalId` es una cadena vacia.
- `lastActionBy` es el cliente.

### `bookingProposals`

Cada documento contiene:

- `requestId`.
- `conversationId`.
- `clientId`.
- `workerId`.
- `proposedBy`.
- `proposedTo`.
- `parentProposalId`: cadena vacia para la propuesta inicial.
- `scheduledDate`.
- `scheduledTime`.
- `agreedPrice`.
- `conditions`.
- `status`: `pending`, `countered`, `accepted` o `rejected`.
- `createdAt`.
- `updatedAt`.

Solo puede existir una propuesta `pending` por solicitud. La fuente de verdad para encontrarla es `serviceRequests.activeProposalId`.

### `bookings`

Se crea solo al aceptar una propuesta y contiene:

- Los identificadores actuales de solicitud, cliente y trabajador.
- `proposalId`.
- `scheduledAt`, construido desde fecha y hora aceptadas.
- `agreedPrice`.
- `notes`, con las condiciones aceptadas.
- `status: scheduled`.
- Timestamps de servidor.

El identificador del booking sera igual al identificador de la solicitud. Esto hace idempotente la creacion y evita bookings duplicados.

### `conversations`

Cada solicitud dirigida crea una conversacion cuyo identificador es igual a `requestId`.

La conversacion contiene:

- `participantIds`.
- `requestId`.
- `requestTitle`.
- `activeProposalId`.
- `lastMessage`.
- `createdAt`.
- `updatedAt`.

`requestId` y `requestTitle` permanecen inmutables. El inbox puede mostrar varias conversaciones entre el mismo cliente y trabajador cuando corresponden a solicitudes distintas. Cada entrada muestra `requestTitle` para distinguirlas sin realizar una lectura adicional por conversacion.

### `messages`

Los mensajes de texto actuales se conservan. Se agregan mensajes estructurados para representar solicitudes y acciones de negociacion:

- `type`: `text`, `requestCard` o `proposalAction`.
- `action`: `request_created`, `proposal_countered`, `proposal_accepted` o `proposal_rejected`.
- `relatedEntityId`: identificador de la propuesta.

El mensaje inicial `requestCard` muestra:

- Titulo, descripcion, categoria, municipio y direccion.
- Fotos de la solicitud.
- Fecha, hora, precio y condiciones de la propuesta inicial.
- Estado actual.
- Acciones disponibles para la contraparte.

Cada contraoferta agrega otra card `proposalAction` al hilo. Las cards anteriores permanecen visibles como historial, pero solo la card relacionada con `serviceRequests.activeProposalId` es interactiva. Las cards obtienen el estado vigente desde la propuesta relacionada; el mensaje no es la fuente de verdad.

## Componentes y responsabilidades

### `ServiceRequestForm`

- Deja de crear booking e historial al enviar una solicitud dirigida.
- Exige precio inicial para solicitudes dirigidas.
- Crea solicitud, propuesta inicial, conversacion exclusiva y mensaje `requestCard` en un batch.
- Mantiene el comportamiento actual para solicitudes sin trabajador.
- Tras confirmar la escritura, redirige al cliente al nuevo chat para que vea la card creada.

### `ChatThread`

- Recibe un identificador de conversacion, carga sus participantes y resuelve los perfiles publicos para el encabezado.
- Consulta la solicitud y las propuestas relacionadas con la conversacion.
- Renderiza mensajes de texto y cards de solicitud o propuesta en orden cronologico.
- Muestra en cada card los detalles de la solicitud, fecha, hora, precio, condiciones, autor y estado.
- Muestra acciones solo a `proposedTo`.
- Abre un modal de contraoferta desde la card activa, con los valores actuales como base.
- Ejecuta aceptar, rechazar y contraofertar mediante funciones de dominio.

### Modal de contraoferta

- Se renderiza dentro de `ChatThread`.
- Muestra un resumen de la propuesta que se esta respondiendo.
- Permite editar fecha, hora, precio y condiciones.
- Valida campos obligatorios y precio mayor que cero.
- Deshabilita el envio mientras se guarda.
- Conserva los valores y muestra el error si Firestore rechaza la escritura.
- Se cierra al guardar correctamente o al cancelarlo explicitamente.

### Modulo de dominio de negociacion

Se crea un modulo en `lib/` para centralizar:

- Construccion de propuesta inicial.
- Validacion de turno y estado.
- Construccion del batch de contraoferta.
- Construccion del batch de aceptacion.
- Construccion del batch de rechazo.

La UI no decide transiciones por su cuenta.

### `DashboardView`

- Muestra solicitudes en negociacion.
- Enlaza al chat exclusivo de cada solicitud mediante `conversationId`.
- No muestra una solicitud negociando como servicio agendado.

### `MessagesInbox`

- Lista conversaciones por solicitud, aunque cliente y trabajador se repitan.
- Muestra nombre de la contraparte, titulo de la solicitud, ultimo mensaje y fecha.
- Enlaza usando el identificador real de la conversacion.

## Seguridad Firestore

### Solicitudes

- Solo el cliente puede crear una solicitud.
- Una solicitud dirigida debe identificar un trabajador.
- Cliente y trabajador pueden leerla.
- Durante negociacion solo se pueden modificar campos de negociacion y estado.
- Cliente, trabajador, servicio y direccion permanecen inmutables.
- Solo se permiten transiciones validas desde `negotiating`.

### Propuestas

- Solo participantes de la solicitud pueden leerlas.
- La propuesta inicial solo puede crearla el cliente.
- Una contraoferta solo puede crearla `proposedTo` de la propuesta activa.
- `proposedBy` debe ser el usuario autenticado.
- `proposedTo` debe ser la contraparte.
- Precio debe ser numerico y mayor que cero.
- Fecha y hora deben ser cadenas no vacias.
- Una propuesta creada comienza en `pending`.
- Una propuesta pendiente solo puede pasar a `countered`, `accepted` o `rejected`.
- Las relaciones con solicitud, cliente y trabajador permanecen inmutables.

### Booking

- Solo puede crearse al aceptar la propuesta activa.
- Debe usar el mismo cliente, trabajador y solicitud de la propuesta aceptada.
- Debe copiar fecha, hora, precio y condiciones de esa propuesta.
- Su identificador igual al de la solicitud evita duplicados.

### Conversaciones y mensajes

- Los participantes permanecen congelados.
- Cada conversacion queda ligada de forma inmutable a una solicitud dirigida cuyos participantes coinciden.
- La conversacion puede actualizar `activeProposalId`, `lastMessage` y `updatedAt`.
- Los mensajes `proposalAction` deben relacionarse con una propuesta perteneciente a la conversacion y solicitud de los participantes.
- El mensaje `requestCard` inicial debe relacionarse con la propuesta inicial y solo puede crearse junto a la solicitud.

## Manejo de errores y concurrencia

- Todas las transiciones se escriben en batches atomicos.
- Antes de responder, la UI verifica que la propuesta siga pendiente y activa.
- Las reglas Firestore son la autoridad final frente a respuestas simultaneas.
- Si otra parte ya respondio, se muestra: `Esta propuesta ya no esta disponible. Revisa la negociacion actualizada.`
- Las notificaciones son best-effort y no invalidan una negociacion ya confirmada.
- Fallar al crear la solicitud inicial no deja booking, propuesta o conversacion parciales.

## Pruebas

### Componentes

- `ServiceRequestForm` crea solicitud dirigida y propuesta inicial sin booking.
- `ServiceRequestForm` crea una conversacion nueva y un mensaje `requestCard`, luego redirige a ese chat.
- `ChatThread` muestra la card inicial y las contraofertas en el hilo.
- Solo la contraparte ve aceptar, rechazar y contraofertar.
- El modal de contraoferta conserva valores actuales y permite cambiarlos.
- El modal permanece abierto y conserva datos si la escritura falla.
- Cards anteriores permanecen visibles pero no muestran acciones.
- Una accion exitosa actualiza el estado visible.
- Los errores de escritura se muestran sin perder los datos introducidos.

### Dominio y datos

- La propuesta inicial se construye con relaciones y condiciones correctas.
- Contraofertar cambia el turno y enlaza la propuesta anterior.
- Aceptar crea exactamente un booking.
- Rechazar no crea booking.
- No se puede responder una propuesta inactiva o desde el usuario equivocado.

### Reglas Firestore

- Participantes pueden leer solicitud y propuestas propias.
- Terceros no pueden leer ni escribir negociaciones ajenas.
- Solo `proposedTo` puede responder la propuesta activa.
- No se pueden alterar relaciones fijas.
- No se puede crear un booking sin propuesta aceptada.
- No se pueden crear dos bookings para una solicitud.

## Criterios de aceptacion

- Una solicitud dirigida aparece en el chat del trabajador.
- Cada solicitud dirigida crea automaticamente un chat exclusivo con el trabajador.
- Al crearla, el cliente es redirigido al chat y ve una card con sus detalles.
- Crear la solicitud no crea booking.
- Trabajador y cliente pueden alternar contraofertas.
- Cada contraoferta permite cambiar fecha, hora, precio y condiciones.
- Contraofertar abre un modal desde la card activa.
- Cada contraoferta queda visible como una nueva card dentro del hilo.
- Las cards historicas permanecen visibles, pero solo la propuesta activa tiene acciones.
- Solo la contraparte de la propuesta activa puede responder.
- Ambos pueden aceptar o rechazar cuando es su turno.
- Aceptar crea un unico booking con las condiciones acordadas.
- Rechazar termina la negociacion sin crear booking.
- Las acciones quedan visibles en el chat y generan notificaciones.
- Las reglas Firestore bloquean acciones fuera de turno o sobre negociaciones ajenas.

## Fuera de alcance

- Cambiar cliente, trabajador, servicio o direccion durante la negociacion.
- Negociar solicitudes publicas sin trabajador asignado.
- Pagos o cobros.
- Expiracion automatica de propuestas.
- Multiples trabajadores compitiendo por una misma solicitud.
