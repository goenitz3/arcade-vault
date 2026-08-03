"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { SavedScore, SessionUser } from "@/lib/types";

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

/** Nombre de jugador: mayúsculas, máximo 10 caracteres, con respaldo PLAYER1. */
function normalizeName(raw: string): string {
  return (raw.trim() || "PLAYER1").toUpperCase().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Store externo sobre localStorage.
//
// Se usa useSyncExternalStore en lugar de leer en un useEffect porque el lint
// del proyecto prohíbe setState síncrono dentro de un efecto. El contrato de
// hidratación es el mismo que pide la spec: getServerSnapshot devuelve null, y
// el valor guardado solo aparece tras montar en el cliente.
//
// getSnapshot debe devolver la MISMA referencia mientras el dato no cambie, o
// React entraría en un bucle de renders; de ahí la caché sobre el string crudo.
// ---------------------------------------------------------------------------

let cachedRaw: string | null = null;
let cachedUser: SessionUser | null = null;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Mantiene la sesión sincronizada entre pestañas abiertas.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): SessionUser | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(USER_KEY);
  } catch {
    // localStorage no disponible: equivale a no tener sesión.
  }

  if (raw === cachedRaw) return cachedUser;
  cachedRaw = raw;

  cachedUser = null;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "name" in parsed) {
        cachedUser = { name: String((parsed as SessionUser).name) };
      }
    } catch {
      // JSON corrupto: se descarta y se sigue sin sesión.
    }
  }
  return cachedUser;
}

function getServerSnapshot(): SessionUser | null {
  return null;
}

type SessionValue = {
  user: SessionUser | null;
  login: (rawName: string) => void;
  signOut: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const login = useCallback((rawName: string) => {
    const next: SessionUser = { name: normalizeName(rawName) };
    try {
      window.localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {
      // Sin persistencia: la sesión no sobrevive a una recarga.
    }
    emit();
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(USER_KEY);
    } catch {
      // Nada que limpiar si el almacenamiento no está disponible.
    }
    emit();
  }, []);

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    try {
      const raw = window.localStorage.getItem(SCORES_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const all: SavedScore[] = Array.isArray(parsed) ? parsed : [];
      all.push({ ...entry, at: Date.now() });
      window.localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {
      // La puntuación no se persiste, pero la UI confirma igual: es una maqueta.
    }
  }, []);

  return (
    <SessionContext.Provider value={{ user, login, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
