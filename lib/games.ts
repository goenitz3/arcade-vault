import type { Game } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export const CATS = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
] as const satisfies readonly string[];

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("*");
  if (error) throw error;
  return data as Game[];
}

export async function getGame(id: string): Promise<Game | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Game | undefined;
}
