# BFF NestJS para formulario React + SendGrid

Arquitectura implementada:

React (frontend)
-> BFF (NestJS)
-> SendGrid (envio de correo)

## Variables de entorno

Crea un archivo `.env` tomando como base `.env.example`:

```env
SENDGRID_API_KEY=SG.xxxxxx
SENDGRID_DATA_RESIDENCY=global
EMAIL_FROM=tu-correo@tudominio.com
EMAIL_TO=corporativo@altamirasteel.com,ventas@altamirasteel.com,compras@altamirasteel.com,direccion@altamirasteel.com
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
API_PREFIX=api
SWAGGER_PATH=docs
PORT=3000
```

Notas:

- `SENDGRID_DATA_RESIDENCY=global` usa la region por defecto.
- Si tu subusuario esta pinneado a la UE, usa `SENDGRID_DATA_RESIDENCY=eu`.
- `EMAIL_FROM` debe ser un solo remitente verificado en SendGrid.
- `EMAIL_TO` acepta uno o varios destinatarios separados por coma.

Swagger disponible en:

- `http://localhost:3000/docs`

## Endpoint disponible

`POST /api/contact`

Body JSON esperado:

```json
{
  "name": "Juan Perez",
  "email": "juan@cliente.com",
  "subject": "Consulta de cotizacion",
  "message": "Hola, me interesa una cotizacion de acero."
}
```

Comportamiento:

- Envia correo principal al buzon corporativo (`EMAIL_TO`, por defecto `corporativo@altamirasteel.com`).
- Envia respuesta automatica al remitente (`email`) con mensaje de confirmacion.

Respuesta del API:

```json
{
  "message": "Mensaje recibido. Te responderemos en breve."
}
```

## Conexion desde React (ejemplo)

```ts
await fetch('http://localhost:3000/api/contact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: form.name,
    email: form.email,
    subject: form.subject,
    message: form.message,
  }),
});
```

## Ejecutar

```bash
npm install
npm run start:dev
```
