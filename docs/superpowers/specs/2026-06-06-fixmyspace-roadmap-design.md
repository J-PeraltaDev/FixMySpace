# FixMySpace Roadmap Design

## Objetivo

Dotar a FixMySpace de mayor identidad visual, una experiencia guiada, validaciones solidas y un flujo de servicios mas confiable, manteniendo la estructura actual de Next.js con Firebase y Tailwind.

## Contexto del proyecto

La aplicacion usa Next.js 16.2.7 con App Router, React 19.2.4, Firebase 12.14.0 y Tailwind 4. Las paginas viven en `app/*`, los componentes interactivos en `components/*`, los tipos y acceso a datos en `lib/*`, y los estilos globales en `app/globals.css`.

Las guias locales consultadas en `node_modules/next/dist/docs/` fueron:

- `01-app/01-getting-started/05-server-and-client-components.md`
- `01-app/02-guides/environment-variables.md`
- `01-app/01-getting-started/12-images.md`
- `01-app/02-guides/testing/jest.md`

La aplicacion ya usa componentes cliente para autenticacion, Firestore en tiempo real y formularios. El roadmap conserva ese enfoque porque varias pantallas dependen de `onSnapshot`, `localStorage`, estados locales y subida de archivos.

## Roadmap aprobado

### Fase 1: Fundaciones

Esta fase estabiliza configuracion, datos, componentes compartidos, validacion y pruebas base.

Alcance:

- Mover la configuracion publica de Firebase a variables `NEXT_PUBLIC_*`.
- Crear `hooks/useCollection.ts` para lectura centralizada de colecciones Firestore.
- Extraer `MetricCard`, `SectionCard`, `LoadingSkeleton` y `Field`.
- Refactorizar `SearchDirectory`, `DashboardView`, `HistoryTimeline` y `MessagesInbox` para reducir duplicacion de `useEffect`, `loading`, `error` y mapeo de documentos.
- Configurar Jest con `next/jest`, React Testing Library y `@testing-library/jest-dom`.
- Incorporar React Hook Form y Zod inicialmente en `ServiceRequestForm`.
- Mantener idioma principal en espanol y Tailwind como sistema de estilos.

Entregable verificable:

- La app compila.
- El lint pasa.
- Las pantallas refactorizadas conservan su comportamiento actual.
- El formulario de solicitud muestra errores por campo y deshabilita el envio cuando es invalido.
- Existe al menos una prueba de cada superficie critica prevista: directorio, solicitud, chat y admin. Si una prueba completa depende de una fase posterior, se deja cubierta la parte existente con mocks.

### Fase 2: Identidad Visual y UX Guiada

Esta fase mejora la primera impresion y la orientacion de usuarios.

Alcance:

- Redisenar `app/page.tsx` con imagen de heroe usando `next/image`.
- Sustituir el bloque de ventajas por tarjetas ilustradas de categorias de servicio con enlace a `/buscar`.
- Agregar onboarding post-registro con modal para crear solicitud, buscar trabajadores y usar chat.
- Guardar bandera en `localStorage` para no repetir el onboarding.
- Mejorar `SearchDirectory` con orden por precio, calificacion y distancia.
- Reforzar visualmente trabajadores verificados con insignia verde consistente.
- Ampliar el perfil del trabajador con seccion “Galeria”.
- Agregar campo “Sobre mi” editable desde `ProfileForm` y visible en `WorkerProfileView`.

Entregable verificable:

- Home tiene identidad visual clara desde el primer viewport.
- El onboarding aparece solo tras registro o primera sesion sin bandera local.
- El directorio permite filtrar y ordenar sin perder resultados existentes.
- El perfil de trabajador muestra biografia y galeria aunque no haya fotos.

### Fase 3: Flujo de Servicio y Chat Enriquecido

Esta fase cambia el flujo operativo principal de solicitudes, negociacion y chat.

Alcance:

- Eliminar la creacion automatica de `bookings` al crear una solicitud con trabajador seleccionado.
- Permitir que el trabajador acepte, rechace o proponga otra fecha.
- Permitir que el cliente acepte la propuesta o cree una contraoferta.
- Repetir el ciclo hasta que una propuesta quede aceptada o la solicitud sea cancelada.
- Crear `booking` solo cuando ambas partes aceptan una fecha.
- Permitir confirmaciones, cancelaciones y modificaciones tambien desde el chat mediante mensajes de accion.
- Mejorar chat con indicador de escritura, envio de imagenes y confirmaciones de lectura.
- Ampliar mensajes con `read`, `attachments` y `type`.
- Mantener actualizacion del UI con `onSnapshot`.

Entregable verificable:

