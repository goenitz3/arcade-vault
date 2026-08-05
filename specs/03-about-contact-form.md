# SPEC 03 — About page y formulario de contacto con Resend

> **Estado:** Aprovado
> **Depende de:** 02-landing-page
> **Fecha:** 2026-08-05
> **Objetivo:** Portar la página "Acerca de" de `references/templates/home-about/about.jsx` a `/about`, conectando su formulario de contacto a un envío real de correo vía Resend a través de una API route.

## Alcance

**Dentro:**

- Nueva página `/about`, portada de `references/templates/home-about/about.jsx`:
  hero "Acerca de" (misión + 3 highlights), banner divisor decorativo y sección
  de contacto (intro + formulario).
- Formulario de contacto (nombre, correo, mensaje) con validación mínima en
  cliente (campos no vacíos → shake de error, igual que el template).
- API route `app/api/contact/route.ts` (`POST`) que recibe los datos del
  formulario, valida en servidor que ningún campo esté vacío, y envía un
  correo real vía Resend a una dirección fija del equipo (`CONTACT_TO_EMAIL`
  en `.env.local`).
- Remitente ("from") con el dominio de prueba de Resend
  (`onboarding@resend.dev`), documentado como placeholder a reemplazar cuando
  haya dominio verificado.
- Estado de éxito: terminal falso del template ("MENSAJE RECIBIDO...") se
  muestra solo tras confirmar que Resend aceptó el envío (respuesta 2xx de la
  API route), no de forma optimista.
- Estado de error: si la API route falla (Resend rechaza, red caída, env var
  faltante), el formulario muestra un mensaje de error y permanece editable
  con los datos que el usuario ya escribió (no se pierde el texto).
- Migrar a `app/globals.css` las clases de `ABOUT PAGE` (líneas 1071–1150 de
  `references/templates/home-about/styles.css`): `.about`, `.about-hero`,
  `.highlight-row`, `.about-divider`, `.about-contact`, `.contact-grid`,
  `.contact-form`, `.terminal-success`, etc.
- Agregar el enlace "Acerca de" → `/about` a `components/Nav.tsx`, en desktop
  y en el panel móvil, con estado activo cuando `pathname === "/about"`.
- Instalar y configurar el SDK `resend` como dependencia del proyecto.
- Variables de entorno nuevas en `.env.local` (no versionado): `RESEND_API_KEY`,
  `CONTACT_TO_EMAIL`. Se documenta un `.env.local.example` con los nombres
  (sin valores reales).

**Fuera de alcance (para specs futuras):**

- Correo de confirmación automático al usuario que llenó el formulario (solo
  se notifica al equipo).
- Validación de formato de email (regex) o límites de longitud del mensaje:
  se mantiene la validación mínima del template (solo "no vacío").
- Rate limiting o protección anti-spam (captcha, honeypot) del endpoint.
- Persistencia de los mensajes de contacto (no se guardan en ningún lado más
  allá de reenviarlos por correo).
- Dominio verificado propio en Resend: se usa el remitente de prueba hasta
  que el usuario tenga uno.
- Tests automatizados.

## Modelo de datos

La página no introduce entidades de dominio persistentes (no toca
`localStorage` ni `lib/types.ts`). Sí define el contrato entre el formulario
cliente y la API route:

```ts
// app/api/contact/route.ts

type ContactPayload = {
  name: string;
  email: string;
  message: string;
};
```

- El `POST` a `/api/contact` recibe `ContactPayload` como JSON en el body.
- Validación en servidor: si `name`, `email` o `message` vienen vacíos (tras
  `.trim()`), responde `400` con `{ error: string }`.
- Si Resend acepta el envío, responde `200` con `{ ok: true }`.
- Si Resend falla (API key inválida, rate limit, error de red), responde
  `502` con `{ error: string }` genérico (sin exponer detalles internos de
  Resend al cliente).
- El componente `ContactForm` (cliente) mantiene el mismo estado local que
  el template (`form`, `sent`, `shake`), agregando un cuarto estado
  `error: string | null` para pintar el mensaje de fallo.

**Variables de entorno** (`.env.local`, no versionado):

```
RESEND_API_KEY=       # API key de Resend, usada solo server-side
CONTACT_TO_EMAIL=     # correo del equipo que recibe los mensajes
```

Se agrega `.env.local.example` con estas dos claves sin valores, para que
cualquiera que clone el repo sepa qué configurar.

## Plan de implementación

Cada paso deja la aplicación compilando y navegable. Verificación manual con
`npm run dev`; al cerrar cada paso, `npx tsc --noEmit` y `npm run lint` en
verde.

