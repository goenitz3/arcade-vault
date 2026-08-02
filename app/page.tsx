export default function Home() {
  return (
    <>
      <section className="av-hero">
        <h1>Arcade Vault</h1>
        <div className="sub">
          Inserta moneda para comenzar <span className="blink">_</span>
        </div>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico">&gt;</span>
          <input placeholder="Buscar juego..." />
        </div>
        <div className="av-chips">
          <button className="chip active">Todos</button>
          <button className="chip">Arcade</button>
          <button className="chip">Puzzle</button>
        </div>
      </div>

      <div className="av-grid">
        <article className="card">
          <div className="cover">
            <div className="cover-bg cover-tetro" />
            <span className="label">Puzzle</span>
          </div>
          <div className="meta">
            <div className="title">Bloques</div>
            <div className="desc">Encaja las piezas antes de que la pila te alcance.</div>
          </div>
          <div className="row">
            <div className="score-badge">
              Récord
              <b>128 400</b>
            </div>
            <button className="btn">Jugar</button>
          </div>
        </article>

        <article className="card">
          <div className="cover">
            <div className="cover-bg cover-invaders" />
            <span className="label">Arcade</span>
          </div>
          <div className="meta">
            <div className="title">Invasores</div>
            <div className="desc">Defiende la base de las oleadas alienígenas.</div>
          </div>
          <div className="row">
            <div className="score-badge">
              Récord
              <b>96 750</b>
            </div>
            <button className="btn magenta">Jugar</button>
          </div>
        </article>

        <article className="card">
          <div className="cover">
            <div className="cover-bg cover-snake" />
            <span className="label">Clásico</span>
          </div>
          <div className="meta">
            <div className="title">Serpiente</div>
            <div className="desc">Crece sin morder tu propia cola.</div>
          </div>
          <div className="row">
            <div className="score-badge">
              Récord
              <b>42 010</b>
            </div>
            <button className="btn yellow">Jugar</button>
          </div>
        </article>
      </div>
    </>
  );
}
