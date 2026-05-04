# PWA / Push prep

Base preparada para una siguiente fase de push notifications.

Pendiente para activar push real:

1. Registrar `service worker` dedicado para push.
2. Generar y guardar `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`.
3. Crear endpoint backend para guardar `PushSubscription` por usuario/dispositivo.
4. Solicitar permiso del navegador desde frontend.
5. Enviar push desde backend o n8n cuando existan eventos de negocio.

Datos recomendados para futura tabla de subscriptions:

- `id`
- `userId`
- `endpoint`
- `p256dh`
- `auth`
- `userAgent`
- `createdAt`
- `updatedAt`

Eventos candidatos:

- `inspection_assigned`
- `inspection_ready_for_review`
- `inspection_returned_for_correction`
- `inspection_finalized`
- `inspection_cancelled`
- `inspection_rescheduled`
