export type Status = "wishlist" | "owned" | "archived";
export type GiftItem = {
  id: string;
  title: string;
  category: string;
  image_url: string;
  personal_note: string;
  priority: string;
  status: Status;
  price: number | null;
  purchase_url: string;
  created_at: string;
  updated_at: string;
  reservation_expires_at?: string | null;
};
export type GiftItemInput = Omit<
  GiftItem,
  "id" | "created_at" | "updated_at" | "reservation_expires_at"
>;
export const GIFT_CATEGORIES = [
  "Harry Potter",
  "Juegos de mesa",
  "Lectura y tecnología",
  "Otros detalles",
];
export const GIFT_STATUS_LABELS: Record<Status, string> = {
  wishlist: "Por regalar",
  owned: "Ya los tengo",
  archived: "Archivados",
};
export const GOAL_SUGGESTIONS = [
  {
    label: "Kindle",
    title: "Una Kindle para mis próximas historias",
    personal_note:
      "Una biblioteca que me acompañe a todas partes. Me haría mucha ilusión dar el salto a un lector digital.",
  },
  {
    label: "Kobo",
    title: "Una Kobo, un mundo por leer",
    personal_note:
      "Para llevar mis historias favoritas conmigo y abrirles espacio a muchas más.",
  },
  {
    label: "Harry Potter",
    title: "Un poquito de magia de Harry Potter",
    personal_note:
      "Soy fan de este universo. Una vaquita para ese detalle mágico que llevo tiempo mirando.",
  },
];
export type GoalStatus = "draft" | "active" | "completed" | "archived";
export type GiftGoal = {
  id: string;
  title: string;
  personal_note: string;
  image_url: string;
  target_amount: number;
  collected_amount: number;
  contribution_url: string;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
};
export type GoalInput = Omit<GiftGoal, "id" | "created_at" | "updated_at">;
export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  draft: "Borrador privado",
  active: "Recibiendo aportes",
  completed: "Meta cumplida",
  archived: "Archivado",
};
export type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  description: string;
  personal_note: string;
  genre: string;
  priority: string;
  status: Status;
  price: number | null;
  special_gift: number;
  purchase_url: string;
  publisher: string;
  saga: string;
  created_at: string;
  updated_at: string;
  reservation_expires_at?: string | null;
};
export type Category = { id: string; label: string };
export type Priority = Category & { symbol: string };
export type PriceBand = Category & { min: number; max: number | null };
export type Settings = {
  title: string;
  name: string;
  handle: string;
  intro: string;
  description: string;
  genres: Category[];
  priorities: Priority[];
  priceBands: PriceBand[];
};
export const STATUS_LABELS: Record<Status, string> = {
  wishlist: "Wishlist",
  owned: "Mi biblioteca",
  archived: "Archivados",
};
export function formatPrice(price: number | null) {
  return price === null
    ? "Precio por confirmar"
    : new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }).format(price);
}
export const defaults: Settings = {
  title: "Amanda entre líneas",
  name: "Amanda",
  handle: "amandxcst",
  intro: "Entre lo que sueño y lo que soy, siempre hay una historia por leer.",
  description:
    "Los libros son mi debilidad. También me hacen ilusión los juegos de mesa, los detalles de Harry Potter y esos pequeños sueños lectores.",
  genres: [
    "Misterio",
    "Thriller",
    "Romance",
    "Fantasía",
    "Clásicos",
    "Juvenil",
    "Terror",
    "Ciencia ficción",
    "Drama",
    "Aventura",
  ].map((label, i) => ({ id: `genre-${i}`, label })),
  priorities: [
    { id: "love", label: "Lo quiero mucho", symbol: "🔥" },
    { id: "like", label: "Me tinca bastante", symbol: "💗" },
    { id: "interested", label: "Me interesa", symbol: "📚" },
    { id: "someday", label: "Para algún día", symbol: "🌙" },
  ],
  priceBands: [
    { id: "budget", label: "Menos de $10.000", min: 0, max: 9999 },
    { id: "little", label: "$10.000 – $15.000", min: 10000, max: 15000 },
    { id: "medium", label: "$15.001 – $20.000", min: 15001, max: 20000 },
    { id: "big", label: "Más de $20.000", min: 20001, max: null },
  ],
};
