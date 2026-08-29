# Juegos implementados

Juegos de Arcade Vault con motor propio ya jugable (registrados en
`lib/games-with-engine.ts` y `components/games/engine-registry.tsx`). Datos tomados de las
tablas `games` y `scores` de Supabase el 2026-08-29.

| ID | Título | Descripción | Categoría | Color | Récord (seed) | Partidas | Scores reales | Top score real |
|---|---|---|---|---|---|---|---|---|
| `arkanoid` | ARKANOID | Rebota la pelota y destruye muros de neón. | ARCADE | cyan | 28,450 | 12.4K | 1 | 400 |
| `asteroids` | ASTEROIDS | Pulveriza asteroides en gravedad cero. | SHOOTER | yellow | 41,200 | 15.6K | 2 | 3,230 |
| `snake` | SNAKE | Crece sin morder tu propia cola. | ARCADE | green | 7,820 | 9.1K | 1 | 90 |
| `tetris` | TETRIS | Encaja las piezas antes de que el techo te aplaste. | PUZZLE | magenta | 184,220 | 31.8K | 1 | 202 |

Notas:

- **Récord (seed)** y **Partidas** son los valores sembrados en la columna `best`/`plays`
  de `games` (decorativos); **Scores reales** y **Top score real** salen de la tabla
  `scores` (puntuaciones guardadas por jugadores).
- Cada juego vive en `components/games/<id>/` (spec correspondiente en `specs/`:
  05-asteroids, 07-tetris, 08-arkanoid, 09-snake).
- Pendientes de implementar (solo datos simulados): `gloton`, `invasores`, `ranaria`,
  `duelo-pixel`.
