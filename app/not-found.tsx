import Link from "next/link";

export default function NotFound() {
  return (
    <section
      className="fade-in"
      style={{
        padding: "96px 32px",
        maxWidth: 760,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      {/* Eco del pie del marco CRT del reproductor, que muestra "SEÑAL OK". */}
      <div
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.28em",
          color: "var(--ink-faint)",
        }}
      >
        SEÑAL PERDIDA · CRT-83
      </div>

      <h1
        className="pixel neon-magenta flicker"
        style={{ fontSize: "clamp(26px, 6vw, 52px)", margin: "18px 0 0" }}
      >
        GAME OVER
      </h1>

      <div
        className="pixel neon-yellow"
        style={{
          fontSize: "clamp(10px, 1.6vw, 13px)",
          letterSpacing: "0.2em",
          marginTop: 18,
        }}
      >
        ERROR 404 · CARTUCHO NO ENCONTRADO
      </div>

      <p
        className="mono"
        style={{
          color: "var(--ink-dim)",
          fontSize: 13,
          lineHeight: 1.7,
          marginTop: 20,
        }}
      >
        Esta pantalla no está en el Vault. Revisa la dirección o vuelve a la
        biblioteca para elegir otro juego.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: 32,
        }}
      >
        <Link className="btn lg" href="/">
          VOLVER AL VAULT
        </Link>
        <Link className="btn ghost lg" href="/salon">
          SALÓN DE LA FAMA
        </Link>
      </div>
    </section>
  );
}
