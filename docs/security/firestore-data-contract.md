# Contrato de datos públicos y privados

## Colecciones de perfiles

- `users/{uid}`: perfil privado. Contiene correo y teléfono. Solo puede leerlo o editarlo su propietario; administración puede leerlo para soporte.
- `publicProfiles/{uid}`: identidad pública mínima para chat: `uid`, `role`, `fullName`, `municipality` y `avatarUrl`.
- `workerProfiles/{uid}`: perfil consultable del directorio. Incluye identidad pública, datos profesionales, `verified` y `published`. Solo los documentos con `published == true` admiten lectura pública.
- `workerVerifications/{uid}`: revisión privada. Contiene `status`, `notes`, `reviewedAt` y `reviewedBy`. Solo el trabajador propietario y administración pueden leerla; solo administración puede escribirla.
- `roles/{uid}`: autorización administrativa. Debe aprovisionarse fuera del cliente con `{ role: "admin" }`.

El registro crea `users`, `publicProfiles` y, para trabajadores, `workerProfiles` en un único batch después de crear la cuenta de Auth. El inicio de sesión y la edición de perfil reparan y sincronizan la identidad pública desde los datos privados del propietario. Las notificaciones posteriores son best-effort y no invalidan una escritura principal ya confirmada.

Los perfiles heredados sin `published == true` no son públicos. Al revisar un trabajador desde AdminPanel, el mismo batch sincroniza `publicProfiles`, reemplaza el perfil profesional con una forma segura, escribe la auditoría privada en `workerVerifications` y publica únicamente los perfiles verificados.

Los cambios de estado de una solicitud hechos por administración se propagan en un único batch a sus `bookings` y a los dos documentos de `jobHistory`. Así, panel, agenda e historial muestran el mismo estado.

## Reglas

El archivo `firestore.rules` aplica estas fronteras:

- La lectura pública nunca alcanza `users` ni `workerVerifications`.
- Un trabajador no puede verificarse a sí mismo ni guardar metadatos administrativos en `workerProfiles`.
- SearchDirectory consulta únicamente `workerProfiles` con `published == true`.
- El inbox y el chat resuelven nombres desde `publicProfiles`; el directorio mantiene la identidad pública en `workerProfiles`.
- Las notificaciones congelan destinatario y actor. Su creación para terceros exige administración o una relación validable; el destinatario solo puede modificar `read`.
- Las conversaciones congelan participantes y relación. Los mensajes solo admiten las actualizaciones seguras necesarias para lectura.
- La creación idempotente de una conversación usa los dos participantes públicos y no depende de leer previamente un documento inexistente.
- Los bookings se crean únicamente desde una solicitud pendiente o programada del mismo cliente y trabajador. Las relaciones críticas quedan congeladas y los estados de participantes solo avanzan por transiciones permitidas; administración puede corregirlos para mantener sincronía.
- El historial exige una relación válida con la solicitud o booking, incluso cuando se crea junto al booking en un batch.
- Las evidencias se consultan por `bookingId`; solo las partes del booking y administración pueden leerlas, y únicamente el trabajador relacionado o administración pueden escribirlas.
- Cada reseña usa el `bookingId` como identificador, exige rating numérico entre 1 y 5 y comentario entre 3 y 1000 caracteres, y solo puede crearla el cliente de un booking completado.

Antes de desplegar, valida las reglas con Firebase Emulator Suite y aprovisiona la colección `roles` desde un entorno administrativo confiable. Las reglas no se despliegan automáticamente desde esta aplicación.

Ejecuta `npm run test:rules` para validar las reglas reales contra Firestore Emulator. La suite normal omite esas pruebas cuando `FIRESTORE_EMULATOR_HOST` no está definido.
