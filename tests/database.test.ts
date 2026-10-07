import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Ejecuta la migración real con PostgreSQL embebido, incluidos roles y políticas RLS.
test("Permisos, biblioteca, reservas y vaquitas", async (t) => {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111";
  const stranger = "22222222-2222-4222-8222-222222222222";
  const hash = (s: string) => s.repeat(64);
  async function context(role: "anon" | "authenticated" | "super", uid = "") {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      uid,
    ]);
    if (role !== "super") await db.exec(`set role ${role}`);
  }
  async function value<T>(sql: string, params: unknown[] = []) {
    const result = await db.query<{ value: T }>(sql, params);
    return result.rows[0].value;
  }
  const fails = (promise: Promise<unknown>, code: string) =>
    assert.rejects(
      promise,
      (e: unknown) =>
        !!e && typeof e === "object" && "code" in e && e.code === code,
    );
  const reserve = (
    id: string,
    proof = hash("a"),
    visitor = hash("b"),
    days = 7,
  ) =>
    value<{
      reserved: boolean;
      is_mine: boolean;
      hours: number;
      expires_at: string;
    }>("select public.reserve_gift($1,$2,$3,$4) as value", [
      id,
      proof,
      visitor,
      days,
    ]);
  const state = (id: string, proof: string | null = null) =>
    value<{ reserved: boolean; is_mine: boolean; expires_at: string | null }>(
      "select public.gift_state($1,$2) as value",
      [id, proof],
    );
  try {
    await db.exec(`
      create role anon;create role authenticated;
      create schema auth;create schema storage;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema public,auth,storage to anon,authenticated;
      grant select on storage.objects to anon,authenticated;
      grant insert,update,delete on storage.objects to authenticated;
    `);
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/001_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.query("insert into auth.users(id) values($1),($2)", [
      owner,
      stranger,
    ]);
    await db.query("insert into public.app_owner(user_id) values($1)", [owner]);
    const books = (
      await db.query<{ id: string }>(
        "insert into public.books(title,author) select 'Libro '||n,'Autora' from generate_series(1,12) n returning id",
      )
    ).rows.map((b) => b.id);
    const privateBook = await value<string>(
      "insert into public.books(title,author,status) values('Privado','Autora','owned') returning id as value",
    );
    await db.exec(
      "insert into public.books(title,author,status) values('En pausa','Autora','archived')",
    );

    // Upgrade a populated v1 database and keep an existing book receipt valid.
    await reserve(books[11], hash("9"), hash("9"));
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/002_other_gifts.sql", import.meta.url),
        "utf8",
      ),
    );
    const giftRows = (
      await db.query<{ id: string; status: string }>(
        "insert into public.gift_items(title,category,status) values('Un juego mágico','Harry Potter','wishlist'),('Juego cooperativo','Juegos de mesa','wishlist'),('Funda de lector','Lectura y tecnología','wishlist'),('En pausa','Harry Potter','archived'),('Ya es mío','Otros detalles','owned') returning id,status",
      )
    ).rows;
    const gifts = giftRows
      .filter((i) => i.status === "wishlist")
      .map((i) => i.id);
    const privateGift = giftRows.find((i) => i.status === "owned")!.id;
    const reserveItem = (
      id: string,
      proof = hash("a"),
      visitor = hash("2"),
      days = 7,
    ) =>
      value<{ reserved: boolean; is_mine: boolean; hours: number }>(
        "select public.reserve_wishlist_gift($1,$2,$3,$4,$5) as value",
        ["item", id, proof, visitor, days],
      );
    const itemState = (id: string, proof: string | null = null) =>
      value<{ reserved: boolean; is_mine: boolean }>(
        "select public.get_gift_state($1,$2,$3) as value",
        ["item", id, proof],
      );

    await t.test(
      "La visita solo ve la wishlist y no puede modificarla",
      async () => {
        await context("anon");
        assert.equal(
          await value("select count(*)::integer as value from public.books"),
          12,
        );
        assert.equal(await value("select public.is_owner() as value"), false);
        await fails(
          db.exec(
            "insert into public.books(title,author) values('Intruso','Otro')",
          ),
          "42501",
        );
        await fails(db.exec("select * from public.app_owner"), "42501");
      },
    );
    await t.test("Una cuenta ajena no obtiene permisos de Amanda", async () => {
      await context("authenticated", stranger);
      assert.equal(await value("select public.is_owner() as value"), false);
      assert.equal(
        await value("select count(*)::integer as value from public.app_owner"),
        0,
      );
      await fails(
        db.exec(
          "insert into public.books(title,author) values('Intruso','Otro')",
        ),
        "42501",
      );
      const changed = await db.query(
        "update public.books set status='owned' returning id",
      );
      assert.equal(changed.rows.length, 0);
    });
    await t.test(
      "Amanda administra todos los estados y personaliza su web",
      async () => {
        await context("authenticated", owner);
        assert.equal(await value("select public.is_owner() as value"), true);
        assert.equal(
          await value("select count(*)::integer as value from public.books"),
          14,
        );
        await db.exec(
          'insert into public.wishlist_settings(id,data) values(1,\'{"title":"Amanda"}\')',
        );
        assert.equal(
          await value(
            "select data->>'title' as value from public.wishlist_settings",
          ),
          "Amanda",
        );
        await fails(
          db.query("update public.app_owner set user_id=$1", [stranger]),
          "42501",
        );
      },
    );
    await t.test("La reserva es anónima y dura una semana", async () => {
      await context("anon");
      const result = await reserve(books[0]);
      assert.equal(result.reserved, true);
      assert.equal(result.is_mine, true);
      assert.equal(result.hours, 168);
      assert.equal((await state(books[0])).is_mine, false);
      assert.equal((await state(books[0], hash("a"))).is_mine, true);
      const publicRows = await db.query<{ value: Record<string, unknown> }>(
        "select public.get_wishlist_books() as value",
      );
      assert.equal(publicRows.rows.length, 12);
      for (const row of publicRows.rows) {
        assert.ok(!("token_hash" in row.value));
        assert.ok(!("visitor_hash" in row.value));
      }
    });
    await t.test("Un segundo intento no toma un libro reservado", async () => {
      await fails(reserve(books[0], hash("c"), hash("d")), "P4090");
      const results = await Promise.allSettled([
        reserve(books[1], hash("a"), hash("e")),
        reserve(books[1], hash("c"), hash("f")),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(results.filter((r) => r.status === "rejected").length, 1);
    });
    await t.test(
      "Solo se aceptan 7 o 14 días y comprobantes válidos",
      async () => {
        await fails(reserve(books[2], hash("a"), hash("b"), 8), "P4000");
        await fails(reserve(books[2], "malformado", hash("b")), "P4000");
      },
    );
    await t.test("Solo el comprobante correcto permite cancelar", async () => {
      await fails(
        value("select public.cancel_gift($1,$2) as value", [
          books[0],
          hash("c"),
        ]),
        "P4090",
      );
      assert.equal((await state(books[0])).reserved, true);
      assert.equal(
        await value("select public.cancel_gift($1,$2) as value", [
          books[0],
          hash("a"),
        ]),
        true,
      );
      assert.equal((await state(books[0])).reserved, false);
      const renewed = await reserve(books[0], hash("c"), hash("d"), 14);
      assert.equal(renewed.hours, 336);
    });
    await t.test(
      "Una reserva vencida se libera sin cron ni intervención",
      async () => {
        await context("super");
        await db.query(
          "update public.gift_reservations set expires_at=now()-interval '1 second' where book_id=$1",
          [books[0]],
        );
        await context("anon");
        assert.equal((await state(books[0])).reserved, false);
        const item = await value<Record<string, unknown>>(
          "select v as value from public.get_wishlist_books() v where v->>'id'=$1",
          [books[0]],
        );
        assert.equal(item.reservation_expires_at, null);
        assert.equal((await reserve(books[0])).hours, 168);
      },
    );
    await t.test(
      "Ya lo tengo oculta el libro y cancela la reserva atómicamente",
      async () => {
        await context("authenticated", owner);
        await db.query("update public.books set status='owned' where id=$1", [
          books[0],
        ]);
        await context("anon");
        assert.equal(
          await value(
            "select count(*)::integer as value from public.books where id=$1",
            [books[0]],
          ),
          0,
        );
        await fails(state(books[0]), "P0002");
        await context("super");
        assert.equal(
          await value(
            "select status as value from public.gift_reservations where book_id=$1",
            [books[0]],
          ),
          "cancelled",
        );
        await context("authenticated", owner);
        await db.query(
          "update public.books set status='wishlist' where id=$1",
          [books[0]],
        );
        await context("anon");
        assert.equal((await state(books[0])).reserved, false);
      },
    );
    await t.test(
      "El límite es de tres reservas activas por visitante",
      async () => {
        for (const id of [books[4], books[5], books[6]])
          await reserve(id, hash("a"), hash("1"));
        await fails(reserve(books[7], hash("a"), hash("1")), "P4290");
        await value("select public.cancel_gift($1,$2) as value", [
          books[4],
          hash("a"),
        ]);
        assert.equal(
          (await reserve(books[7], hash("a"), hash("1"))).reserved,
          true,
        );
      },
    );
    await t.test(
      "Ni las visitas ni Amanda leen los hashes de reservas",
      async () => {
        await context("anon");
        await fails(db.exec("select * from public.gift_reservations"), "42501");
        await context("authenticated", owner);
        await fails(db.exec("select * from public.gift_reservations"), "42501");
      },
    );
    await t.test(
      "Las vaquitas privadas se ocultan y la meta cumplida se cierra",
      async () => {
        await context("authenticated", owner);
        const active = await value<string>(
          "insert into public.gift_goals(title,target_amount,contribution_url,status) values('Mi Kindle',150000,'https://example.com/aportar','active') returning id as value",
        );
        await db.exec(
          "insert into public.gift_goals(title,target_amount,status) values('Borrador',100000,'draft'),('Archivada',100000,'archived')",
        );
        await context("anon");
        assert.equal(
          await value(
            "select count(*)::integer as value from public.gift_goals",
          ),
          1,
        );
        await fails(
          db.exec(
            "insert into public.gift_goals(title,target_amount) values('Intruso',1000)",
          ),
          "42501",
        );
        await context("authenticated", owner);
        await db.query(
          "update public.gift_goals set collected_amount=target_amount where id=$1",
          [active],
        );
        assert.equal(
          await value(
            "select status as value from public.gift_goals where id=$1",
            [active],
          ),
          "completed",
        );
      },
    );
    await t.test(
      "Las portadas privadas también están protegidas por RLS",
      async () => {
        await context("super");
        await db.query("update public.books set cover_url=$1 where id=$2", [
          "/media/public.jpg",
          books[2],
        ]);
        await db.query("update public.books set cover_url=$1 where id=$2", [
          "/media/private.jpg",
          privateBook,
        ]);
        await db.exec(
          "insert into storage.objects(bucket_id,name) values('book-covers','public.jpg'),('book-covers','private.jpg'),('book-covers','unattached.jpg')",
        );
        await context("anon");
        const visible = await db.query<{ name: string }>(
          "select name from storage.objects",
        );
        assert.deepEqual(
          visible.rows.map((r) => r.name),
          ["public.jpg"],
        );
        await context("authenticated", stranger);
        await fails(
          db.exec(
            "insert into storage.objects(bucket_id,name) values('book-covers','intruder.jpg')",
          ),
          "42501",
        );
        await context("authenticated", owner);
        assert.equal(
          await value("select count(*)::integer as value from storage.objects"),
          3,
        );
      },
    );
    await t.test("Eliminar un libro también elimina su reserva", async () => {
      await context("authenticated", owner);
      await db.query("delete from public.books where id=$1", [books[7]]);
      await context("super");
      assert.equal(
        await value(
          "select count(*)::integer as value from public.gift_reservations where book_id=$1",
          [books[7]],
        ),
        0,
      );
    });
    await t.test(
      "Actualizar desde v1 conserva las reservas y comprobantes de libros",
      async () => {
        await context("anon");
        assert.equal((await state(books[11], hash("9"))).is_mine, true);
      },
    );
    await t.test(
      "Otros regalos son públicos solo mientras están en wishlist",
      async () => {
        await context("anon");
        assert.equal(
          await value(
            "select count(*)::integer as value from public.gift_items",
          ),
          3,
        );
        await fails(
          db.exec("insert into public.gift_items(title) values('Intruso')"),
          "42501",
        );
        await context("authenticated", stranger);
        await fails(
          db.exec("insert into public.gift_items(title) values('Intruso')"),
          "42501",
        );
        await context("authenticated", owner);
        assert.equal(
          await value(
            "select count(*)::integer as value from public.gift_items",
          ),
          5,
        );
        await db.query(
          "update public.gift_items set personal_note='Soy fan' where id=$1",
          [gifts[0]],
        );
        assert.equal(
          await value(
            "select personal_note as value from public.gift_items where id=$1",
            [gifts[0]],
          ),
          "Soy fan",
        );
      },
    );
    await t.test(
      "Un regalito se reserva 14 días y solo su comprobante cancela",
      async () => {
        await context("anon");
        const result = await reserveItem(gifts[0], hash("a"), hash("2"), 14);
        assert.equal(result.hours, 336);
        assert.equal((await itemState(gifts[0], hash("a"))).is_mine, true);
        const publicRows = await db.query<{ value: Record<string, unknown> }>(
          "select public.get_wishlist_gift_items() as value",
        );
        for (const row of publicRows.rows) {
          assert.ok(!("token_hash" in row.value));
          assert.ok(!("visitor_hash" in row.value));
        }
        await fails(
          value("select public.cancel_wishlist_gift($1,$2,$3) as value", [
            "item",
            gifts[0],
            hash("b"),
          ]),
          "P4090",
        );
        await fails(state(gifts[0]), "P0002");
        assert.equal(
          await value("select public.cancel_wishlist_gift($1,$2,$3) as value", [
            "item",
            gifts[0],
            hash("a"),
          ]),
          true,
        );
        assert.equal((await itemState(gifts[0])).reserved, false);
      },
    );
    await t.test(
      "La expiración también libera juegos y detalles de Harry Potter",
      async () => {
        await reserveItem(gifts[0]);
        await context("super");
        await db.query(
          "update public.gift_reservations set expires_at=now()-interval '1 second' where gift_item_id=$1",
          [gifts[0]],
        );
        await context("anon");
        assert.equal((await itemState(gifts[0])).reserved, false);
        const item = await value<Record<string, unknown>>(
          "select v as value from public.get_wishlist_gift_items() v where v->>'id'=$1",
          [gifts[0]],
        );
        assert.equal(item.reservation_expires_at, null);
        assert.equal((await reserveItem(gifts[0])).reserved, true);
        await context("authenticated", owner);
        await db.query(
          "update public.gift_items set status='owned' where id=$1",
          [gifts[0]],
        );
        await context("anon");
        await fails(itemState(gifts[0]), "P0002");
        await context("super");
        assert.equal(
          await value(
            "select status as value from public.gift_reservations where gift_item_id=$1",
            [gifts[0]],
          ),
          "cancelled",
        );
        await context("authenticated", owner);
        await db.query(
          "update public.gift_items set status='wishlist' where id=$1",
          [gifts[0]],
        );
        await context("anon");
        assert.equal((await itemState(gifts[0])).reserved, false);
      },
    );
    await t.test(
      "El límite de tres es compartido entre libros y otros regalos",
      async () => {
        await reserve(books[8], hash("a"), hash("3"));
        await reserveItem(gifts[0], hash("a"), hash("3"));
        await reserveItem(gifts[1], hash("a"), hash("3"));
        await fails(reserve(books[9], hash("a"), hash("3")), "P4290");
        await value("select public.cancel_wishlist_gift($1,$2,$3) as value", [
          "item",
          gifts[1],
          hash("a"),
        ]);
        assert.equal(
          (await reserve(books[9], hash("a"), hash("3"))).reserved,
          true,
        );
      },
    );
    await t.test(
      "Dos visitantes no pueden reservar el mismo regalito",
      async () => {
        const result = await Promise.allSettled([
          reserveItem(gifts[2], hash("a"), hash("4")),
          reserveItem(gifts[2], hash("b"), hash("5")),
        ]);
        assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
        assert.equal(result.filter((r) => r.status === "rejected").length, 1);
      },
    );
    await t.test(
      "Las imágenes de regalitos obtenidos quedan privadas",
      async () => {
        await context("super");
        await db.query(
          "update public.gift_items set image_url=$1 where id=$2",
          ["/media/gift.jpg", gifts[2]],
        );
        await db.query(
          "update public.gift_items set image_url=$1 where id=$2",
          ["/media/private-gift.jpg", privateGift],
        );
        await db.exec(
          "insert into storage.objects(bucket_id,name) values('book-covers','gift.jpg'),('book-covers','private-gift.jpg')",
        );
        await context("anon");
        assert.equal(
          await value(
            "select count(*)::integer as value from storage.objects where name='gift.jpg'",
          ),
          1,
        );
        assert.equal(
          await value(
            "select count(*)::integer as value from storage.objects where name='private-gift.jpg'",
          ),
          0,
        );
        await context("authenticated", owner);
        await db.query(
          "update public.gift_items set status='owned' where id=$1",
          [gifts[2]],
        );
        await context("anon");
        assert.equal(
          await value(
            "select count(*)::integer as value from storage.objects where name='gift.jpg'",
          ),
          0,
        );
      },
    );
    await t.test(
      "Cada reserva apunta a un solo destino y se elimina con él",
      async () => {
        await context("super");
        await fails(
          db.query(
            "insert into public.gift_reservations(book_id,gift_item_id,token_hash,visitor_hash,expires_at) values($1,$2,$3,$4,now())",
            [books[10], privateGift, hash("a"), hash("b")],
          ),
          "23514",
        );
        await context("authenticated", owner);
        await db.query("delete from public.gift_items where id=$1", [gifts[0]]);
        await context("super");
        assert.equal(
          await value(
            "select count(*)::integer as value from public.gift_reservations where gift_item_id=$1",
            [gifts[0]],
          ),
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});
