// sx-admin: área do dono do Sellex (aba "Clientes").
// Só responde para quem tem app_metadata.role = "admin" (conferido no servidor, a cada chamada).
// Ações (POST JSON):
//   { action: "list" }                    -> clientes + resumo de uso (produtos, publicados, vendas)
//   { action: "detail", user_id }         -> tudo da conta: produtos, ajustes, pedidos no fornecedor e vendas do ML
//   { action: "approve" | "block", user_id }
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ML = "https://api.mercadolibre.com";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function mlToken(userId: string): Promise<string | null> {
  const { data: t } = await admin.from("ml_tokens").select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
  if (!t) return null;
  if (new Date(t.expires_at).getTime() - Date.now() > 120_000) return t.access_token;
  const r = await fetch(`${ML}/oauth/token`, {
    method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: Deno.env.get("ML_CLIENT_ID")!, client_secret: Deno.env.get("ML_CLIENT_SECRET")!, refresh_token: t.refresh_token }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  const tok = r ? await r.json().catch(() => null) : null;
  if (!r || !r.ok || !tok?.access_token) return null;
  await admin.from("ml_tokens").update({
    access_token: tok.access_token, refresh_token: tok.refresh_token ?? t.refresh_token,
    expires_at: new Date(Date.now() + (Number(tok.expires_in) || 21600) * 1000).toISOString(), updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return tok.access_token;
}

// vendas do ML do cliente (mesmo formato do ml-orders, sem buscar envio a envio)
async function mlOrders(userId: string, sellerId: string | number) {
  const token = await mlToken(userId);
  if (!token) return { error: "A conexão desta conta com o Mercado Livre expirou." };
  const H = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  const since = new Date(Date.now() - 90 * 86400_000).toISOString().replace(/\.\d+Z$/, ".000-00:00");
  const orders: any[] = [];
  let total90 = 0;
  for (let offset = 0; offset < 150; offset += 50) {
    const url = `${ML}/orders/search?seller=${sellerId}&sort=date_desc&limit=50&offset=${offset}&order.date_created.from=${encodeURIComponent(since)}`;
    const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(20_000) }).then((x) => x.json()).catch(() => null);
    const res = Array.isArray(r?.results) ? r.results : [];
    if (offset === 0) total90 = Number(r?.paging?.total ?? res.length);
    orders.push(...res);
    if (res.length < 50) break;
  }
  const all = await fetch(`${ML}/orders/search?seller=${sellerId}&limit=1`, { headers: H, signal: AbortSignal.timeout(15_000) })
    .then((x) => x.json()).catch(() => null);
  const list = orders.map((o) => ({
    id: String(o.id), pack_id: o.pack_id ? String(o.pack_id) : null, date: o.date_created, status: o.status,
    total: Number(o.total_amount ?? 0), paid: Number(o.paid_amount ?? 0),
    buyer: o.buyer ? (o.buyer.nickname || [o.buyer.first_name, o.buyer.last_name].filter(Boolean).join(" ")) : "",
    items: (o.order_items ?? []).map((it: any) => ({
      item_id: it.item?.id ?? null, title: it.item?.title ?? "", sku: it.item?.seller_sku ?? it.item?.seller_custom_field ?? null,
      qty: Number(it.quantity ?? 1), unit_price: Number(it.unit_price ?? 0), sale_fee: Number(it.sale_fee ?? 0),
    })),
    shipping: o.shipping?.id ? { id: String(o.shipping.id), status: o.shipping?.status ?? null, substatus: null, logistic: null, city: null, state: null, receiver: null } : null,
  }));
  return { orders: list, total90, totalAll: Number(all?.paging?.total ?? 0) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: me, error: meErr } = await admin.auth.getUser(jwt);
  if (meErr || !me?.user) return json({ ok: false, error: "unauthorized" }, 401);
  if (me.user.app_metadata?.role !== "admin") return json({ ok: false, error: "forbidden" }, 403);

  const b = await req.json().catch(() => ({}));
  const action = String(b?.action ?? "list");

  if (action === "list") {
    const users: any[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ ok: false, error: "list_failed" }, 500);
      users.push(...data.users);
      if (data.users.length < 200) break;
    }
    const { data: accs } = await admin.from("ml_accounts").select("user_id, nickname, status");
    const mlBy = new Map((accs ?? []).map((a: any) => [a.user_id, a]));
    const { data: states } = await admin.from("sx_user_state").select("user_id, stats, updated_at");
    const stBy = new Map((states ?? []).map((s: any) => [s.user_id, s]));
    const list = users.map((u) => {
      const a: any = mlBy.get(u.id), s: any = stBy.get(u.id);
      return {
        id: u.id, email: u.email ?? "", name: u.user_metadata?.name ?? "",
        created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null,
        pending: u.app_metadata?.access === "pending", admin: u.app_metadata?.role === "admin",
        ml: a ? { nickname: a.nickname, status: a.status } : null,
        stats: s?.stats ?? null, active_at: s?.updated_at ?? null,
      };
    }).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return json({ ok: true, users: list });
  }

  if (action === "detail") {
    const id = String(b?.user_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: "bad_user" }, 400);
    const { data: target, error: tErr } = await admin.auth.admin.getUserById(id);
    if (tErr || !target?.user) return json({ ok: false, error: "not_found" }, 404);
    const u = target.user;
    const { data: acc } = await admin.from("ml_accounts").select("ml_user_id, nickname, site_id, status, connected_at").eq("user_id", id).maybeSingle();
    const { data: st } = await admin.from("sx_user_state").select("products, settings, extra, stats, updated_at").eq("user_id", id).maybeSingle();
    let sales: any = null;
    if (acc?.ml_user_id) sales = await mlOrders(id, acc.ml_user_id).catch(() => ({ error: "Não consegui buscar as vendas no Mercado Livre agora." }));
    console.log("sx-admin: detail", id, "por", me.user.id);
    return json({
      ok: true,
      user: {
        id: u.id, email: u.email ?? "", name: u.user_metadata?.name ?? "", created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null, pending: u.app_metadata?.access === "pending", admin: u.app_metadata?.role === "admin",
      },
      ml: acc ? { nickname: acc.nickname, site_id: acc.site_id, status: acc.status, connected_at: acc.connected_at } : null,
      state: st ?? null,
      sales,
    });
  }

  if (action === "approve" || action === "block") {
    const id = String(b?.user_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: "bad_user" }, 400);
    if (id === me.user.id) return json({ ok: false, error: "self", message: "Você não pode alterar a sua própria conta." });
    const { data: target, error: tErr } = await admin.auth.admin.getUserById(id);
    if (tErr || !target?.user) return json({ ok: false, error: "not_found" }, 404);
    if (target.user.app_metadata?.role === "admin") return json({ ok: false, error: "is_admin", message: "Contas de administrador não podem ser bloqueadas por aqui." });
    const app = { ...(target.user.app_metadata ?? {}), access: action === "approve" ? "approved" : "pending" };
    const { error } = await admin.auth.admin.updateUserById(id, { app_metadata: app });
    if (error) return json({ ok: false, error: "update_failed" }, 500);
    if (action === "block") await admin.auth.admin.signOut(id).catch(() => null);
    console.log("sx-admin:", action, id, "por", me.user.id);
    return json({ ok: true, user_id: id, pending: action === "block" });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});
