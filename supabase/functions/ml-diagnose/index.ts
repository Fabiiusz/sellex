// ml-diagnose: ferramenta interna de diagnóstico das contas do Mercado Livre conectadas.
//   { item_id }                -> situação de um anúncio
//   { item_id, activate:true } -> tenta ativar o anúncio
//   { orders:true }            -> confere a busca de pedidos (contagem e formato, sem dados do comprador)
// Autenticação: header x-sync-token (mesmo segredo interno do c7-sync).
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ML = "https://api.mercadolibre.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 1), { status: s, headers: { "Content-Type": "application/json" } });

async function accessToken(userId: string): Promise<{ token: string | null; err?: string }> {
  const { data: t } = await admin.from("ml_tokens").select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
  if (!t) return { token: null, err: "sem_token" };
  if (new Date(t.expires_at).getTime() - Date.now() > 120_000) return { token: t.access_token };
  const r = await fetch(`${ML}/oauth/token`, {
    method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: Deno.env.get("ML_CLIENT_ID")!, client_secret: Deno.env.get("ML_CLIENT_SECRET")!, refresh_token: t.refresh_token }),
  }).catch(() => null);
  const tok = r ? await r.json().catch(() => null) : null;
  if (!r || !r.ok || !tok?.access_token) return { token: null, err: `refresh_falhou:${r?.status}` };
  await admin.from("ml_tokens").update({
    access_token: tok.access_token, refresh_token: tok.refresh_token ?? t.refresh_token,
    expires_at: new Date(Date.now() + (Number(tok.expires_in) || 21600) * 1000).toISOString(), updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return { token: tok.access_token };
}

Deno.serve(async (req) => {
  const { data: cfg } = await admin.from("internal_config").select("value").eq("key", "sync_token").maybeSingle();
  if (!cfg || req.headers.get("x-sync-token") !== cfg.value) return json({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const { data: accs } = await admin.from("ml_accounts").select("user_id, nickname, ml_user_id");
  const res: any[] = [];

  if (body.orders) {
    for (const a of accs ?? []) {
      const at = await accessToken(a.user_id);
      if (!at.token) { res.push({ nickname: a.nickname, token: at.err }); continue; }
      const H = { Authorization: `Bearer ${at.token}`, Accept: "application/json" };
      const since = new Date(Date.now() - 90 * 86400_000).toISOString().replace(/\.\d+Z$/, ".000-00:00");
      const r = await fetch(`${ML}/orders/search?seller=${a.ml_user_id}&sort=date_desc&limit=5&order.date_created.from=${encodeURIComponent(since)}`, { headers: H });
      const j = await r.json().catch(() => null);
      res.push({ nickname: a.nickname, http: r.status, total: j?.paging?.total ?? null, error: j?.message ?? null,
        sample: (j?.results ?? []).slice(0, 2).map((o: any) => ({ status: o.status, items: (o.order_items ?? []).length, has_shipping: !!o.shipping?.id })) });
    }
    return json({ orders: res });
  }

  if (!body.item_id) return json({ error: "use item_id ou orders" }, 400);
  for (const a of accs ?? []) {
    const at = await accessToken(a.user_id);
    if (!at.token) continue;
    const H = { Authorization: `Bearer ${at.token}`, "Content-Type": "application/json", Accept: "application/json" };
    const it = await fetch(`${ML}/items/${encodeURIComponent(body.item_id)}`, { headers: H }).then((r) => r.json()).catch(() => null);
    if (!it || String(it.seller_id) !== String(a.ml_user_id)) continue;
    const out: any = { nickname: a.nickname, id: it.id, status: it.status, sub_status: it.sub_status, tags: it.tags,
      title: it.title, price: it.price, available_quantity: it.available_quantity, shipping: it.shipping, permalink: it.permalink,
      date_created: it.date_created, last_updated: it.last_updated };
    if (body.activate) {
      const r = await fetch(`${ML}/items/${it.id}`, { method: "PUT", headers: H, body: JSON.stringify({ status: "active" }) });
      out.activate = { status: r.status };
    }
    res.push(out);
  }
  return json({ item: body.item_id, found: res });
});