1. **Dependencia y variables de entorno.** Instalar `resend` (`npm install
   resend`). Crear `.env.local` (no versionado, ya cubierto por `.env*` en
   `.gitignore`) con `RESEND_API_KEY` y `CONTACT_TO_EMAIL`. Crear
   `.env.local.example` con ambas claves sin valores.
   Verificación: `resend` aparece en `package.json`; `.env.local.example`
   existe y no contiene secretos.

2. **CSS de la página.** Migrar a `app/globals.css` las clases de `ABOUT
   PAGE` (líneas 1071–1150 de
   `references/templates/home-about/styles.css`): `.about`, `.about-hero`,
   `.highlight-row`, `.highlight`, `.about-divider`, `.about-contact`,
   `.contact-grid`, `.contact-intro`, `.contact-tips`, `.contact-form`,
   `.field`, `.terminal-success`, `.shake`.
   Verificación: las clases existen en `globals.css` y no chocan con nombres
   ya usados (`grep` previo de cada selector nuevo contra el archivo).

3. **Íconos e ícono de highlight.** Crear `components/about/HighlightIcon.tsx`
   (servidor), portando los 3 SVG (`HEART`, `BROWSER`, `PLANT`) del template.
   Verificación: renderiza aislado sin errores de consola.

4. **API route de contacto.** Crear `app/api/contact/route.ts` con `POST`:
   valida `ContactPayload` (400 si falta algún campo), llama a
   `resend.emails.send` (`from: "onboarding@resend.dev"`,
   `to: process.env.CONTACT_TO_EMAIL`, asunto y cuerpo con nombre/correo/
   mensaje del remitente), responde 200 en éxito y 502 en fallo de Resend.
   Verificación: probar con `curl`/Thunder Client contra
   `http://localhost:3000/api/contact` con un payload válido y confirmar que
   llega el correo; probar con un campo vacío y confirmar 400.

5. **Formulario de contacto.** Crear `components/about/ContactForm.tsx`
   (`"use client"`), portando el formulario y el `terminal-success` del
   template, pero reemplazando el `setSent` optimista por un `fetch("/api/
   contact", { method: "POST", ... })`. Estados: `idle` → `sending` →
   `sent` | `error`. En `error`, mostrar línea de error en el propio
   `terminal-success` (variante `[ERROR] ...`) y permitir reintentar sin
   perder los datos escritos.
   Verificación: envío exitoso muestra el terminal de éxito; desconectar
   `RESEND_API_KEY` (o poner una inválida) y confirmar que se muestra el
   estado de error y el formulario sigue editable.

6. **Página `/about`.** Crear `app/about/page.tsx` (servidor): hero
   "ACERCA DE ARCADE VAULT" + 3 highlights, banner divisor, sección de
   contacto (`contact-intro` + `<ContactForm />`). Sin `Reveal` en el hero
   (visible de inmediato), con `Reveal` en el divisor y la sección de
   contacto, igual patrón que la landing.
   Verificación: `/about` muestra las 3 secciones; las animadas aparecen al
   hacer scroll.

7. **Nav.** Agregar a `components/Nav.tsx` el enlace "Acerca de" → `/about`
   (activo cuando `pathname === "/about"`), en el bloque desktop y en el
   panel móvil.
   Verificación: en `/about` se resalta "Acerca de" y ningún otro enlace; en
   el resto de rutas, "Acerca de" no aparece activo.

## Criterios de aceptación

### General

- [ ] `npm run build` termina sin errores y `npx tsc --noEmit` no reporta nada.
- [ ] `npm run lint` pasa sin errores ni advertencias.
- [ ] `.env.local` no está versionado (`git status` no lo muestra); existe
      `.env.local.example` con `RESEND_API_KEY` y `CONTACT_TO_EMAIL` sin valores.

### Página `/about`

- [ ] `/about` muestra el hero "ACERCA DE ARCADE VAULT" con el texto de
      misión y los 3 highlights (HEART, BROWSER, PLANT).
- [ ] El banner divisor y la sección de contacto aparecen con la animación
      de scroll (clase `in` se agrega al entrar en el viewport).
- [ ] La sección de contacto muestra los 3 tips (respuesta 24-48h,
      sugerencias bienvenidas, sin spam) y el formulario con los 3 campos
      (nombre, correo, mensaje).
- [ ] No hay advertencias de hidratación en consola al cargar `/about`.

### Formulario de contacto

- [ ] Enviar el formulario con algún campo vacío dispara el "shake" y no
      hace ninguna petición de red.
