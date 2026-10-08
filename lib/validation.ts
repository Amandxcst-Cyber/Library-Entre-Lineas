import { z } from "zod";
import { isbn13 } from "./book-discovery/shared";
const safeUrl = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      !value ||
      /^\/media\/[a-zA-Z0-9._-]+$/.test(value) ||
      (() => {
        try {
          const u = new URL(value);
          return (
            ["https:", "http:"].includes(u.protocol) &&
            !u.username &&
            !u.password
          );
        } catch {
          return false;
        }
      })(),
    "Usa un enlace http o https válido.",
  );
const category = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().trim().min(1).max(80),
});
export const goalFields = z
  .object({
    title: z.string().trim().min(1, "Dale un nombre a tu sueño.").max(160),
    personal_note: z.string().trim().max(1500).default(""),
    image_url: safeUrl.default(""),
    target_amount: z
      .number()
      .int()
      .min(1, "La meta debe ser mayor a cero.")
      .max(10000000),
    collected_amount: z.number().int().min(0).max(10000000).default(0),
    contribution_url: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) =>
          !value ||
          (() => {
            try {
              const u = new URL(value);
              return u.protocol === "https:" && !u.username && !u.password;
            } catch {
              return false;
            }
          })(),
        "Usa un link de aporte https válido.",
      )
      .default(""),
    status: z
      .enum(["draft", "active", "completed", "archived"])
      .default("draft"),
  })
  .strict();
export const goalSchema = goalFields.superRefine((data, ctx) => {
  if (
    data.status === "active" &&
    data.collected_amount < data.target_amount &&
    !data.contribution_url
  )
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contribution_url"],
      message: "Agrega un link de aporte antes de publicar.",
    });
});
export const bookSchema = z
  .object({
    title: z.string().trim().min(1, "Falta el título.").max(240),
    author: z.string().trim().min(1, "Falta el autor.").max(240),
    cover_url: safeUrl.default(""),
    description: z.string().trim().max(4000).default(""),
    personal_note: z.string().trim().max(1500).default(""),
    genre: z.string().max(80).default(""),
    priority: z.string().min(1).max(80),
    status: z.enum(["wishlist", "owned", "archived"]).default("wishlist"),
    price: z.number().int().min(0).max(10000000).nullable().default(null),
    special_gift: z.union([z.literal(0), z.literal(1)]).default(0),
    purchase_url: safeUrl
      .refine(
        (v) => !v || /^https?:\/\//.test(v),
        "El enlace de compra debe ser http o https.",
      )
      .default(""),
    publisher: z.string().trim().max(200).default(""),
    saga: z.string().trim().max(200).default(""),
    isbn: z
      .string()
      .trim()
      .max(30)
      .refine(
        (v) => !v || !!isbn13(v),
        "Usa un ISBN de 10 o 13 dígitos válido.",
      )
      .transform((v) => (v ? isbn13(v) : ""))
      .default(""),
    edition_format: z.string().trim().max(80).default(""),
    publication_year: z
      .number()
      .int()
      .min(1000)
      .max(3000)
      .nullable()
      .default(null),
    language: z.string().trim().max(40).default(""),
    translator: z.string().trim().max(240).default(""),
    page_count: z.number().int().min(1).max(100000).nullable().default(null),
  })
  .strict();
export const settingsSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(60),
    handle: z.string().trim().max(60).default("amandxcst"),
    intro: z.string().trim().min(1).max(240),
    description: z.string().trim().max(500),
    genres: z.array(category).min(1).max(30),
    priorities: z
      .array(category.extend({ symbol: z.string().max(12) }))
      .min(1)
      .max(8),
    priceBands: z
      .array(
        category
          .extend({
            min: z.number().int().min(0),
            max: z.number().int().min(0).nullable(),
          })
          .refine(
            (b) => b.max === null || b.max >= b.min,
            "El máximo debe ser mayor al mínimo.",
          ),
      )
      .max(12),
  })
  .strict()
  .superRefine((data, ctx) => {
    for (const key of ["genres", "priorities", "priceBands"] as const)
      if (new Set(data[key].map((c) => c.id)).size !== data[key].length)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Cada categoría necesita un identificador único.",
        });
  });

export const giftItemSchema = z
  .object({
    title: z.string().trim().min(1, "Dale un nombre a tu regalo.").max(240),
    category: z
      .string()
      .trim()
      .min(1, "Elige una categoría.")
      .max(80)
      .default("Otros detalles"),
    image_url: safeUrl.default(""),
    personal_note: z.string().trim().max(1500).default(""),
    priority: z.string().min(1).max(80),
    status: z.enum(["wishlist", "owned", "archived"]).default("wishlist"),
    price: z.number().int().min(0).max(10000000).nullable().default(null),
    purchase_url: safeUrl
      .refine(
        (v) => !v || /^https?:\/\//.test(v),
        "El enlace debe ser http o https.",
      )
      .default(""),
  })
  .strict();

const reservationFields = z
  .object({
    book_id: z.string().uuid().optional(),
    gift_item_id: z.string().uuid().optional(),
  })
  .strict();
const oneTarget = (v: { book_id?: string; gift_item_id?: string }) =>
  !!v.book_id !== !!v.gift_item_id;
export const reservationTargetSchema = reservationFields.refine(
  oneTarget,
  "Elige un solo libro o regalo.",
);
export const reservationCreateSchema = reservationFields
  .extend({ days: z.union([z.literal(7), z.literal(14)]).default(7) })
  .refine(oneTarget, "Elige un solo libro o regalo.");