- Crear una solicitud dirigida a un trabajador no crea booking inmediatamente.
- Trabajador y cliente pueden negociar fecha hasta aceptar.
- El booking aparece solo tras aceptacion final.
- Las acciones relevantes tambien quedan visibles en la conversacion.
- El chat muestra imagenes, lectura y estado de escritura.

### Fase 4: Historial Unificado y Seguridad

Esta fase consolida auditoria funcional, evidencias, resenas y seguridad.

Alcance:

- Fusionar timeline, conversacion, resenas y evidencias en una vista cronologica.
- Ajustar `HistoryTimeline` y `EvidenceManager` para mostrar mensajes, fotos, eventos, reseñas y acciones por fecha.
- Permitir enviar mensajes, resenas y fotos desde la misma vista de historial.
- Documentar reglas Firestore y seguridad en `docs/firestore-security.md`.
- Definir coleccion `roles` con permisos por rol.
- Usar `serverTimestamp` en acciones importantes.
- Asegurar que cada usuario solo pueda leer o escribir sus propios datos, salvo permisos de admin.

Entregable verificable:

- Historial muestra contenido cronologico de servicio sin separar artificialmente chat, evidencias y resenas.
- La documentacion de seguridad describe reglas por coleccion.
- Las acciones importantes tienen timestamps de servidor.
- El modelo de roles queda documentado y listo para reglas Firestore.

## Arquitectura propuesta

### Hooks de datos

Crear `hooks/useCollection.ts`.

API objetivo:

```ts
type CollectionFilter = {
  field: string;
  op: WhereFilterOp;
  value: unknown;
};

type CollectionOrder = {
  field: string;
  direction?: "asc" | "desc";
};

type UseCollectionOptions = {
  enabled?: boolean;
  realtime?: boolean;
  orderBy?: CollectionOrder[];
};

function useCollection<T>(
  path: string,
  filters?: CollectionFilter[],
  options?: UseCollectionOptions,
): {
  data: T[];
  loading: boolean;
  error: string;
};
```

Comportamiento:

- `enabled: false` evita leer Firestore y devuelve estado estable.
- `realtime: true` usa `onSnapshot`.
- `realtime: false` usa `getDocs`.
- El hook transforma cada documento a `{ id, ...data }`.
- Los errores se exponen como texto en espanol apto para UI.
- Los componentes pueden aplicar transformaciones especificas fuera del hook cuando necesiten enriquecer datos.

### Componentes reutilizables

Crear en `components/ui/`:

- `MetricCard.tsx`: tarjeta compacta para metricas con `label`, `value`, `loading`.
- `SectionCard.tsx`: contenedor visual para secciones, con `title`, `actions`, `children`.
- `LoadingSkeleton.tsx`: esqueletos parametrizables por cantidad, alto y variante.
- `Field.tsx`: envoltorio de campo con `label`, `error`, `hint`, `children`.

Estos componentes reemplazan patrones repetidos sin cambiar toda la estetica de golpe.

### Formularios y validacion

Instalar:

- `react-hook-form`
- `zod`
- `@hookform/resolvers`

Patron:

- Definir esquemas en `lib/validation.ts` o `lib/validation/*.ts` si crecen.
- Usar `zodResolver`.
- Configurar formularios con `mode: "onChange"` para poder deshabilitar submit hasta que sean validos.
- Mostrar mensajes junto a cada `Field`.
- Mantener mensajes en espanol.

Primera migracion:

- `ServiceRequestForm`, con minimo de 20 caracteres en descripcion.

Migraciones posteriores:

- `LoginPanel`, `ProfileForm`, `SupportReportForm`, `RatingForm` y formularios de chat/booking segun avance cada fase.

### Modelo de datos

#### `serviceRequests`

Campos actuales conservados:

- `clientId`
- `workerId`
- `title`
- `description`
- `category`
- `municipality`
- `address`
- `preferredDate`
- `preferredTime`
- `photos`
- `status`
- `createdAt`

Campos nuevos:

- `updatedAt`
- `acceptedProposalId`
- `lastActionBy`

Estados:

- `pending`
- `accepted`
- `rejected`
- `negotiating`
- `scheduled`
- `completed`
- `cancelled`

#### `bookingProposals`

Nueva coleccion para negociacion de fecha.

Campos:

- `requestId`
- `clientId`
- `workerId`
- `proposedBy`
- `scheduledAt`
- `status`: `pending`, `accepted`, `rejected`, `cancelled`
- `message`
- `createdAt`
- `updatedAt`

#### `bookings`

Se crea solo tras propuesta aceptada.

Campos conservados:

- `requestId`
- `clientId`
- `workerId`
- `scheduledAt`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

Estados recomendados:

