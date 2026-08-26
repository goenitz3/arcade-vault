---
name: juego-nuevo-impl
description: Implementa una spec aprobada generada por /juego-nuevo (portar un juego de references/started-games/ con leaderboard real). Valida que el estado sea "Aprobado", crea una rama git con el nombre de la spec, y empieza la implementación paso a paso con pausas para revisar diff.
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(cat:*), Bash(ls:*)
---

# /juego-nuevo-impl — Implementador de specs de juego aprobadas

## Contexto de sesión

Estado actual del repo:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles en esta carpeta:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Config de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, sin archivo de config)"`

---

## Instrucciones

Esta skill es una variante de `/spec-impl` restringida a specs generadas por
`/juego-nuevo` (portar un juego de `references/started-games/` con motor
propio y leaderboard real en Supabase). Sigue las mismas cuatro fases y las
mismas reglas duras que `/spec-impl`; el único añadido es un recordatorio de
verificación específico de dominio al terminar el plan (Fase 4).

Sigue estas cuatro fases en orden estricto. **No avances a la siguiente fase
si la anterior no se completó correctamente.**

---

### Fase 1 — Identificar la spec

El argumento recibido es: `$ARGUMENTS`

Si `$ARGUMENTS` está vacío:

- Lista los archivos disponibles en `specs/` (ya los tienes arriba).
- Pide al usuario que especifique el nombre exacto de la spec.
- Detente y espera respuesta. No continúes.

Si `$ARGUMENTS` tiene un valor:

- Busca el archivo en `specs/`. El usuario puede haber escrito el nombre
  completo (`07-tetris`), solo el número (`07`), o solo el slug (`tetris`).
  Intenta encontrar el archivo correcto en cualquiera de esos casos.
- Si no encuentras el archivo, muestra las specs disponibles y pide al
  usuario corregir el nombre.
- Si lo encuentras, continúa a la Fase 2.

---

### Fase 2 — Validar el estado de la spec

Lee el archivo de la spec que localizaste en la Fase 1 con la herramienta
Read o `cat`.

En el contenido, busca la línea que contiene el estado de la spec. La
etiqueta del header suele ser `**Estado:**` (español) o `**Status:**`
(inglés), pero puede estar en cualquier idioma. Identifícala por posición
(línea de estado cerca del inicio de la spec) y por el contexto de máquina
de estados, no por la etiqueta exacta.

**Regla absoluta:** solo puedes continuar si el estado **significa
"Aprobado"** — sin importar el idioma usado.

Trata cualquiera de los siguientes (y sus equivalentes en otros idiomas)
como estado **Aprobado** y continúa:

- Español: `Aprobado`
- Inglés: `Approved`
- Portugués: `Aprovado`
- Francés: `Approuvé`
- …o cualquier otra palabra que claramente signifique "aprobado"

Cualquier otro valor (Borrador/Draft, En revisión/In review,
Implementado/Implemented, Obsoleto/Obsolete, o cualquier valor no
reconocido) significa **detente** y muestra el mensaje de error estándar.

Si no estás seguro de si un valor significa "aprobado", **no asumas**.
Detente y pide al usuario que aclare o actualice la spec a la redacción
canónica.

**Mensaje de error estándar cuando el estado no significa Aprobado:**

```
❌ No puedo implementar esta spec.

Estado actual: [ESTADO ENCONTRADO]
Solo trabajo con specs cuyo estado signifique "Aprobado" (p. ej. `Aprobado`,
`Approved`, o el equivalente en otro idioma).

Para continuar tienes dos opciones:
  1. Si la spec ya está lista para implementarse, ábrela y cambia el estado
     a "Aprobado" (o el término equivalente que use tu equipo) manualmente.
     Ese cambio lo hace un humano, no el agente.
  2. Si la spec todavía necesita trabajo, usa /juego-nuevo [nombre] para
     retomarla.
```

No ofrezcas alternativas, no sugieras "puedo empezar igual si quieres". El
bloqueo es intencional.

---

### Fase 3 — Crear la rama git y cambiar a ella

Una vez confirmado que el estado significa `Aprobado`:

1. Deriva el nombre de la rama a partir del nombre completo del archivo de
   la spec, sin extensión. Formato: `spec-NN-slug`. Ejemplos:

   - `07-tetris.md` → rama `spec-07-tetris`
   - `08-arkanoid.md` → rama `spec-08-arkanoid`

2. Lee la bandera `AutoCreateBranch` de la config mostrada arriba en el
   contexto de sesión.

   - Si el archivo de config no existe, el valor falta, o es irreconocible
     → trátalo como `true` (el default).
   - Solo un `false` explícito (en cualquier capitalización) desactiva la
     creación automática de rama.

   **Si `AutoCreateBranch` es `true` (default):** procede sin preguntar.

   - Si la rama **no existe**: créala con `git checkout -b spec-NN-slug`.
   - Si **ya existe**: informa al usuario que la rama ya existía (puede
     significar que se está retomando trabajo previo).
   - En ambos casos: cambia a la rama con `git checkout spec-NN-slug` y
     confirma que el cambio fue exitoso antes de continuar.

   **Si `AutoCreateBranch` es `false`:** pregunta antes de tocar git.
   Muestra:

   ```
   AutoCreateBranch está en false.
   ¿Crear y cambiar a la rama spec-NN-slug? [y/N]
   ```

   - Si el usuario responde **sí**: crea/cambia a la rama exactamente igual
     que en el caso `true` de arriba.
   - Si el usuario responde **no** o deja vacío: **no crees ninguna rama.**
     Dile al usuario que implementarás en la rama actual (la mostrada en el
     contexto de sesión arriba) y pide confirmación explícita para
     continuar ahí. No improvises — espera la respuesta.

