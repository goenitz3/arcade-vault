import type { Game } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export { CATS } from "@/lib/categories";

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