- `scheduled`
- `confirmed`
- `completed`
- `cancelled`
- `modification_requested`

#### `conversations`

Campos actuales conservados:

- `participantIds`
- `lastMessage`
- `updatedAt`

Campos nuevos:

- `typingBy`
- `lastReadAt`
- `relatedRequestId`
- `relatedBookingId`

#### `messages`

Campos actuales conservados:

- `conversationId`
- `senderId`
- `text`
- `attachments`
- `createdAt`

Campos nuevos:

- `read`
- `readAt`
- `type`: `text`, `image`, `system`, `bookingAction`
- `action`
- `relatedEntityId`

#### `workerProfiles`

Campos nuevos:

- `aboutMe`
- `gallery`

`gallery` puede ser un arreglo de objetos o una subcoleccion. Para mantener bajo el costo de la fase 2, se recomienda iniciar con arreglo:

```ts
type WorkerGalleryItem = {
  imageUrl: string;
  description?: string;
  createdAt?: unknown;
};
```

Si la galeria crece o requiere eliminacion individual granular, migrar a subcoleccion en una fase posterior.

#### `roles`

Nueva coleccion de permisos por rol.

Documento recomendado:

- `roles/cliente`
- `roles/trabajador`
- `roles/admin`

Campos:

- `permissions`: string[]
- `updatedAt`

La UI puede leerlos para mostrar capacidades, pero las reglas Firestore deben seguir siendo la autoridad.

## Seguridad

Crear `docs/firestore-security.md` con reglas esperadas por coleccion.

Principios:

- Un usuario lee y escribe solo documentos donde su `uid` aparece como propietario o participante.
- Trabajadores leen solicitudes dirigidas a ellos o publicas segun el flujo definido.
- Clientes escriben sus solicitudes y propuestas propias.
- Trabajadores escriben respuestas, propuestas y evidencias propias.
- Admin puede leer y actualizar colecciones operativas.
- Ningun rol se deriva solo del cliente sin validacion en reglas.
- Toda accion relevante usa `serverTimestamp`.

## Pruebas

Configurar Jest segun guia local de Next:

- `jest.config.ts`
- `jest.setup.ts`
- script `test`

Pruebas previstas:

- `SearchDirectory.test.tsx`: filtros, ordenamientos e insignia verificada.
- `ServiceRequestForm.test.tsx`: errores por campo, descripcion minima, submit deshabilitado y payload sin booking automatico cuando aplique la fase 3.
- `ChatThread.test.tsx`: render de mensajes, envio basico, lectura de adjuntos y estados enriquecidos segun fase.
- `AdminPanel.test.tsx`: metricas, cambio de estado y acciones de verificacion con mocks.

Mocks:

- Firebase Firestore y Storage se mockean.
- `useAuth` se mockea con perfiles `cliente`, `trabajador` y `admin`.
- No se conectan pruebas a Firestore real.

## Riesgos y mitigaciones

### Credenciales Firebase publicas

La config web de Firebase no es un secreto estricto, pero debe moverse a `NEXT_PUBLIC_*` para separar ambientes y evitar hardcodeo.

### Reglas de seguridad incompletas

La UI por rol no protege datos por si sola. La fase 4 debe dejar reglas documentadas y listas para implementacion en Firebase CLI.

### Flujo de booking complejo

La negociacion de fechas puede generar estados ambiguos. Se evita creando `bookingProposals` como historial claro de propuestas y dejando `bookings` solo para acuerdos aceptados.

### Chat como canal de acciones

Las acciones hechas desde chat deben escribir tambien en las colecciones fuente. Un mensaje de accion no debe ser la unica fuente de verdad.

### Galeria del trabajador

Un arreglo en `workerProfiles` es suficiente para una primera galeria simple. Si se requiere borrar, moderar o paginar fotos, debe migrarse a subcoleccion.

## Criterios globales de aceptacion

- La app mantiene idioma principal en espanol.
- Se conserva Tailwind como sistema de estilos.
- Las estructuras existentes se mantienen salvo nuevas carpetas `hooks`, `components/ui` y `docs`.
- Cada fase deja una app compilable y verificable.
- Las nuevas funcionalidades tienen pruebas acordes al riesgo.
- Los cambios de datos quedan reflejados en tipos TypeScript.
- Las acciones importantes usan timestamps de servidor.
- El flujo final no crea booking hasta aceptacion explicita de fecha.

## Fuera de alcance inicial

- Migrar todo Firebase a Server Actions.
- Implementar Firebase CLI si no existe en el proyecto.
- Reemplazar toda la paleta visual de una sola vez.
- Conectar pruebas a un proyecto real de Firebase.
- Implementar pagos, geolocalizacion real o matching automatico avanzado.
