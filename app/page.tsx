import {
  getSettings,
  listBooks,
  listGoals,
  listGiftItems,
} from "@/lib/repository";
import { defaults } from "@/lib/types";
import Wishlist from "@/components/wishlist";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [settings, books, goals, items] = await Promise.allSettled([
    getSettings(),
    listBooks(),
    listGoals(),
    listGiftItems(),
  ]);
  return (
    <Wishlist
      settings={settings.status === "fulfilled" ? settings.value : defaults}
      initialBooks={books.status === "fulfilled" ? books.value : []}
      initialGoals={goals.status === "fulfilled" ? goals.value : []}
      initialItems={items.status === "fulfilled" ? items.value : []}
      loadError={books.status === "rejected"}
      goalsLoadError={goals.status === "rejected"}
      itemsLoadError={items.status === "rejected"}
    />
  );
}
