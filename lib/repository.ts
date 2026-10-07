import { createClient } from "./supabase/server";
import {
  defaults,
  type Book,
  type GiftGoal,
  type GiftItem,
  type Settings,
} from "./types";

export async function database() {
  return createClient();
}
export function requireData<T>(result: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null)
    throw new Error("No se recibió una respuesta de la base de datos.");
  return result.data;
}
export async function getSettings(): Promise<Settings> {
  const result = await (await database())
    .from("wishlist_settings")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return { ...structuredClone(defaults), ...(result.data?.data || {}) };
}
export async function listBooks(privateView = false): Promise<Book[]> {
  const db = await database();
  const result = privateView
    ? await db
        .from("books")
        .select("*")
        .order("created_at", { ascending: false })
    : await db.rpc("get_wishlist_books");
  return requireData(result) as Book[];
}
export async function getBook(id: string): Promise<Book | null> {
  const result = await (await database())
    .from("books")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as Book | null;
}
export async function listGoals(privateView = false): Promise<GiftGoal[]> {
  let query = (await database())
    .from("gift_goals")
    .select("*")
    .order("created_at", { ascending: false });
  if (!privateView) query = query.in("status", ["active", "completed"]);
  const goals = requireData(await query) as GiftGoal[];
  return privateView
    ? goals
    : goals.sort(
        (a, b) =>
          Number(a.status === "completed") - Number(b.status === "completed"),
      );
}
export async function getGoal(id: string): Promise<GiftGoal | null> {
  const result = await (await database())
    .from("gift_goals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as GiftGoal | null;
}

export async function listGiftItems(privateView = false): Promise<GiftItem[]> {
  const db = await database();
  const result = privateView
    ? await db
        .from("gift_items")
        .select("*")
        .order("created_at", { ascending: false })
    : await db.rpc("get_wishlist_gift_items");
  return requireData(result) as GiftItem[];
}
export async function getGiftItem(id: string): Promise<GiftItem | null> {
  const result = await (await database())
    .from("gift_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as GiftItem | null;
}