3. Confirma visualmente al usuario que la spec está lista y qué rama está
   activa:

   ```
   ✅ Listo para implementar.

   Spec:  specs/NN-slug.md
   Rama:  spec-NN-slug  (activa)   (← o la rama actual, si no se creó una nueva)
   Estado: Aprobado   (← repite el valor real encontrado en la spec)
   ```

4. **No empieces a implementar todavía.** Primero muestra al usuario el
   resumen de la spec para que lo tenga fresco. Extrae y muestra:
   - El **objetivo** (la línea después de `**Objetivo:**`/`**Objective:**`
     o equivalente).
   - El **alcance** (la sección `## Alcance`/`## Scope` o equivalente).
   - El **plan de implementación** (la sección con los pasos numerados —
     `## Plan de implementación`/`## Implementation plan` o equivalente).
   - Los **criterios de aceptación** (el checklist —
     `## Criterios de aceptación`/`## Acceptance criteria` o equivalente).

Identifica los encabezados de sección por significado, no por redacción
exacta — la spec puede estar en cualquier idioma.

---

### Fase 4 — Implementar paso a paso

Después de mostrar el resumen de la spec, dile al usuario:

```
Voy a implementar la spec siguiendo el plan de implementación exactamente.
Haré una pausa después de cada paso para que revises el diff.

¿Empezamos con el Paso 1?
```

Espera confirmación explícita ("sí", "adelante", "va", o equivalente). No
empieces sin ella.

Una vez confirmado, sigue estas reglas durante toda la implementación:

**Una regla por encima de todas:** implementa lo que dice la spec. Si algo
de la spec te parece subóptimo, menciónalo como observación pero implementa
lo acordado. Los cambios a la spec van en la spec, no en el código por
sorpresa.

**Ritmo de trabajo:**

- Implementa un paso del plan.
- Muestra un resumen de qué archivos tocaste y qué hiciste.
- Di: `Paso N completado. ¿Puedes revisar el diff y decirme si continúo con el Paso N+1?`
- Espera confirmación antes de continuar.

**Si durante la implementación encuentras una ambigüedad** que la spec no
resuelve:

- Detente.
- Describe la ambigüedad exactamente.
- Presenta dos o tres opciones concretas.
- Espera la decisión del usuario.
- No improvises.

**Si el usuario pide algo que está fuera del alcance de la spec:**

- Recuérdale que está fuera del alcance de esta spec.
- Sugiere anotarlo para una spec futura.
- No lo implementes en esta rama.

**Si un paso del plan es justamente la generalización de infraestructura**
(parametrizar `lib/scores-supabase(-server).ts` con `gameId`, reemplazar los
`if (game.id === "asteroids")` por un registro de motores por id, o
generalizar `SalonHallOfFame.tsx`): después de completarlo, verifica
explícitamente que Asteroids **sigue funcionando exactamente igual que
antes** (jugar una partida, guardar puntuación, verla en `/salon` y en
`/juegos/asteroids`) antes de pasar al siguiente paso — ese refactor no debe
cambiar comportamiento observable de Asteroids.

**Al terminar el último paso del plan:**

```
✅ Todos los pasos del plan están implementados.

Siguiente paso: verificar los criterios de aceptación de la spec uno por uno.
Además, confirma específicamente:
  - El juego nuevo aparece en /games y en /salon con leaderboard real
    (no datos simulados).
  - Los demás juegos del catálogo (incluido Asteroids) siguen funcionando
    sin cambios de comportamiento.
  - `npx tsc --noEmit` y `npm run lint` siguen en verde.

Si todo pasa, actualiza el estado de la spec a "Implementado" (o el
equivalente en el idioma de tu repo) y haz el commit final antes de
mergear esta rama.
```

---

## Resumen del comportamiento esperado

```
/juego-nuevo-impl 07-tetris

  Fase 1  →  Encuentra specs/07-tetris.md
  Fase 2  →  Lee el estado → "Aprobado" → ✅ continúa
  Fase 3  →  git checkout -b spec-07-tetris → git checkout spec-07-tetris
             Muestra objetivo, alcance, plan y criterios
  Fase 4  →  Implementa paso a paso con pausas
             Si hay paso de generalización, verifica que Asteroids no cambió
             Termina recordando verificar criterios + catálogo/salón + tsc/lint

/juego-nuevo-impl 08-arkanoid  (estado: Borrador)

  Fase 1  →  Encuentra specs/08-arkanoid.md
  Fase 2  →  Lee el estado → "Borrador" → ❌ se detiene
             Muestra el mensaje de error estándar
             No crea rama, no toca código
```

**La creación de rama está controlada por la bandera `AutoCreateBranch`** en
`specs/.spec-config.yml` (el mismo archivo que usa `/spec-impl` — no crees
uno nuevo). Por default es `true` (crea la rama automáticamente, como se
muestra arriba). Ponla en `false` para que la Fase 3 pregunte `[y/N]` antes
de crear la rama.
