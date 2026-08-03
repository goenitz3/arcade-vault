import type { ScoreRow } from "@/lib/types";

const PLAYERS = [
  "PX_KAI",
  "NEONFOX",
  "Z3R0COOL",
  "M00NRYU",
  "VAULT_07",
  "GLITCHA",
  "ATARI_KID",
  "CYBER_LU",
  "MAGENTA88",
  "SCANLINE",
  "BIT_LORD",
  "ARKADYA",
  "DROID_X",
  "RGB_QUEEN",
  "PIXEL_DAD",
  "RETROVIRA",
  "VECTORX",
  "JOY_STK",
];

/**
 * Semilla derivada del id del juego. Suma los códigos de carácter en lugar de
 * usar la longitud: con `id.length` los juegos de igual número de letras
 * generaban rankings idénticos.
 */
export function seedFromId(id: string): number {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return sum;
}

/**
 * Rankings simulados. Puro y determinista: la misma semilla produce el mismo
 * resultado en servidor y en cliente, que es lo que permite renderizar las
 * tablas en el servidor sin desajustes de hidratación. No usa `Date.now()`
 * ni `Math.random()`.
 */
export function seededScores(seed: number, count = 12): ScoreRow[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;

  const used = new Set<string>();
  const rows: ScoreRow[] = [];

  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);

    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");

    rows.push({
      rank: i + 1,
      name,
      score: Math.max(score, 1000),
      date: `${day}/${mon}/2026`,
    });
  }

  return rows
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Ranking del Detalle: 10 filas. */
export function detailScores(id: string): ScoreRow[] {
  return seededScores(seedFromId(id) * 17 + 3, 10);
}

/** Ranking del Salón de la Fama: 12 filas. */
export function hallScores(id: string): ScoreRow[] {
  return seededScores(seedFromId(id) * 23 + 7, 12);
}
