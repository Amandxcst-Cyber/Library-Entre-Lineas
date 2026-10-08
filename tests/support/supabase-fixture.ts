/** Local-only Supabase protocol fixture. Auth and Storage are simulated; SQL and RLS are real PGlite.
 * Never import this from app/, and never use it to seed a hosted database.
 */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { defaults } from "../../lib/types";
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111",
  stranger = "22222222-2222-4222-8222-222222222222";
const port = Number(process.env.FIXTURE_PORT || 54321);
const origin = `http://127.0.0.1:${port}`;
const uploads = new Map<string, { bytes: Buffer; type: string }>();
await db.exec(`
create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to anon,authenticated;
grant select on storage.objects to anon,authenticated;
grant insert,update,delete on storage.objects to authenticated;
`);
for (const file of [
  "001_initial.sql",
  "002_other_gifts.sql",
  "003_book_editions.sql",
  "004_chile_edition_options.sql",
])
  await db.exec(
    await readFile(
      new URL(`../../supabase/migrations/${file}`, import.meta.url),
      "utf8",
    ),
  );
await db.query("insert into auth.users values ($1),($2)", [owner, stranger]);
await db.query("insert into public.app_owner(user_id) values ($1)", [owner]);
await db.query("insert into public.wishlist_settings(data) values ($1)", [
  JSON.stringify(defaults),
]);
const samples = [
  [
    "La casa de los ecos",
    "Clara del Río",
    "genre-0",
    "love",
    18990,
    "Un misterio para leer con lluvia y armar mis propias teorías.",
    "El archivo de los ecos",
    "#49394e",
  ],
  [
    "Donde florece el invierno",
    "Elena Valdés",
    "genre-2",
    "like",
    14990,
    "Un romance lento, de esos que se quedan un ratito contigo.",
    "",
    "#754f4c",
  ],
  [
    "El atlas de las estrellas",
    "Inés Márquez",
    "genre-3",
    "love",
    22990,
    "Mapas, bibliotecas secretas y un poquito de magia.",
    "El atlas",
    "#2f4a45",
  ],
  [
    "Cartas desde el jardín",
    "Lucía Montes",
    "genre-4",
    "interested",
    9990,
    "Para una tarde tranquila entre páginas y una taza de té.",
    "",
    "#80704c",
  ],
  [
    "Las horas azules",
    "Antonia Vera",
    "genre-0",
    "someday",
    null,
    "Una historia que tengo anotada hace tiempo.",
    "",
    "#34495b",
  ],
  [
    "El último faro",
    "Clara del Río",
    "genre-1",
    "like",
    17990,
    "Dicen que no se puede soltar. Me tinca comprobarlo.",
    "",
    "#694a3c",
  ],
];
const covers = new Map<string, string>();
for (const [
  title,
  author,
  genre,
  priority,
  price,
  note,
  saga,
  color,
] of samples) {
  const id = randomUUID();
  const lines = String(title).split(" ");
  const mid = Math.ceil(lines.length / 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480"><rect width="320" height="480" fill="${color}"/><rect x="18" y="18" width="284" height="444" fill="none" stroke="#d7c7a2"/><path d="M40 185 Q160 25 280 185 M50 175 Q160 55 270 175" fill="none" stroke="#d7c7a2" stroke-width="1.5"/><circle cx="160" cy="126" r="18" fill="none" stroke="#d7c7a2"/><text x="160" y="230" text-anchor="middle" fill="#fff1d7" font-family="Georgia,serif" font-size="30">${lines.slice(0, mid).join(" ")}</text><text x="160" y="269" text-anchor="middle" fill="#fff1d7" font-family="Georgia,serif" font-size="30">${lines.slice(mid).join(" ")}</text><path d="M95 330 h130" stroke="#d7c7a2"/><text x="160" y="371" text-anchor="middle" fill="#d7c7a2" font-family="Georgia,serif" font-size="17">${author}</text><text x="160" y="435" text-anchor="middle" fill="#d7c7a2" font-family="Arial,sans-serif" font-size="8" letter-spacing="3">EJEMPLO DE DISEÑO</text></svg>`;
  covers.set(id, svg);
  await db.query(
    "insert into books(title,author,genre,priority,price,personal_note,saga,cover_url,publisher) values($1,$2,$3,$4,$5,$6,$7,$8,'Edición de prueba')",
    [
      title,
      author,
      genre,
      priority,
      price,
      note,
      saga,
      `${origin}/fixture/covers/${id}`,
    ],
  );
}
await db.query(
  "insert into books(title,author,status) values ('Mi libro privado','Amanda','owned'),('Libro en pausa','Amanda','archived')",
);
await db.query(
  "insert into gift_goals(title,personal_note,target_amount,collected_amount,contribution_url,status,image_url) values($1,$2,180000,72000,'https://example.com/solo-prueba','active',''),($3,$4,50000,50000,'https://example.com/solo-prueba','completed','')",
  [
    "Una biblioteca que venga conmigo",
    "Una Kobo para llevar mis historias en la mochila. Un sueño lector que podemos compartir.",
    "Un poquito de magia",
    "Este deseo de prueba ya tiene su próximo capítulo.",
  ],
);
await db.query(
  "insert into gift_items(title,category,priority,price,personal_note) values('Un juego para las tardes de lluvia','Juegos de mesa','love',24990,'Para compartir una mesa, algo rico y muchas risas.'),('Una funda para mis historias','Accesorios lectores','like',null,'Un detalle para cuidar los libros que viajan conmigo.')",
);
function reply(
  res: ServerResponse,
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(data));
}
async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}
function identity(req: IncomingMessage) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, "") || "";
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
      .sub as string;
  } catch {
    return "";
  }
}
function user(id: string) {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: id === owner ? "owner@example.test" : "stranger@example.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
}
function token(id: string) {
  return `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, aud: "authenticated", role: "authenticated", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.local-test-signature`;
}
// Serialize role changes in the single embedded PostgreSQL connection.
let queue = Promise.resolve();
const server = createServer((req, res) => {
  queue = queue
    .then(async () => {
      const url = new URL(req.url!, origin),
        uid = identity(req);
      try {
        if (url.pathname.startsWith("/fixture/covers/")) {
          const svg = covers.get(url.pathname.split("/").pop()!);
          res.writeHead(svg ? 200 : 404, { "content-type": "image/svg+xml" });
          res.end(svg || "");
          return;
        }
        if (url.pathname === "/auth/v1/token") {
          const input = JSON.parse((await body(req)).toString());
          if (input.password !== "fixture-only-password") {
            reply(res, 400, { msg: "Invalid login credentials" });
            return;
          }
          const id = input.email === "owner@example.test" ? owner : stranger;
          reply(res, 200, {
            access_token: token(id),
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            refresh_token: "fixture-refresh",
            user: user(id),
          });
          return;
        }
        if (url.pathname === "/auth/v1/user") {
          reply(res, uid ? 200 : 401, uid ? user(uid) : { msg: "No session" });
          return;
        }
        if (url.pathname === "/auth/v1/logout") {
          reply(res, 200, {});
          return;
        }
        if (url.pathname === "/auth/v1/.well-known/jwks.json") {
          reply(res, 200, { keys: [] });
          return;
        }
        await db.exec("reset role");
        await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
          uid,
        ]);
        await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
        if (url.pathname.startsWith("/storage/v1/object/")) {
          const key = url.pathname.split("/").pop()!;
          if (req.method === "POST") {
            const bytes = await body(req);
            await db.query(
              "insert into storage.objects(bucket_id,name) values('book-covers',$1)",
              [key],
            );
            uploads.set(key, {
              bytes,
              type: String(req.headers["content-type"] || "image/png"),
            });
            reply(res, 200, { Key: `book-covers/${key}`, Id: randomUUID() });
            return;
          }
          const allowed = await db.query(
              "select name from storage.objects where bucket_id='book-covers' and name=$1",
              [key],
            ),
            file = uploads.get(key);
          if (!allowed.rows.length || !file) {
            reply(res, 404, { message: "Not found" });
            return;
          }
          res.writeHead(200, { "content-type": file.type });
          res.end(file.bytes);
          return;
        }
        if (url.pathname.startsWith("/rest/v1/rpc/")) {
          const name = url.pathname.split("/").pop()!;
          const functions: Record<string, string[]> = {
            is_owner: [],
            get_wishlist_books: [],
            get_wishlist_gift_items: [],
            get_gift_state: ["p_kind", "p_item_id", "p_token_hash"],
            reserve_wishlist_gift: [
              "p_kind",
              "p_item_id",
              "p_token_hash",
              "p_visitor_hash",
              "p_days",
            ],
            cancel_wishlist_gift: ["p_kind", "p_item_id", "p_token_hash"],
          };
          if (!(name in functions)) throw new Error("Unsupported fixture RPC");
          const args =
            req.method === "POST"
              ? JSON.parse((await body(req)).toString() || "{}")
              : {};
          const params = functions[name].map((key) => args[key] ?? null);
          const result = await db.query<{ value: unknown }>(
            `select public.${name}(${params.map((_, i) => `$${i + 1}`).join(",")}) as value`,
            params,
          );
          reply(
            res,
            200,
            name.startsWith("get_wishlist_")
              ? result.rows.map((r) => r.value)
              : result.rows[0].value,
          );
          return;
        }
        const table = url.pathname.replace("/rest/v1/", "");
        if (
          !["books", "gift_items", "gift_goals", "wishlist_settings"].includes(
            table,
          )
        ) {
          reply(res, 404, { message: "Not found" });
          return;
        }
        const params: unknown[] = [];
        const conditions: string[] = [];
        for (const [key, value] of url.searchParams) {
          if (
            !/^[a-z_]+$/.test(key) ||
            ["select", "order", "limit"].includes(key)
          )
            continue;
          if (value.startsWith("eq.")) {
            params.push(value.slice(3));
            conditions.push(`${key}=$${params.length}`);
          } else if (value.startsWith("in.(")) {
            const vals = value.slice(4, -1).split(",");
            const holders = vals.map((v) => {
              params.push(v);
              return `$${params.length}`;
            });
            conditions.push(`${key} in (${holders.join(",")})`);
          }
        }
        const where = conditions.length
          ? ` where ${conditions.join(" and ")}`
          : "";
        let sql = `select * from public.${table}${where}`;
        if (req.method === "POST" || req.method === "PATCH") {
          const input = JSON.parse((await body(req)).toString());
          const keys = Object.keys(input);
          if (keys.some((k) => !/^[a-z_]+$/.test(k)))
            throw new Error("Invalid fixture column");
          const values = keys.map((k) => {
            params.push(k === "data" ? JSON.stringify(input[k]) : input[k]);
            return `$${params.length}`;
          });
          sql =
            req.method === "POST"
              ? `insert into public.${table}(${keys.join(",")}) values(${values.join(",")})${
                  req.headers.prefer?.includes("resolution=merge-duplicates")
                    ? ` on conflict(id) do update set ${keys
                        .filter((k) => k !== "id")
                        .map((k) => `${k}=excluded.${k}`)
                        .join(",")}`
                    : ""
                } returning *`
              : `update public.${table} set ${keys.map((k, i) => `${k}=${values[i]}`).join(",")}${where} returning *`;
        }
        if (req.method === "DELETE")
          sql = `delete from public.${table}${where} returning *`;
        const result = await db.query<Record<string, unknown>>(sql, params);
        const headers = {
          "content-range": `0-${Math.max(0, result.rows.length - 1)}/${result.rows.length}`,
        };
        if (req.method === "HEAD") {
          res.writeHead(200, headers);
          res.end();
          return;
        }
        if (req.method === "DELETE") {
          reply(res, 200, null);
          return;
        }
        const single = req.headers.accept?.includes("vnd.pgrst.object+json");
        if (single && result.rows.length !== 1) {
          reply(res, 406, {
            code: "PGRST116",
            message: "Expected one row",
            details: `The result contains ${result.rows.length} rows`,
          });
          return;
        }
        reply(res, 200, single ? result.rows[0] : result.rows, headers);
      } catch (error) {
        const e = error as Error & { code?: string };
        reply(res, 400, { code: e.code || "FIXTURE", message: e.message });
      }
    })
    .catch(() => {
      reply(res, 500, { message: "Fixture failed" });
    });
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Local fixture listening on ${port}. Synthetic data only.`),
);
async function stop() {
  server.close();
  await queue;
  await db.close();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