- [ ] Enviar el formulario completo con `RESEND_API_KEY`/`CONTACT_TO_EMAIL`
      válidos hace que llegue un correo real a `CONTACT_TO_EMAIL` con el
      nombre, correo y mensaje del remitente, y muestra el terminal de éxito
      con el nombre en mayúsculas.
- [ ] "ENVIAR OTRO MENSAJE" desde el estado de éxito limpia el formulario y
      permite un nuevo envío.
- [ ] Si la API route responde con error (probar con una `RESEND_API_KEY`
      inválida), el formulario muestra un estado de error sin perder los
      datos ya escritos, y permite reintentar.
- [ ] `POST /api/contact` con un campo vacío responde `400`; con los 3
      campos completos y Resend disponible, responde `200`.

### Nav

- [ ] En `/about`, el enlace "Acerca de" aparece activo y ningún otro
      enlace lo está.
- [ ] El panel lateral móvil muestra "Acerca de" con el mismo
      comportamiento de activo/inactivo.

## Decisiones tomadas y descartadas

### Envío de correo

- **Sí:** API route (`app/api/contact/route.ts`) en lugar de Server Action,
  para mantener el formulario cliente desacoplado de una función server-only
  y poder probar el endpoint directamente con `curl`/herramientas HTTP
  durante el desarrollo.
- **Sí:** un único correo de notificación al equipo, sin auto-respuesta al
  usuario. Menor alcance y menos decisiones de copy; se puede añadir en una
  spec futura si se necesita.
- **Sí:** remitente `onboarding@resend.dev` (dominio de prueba de Resend)
  como `from`, documentado explícitamente como placeholder a reemplazar
  cuando el proyecto tenga un dominio verificado.
- **No:** guardar los mensajes de contacto en algún almacenamiento
  (`localStorage`, archivo, base de datos). Se reenvían por correo y no se
  persisten en ningún otro lado.

### Validación

- **Sí:** mantener la validación mínima del template (campos no vacíos,
  tanto en cliente como en servidor), en vez de agregar regex de email o
  límites de longitud. Consistente con el resto del proyecto, que evita
  validaciones complejas donde no hay lógica de negocio real detrás.
- **No:** rate limiting o protección anti-spam (captcha, honeypot). Fuera de
  alcance por ahora; el proyecto no tiene usuarios reales todavía.

### Manejo de errores

- **Sí:** el estado de éxito del template ("MENSAJE RECIBIDO...") ahora
  depende de una respuesta 2xx real de la API route, no es optimista.
  Necesario porque a diferencia del template (simulado), aquí el envío
  puede fallar de verdad.
- **Sí:** agregar un estado de error visible en el formulario (variante del
  mismo `terminal-success` con línea `[ERROR] ...`), en vez de fallar
  silenciosamente o perder los datos escritos. El usuario no debe re-escribir
  su mensaje si Resend falla momentáneamente.

### Navegación

- **Sí:** agregar "Acerca de" → `/about` al Nav (desktop y panel móvil) en
  esta misma spec, ya que spec 02 solo lo pospuso por no existir la página
  todavía.
- **Sí:** ruta `/about` (inglés) en vez de `/acerca-de`, consistente con la
  decisión ya tomada en spec 02 para `/games` pese al resto de rutas en
  español. Se mantiene la misma inconsistencia de nomenclatura ya documentada
  y aceptada.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El remitente de prueba `onboarding@resend.dev` de Resend solo permite enviar al correo verificado del dueño de la cuenta (no a cualquier `CONTACT_TO_EMAIL`) hasta que exista un dominio propio verificado. | Documentado en el Alcance y en Decisiones: es un placeholder temporal. `CONTACT_TO_EMAIL` debe configurarse con el correo verificado de la cuenta de Resend usada en desarrollo. |
| Sin rate limiting, el endpoint `/api/contact` puede recibir spam o abuso si la URL se descubre. | Aceptado explícitamente fuera de alcance; se documenta como riesgo conocido a resolver en una spec futura si se vuelve un problema real. |
| `RESEND_API_KEY` mal configurada o ausente en producción haría fallar todos los envíos silenciosamente si no se revisa el estado de error en el formulario. | El estado de error del formulario (paso 5 del plan) hace visible el fallo al usuario; además, la API route puede loguear el error server-side para diagnóstico. |
| Sin validación de formato de email, un usuario puede enviar un correo con formato inválido y el equipo no podrá responderle. | Aceptado: mismo criterio que el template, prioriza simplicidad sobre validación exhaustiva; se puede añadir en una spec futura si se vuelve un problema recurrente. |
