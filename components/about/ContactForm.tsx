"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || !email || !message) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "No se pudo enviar el mensaje.");
        return;
      }

      setSent(name);
    } catch {
      setError("No se pudo enviar el mensaje. Verifica tu conexión.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
      {sent ? (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setSent(null);
                  setForm({ name: "", email: "", message: "" });
                }}
              >
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-message">MENSAJE</label>
            <textarea
              id="contact-message"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>

          {error && (
            <div className="terminal-success" style={{ marginBottom: 16 }}>
              <div className="term-bar">
                <span className="dot r"></span>
                <span className="dot y"></span>
                <span className="dot g"></span>
                <span className="term-title">VAULT-OS // TERMINAL</span>
              </div>
              <div className="term-body">
                <div className="line neon-magenta">[ERROR] {error}</div>
              </div>
            </div>
          )}

          <button className="btn xl press" type="submit" style={{ width: "100%" }} disabled={sending}>
            {sending ? "▶  ENVIANDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      )}
    </form>
  );
}
