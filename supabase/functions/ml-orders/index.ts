// ml-orders: vendas do lojista logado no Mercado Livre dele.
//   { action: "list" }                     -> últimos pedidos (até 100, 90 dias) com situação do envio
//   { action: "label", shipment_id }       -> etiqueta do Mercado Envios em PDF (base64)
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ML = "https://api.mercadolibre.com";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function accessToken(userId: string): Promise<string | null> {
  const { data: t } = await admin.from("ml_tokens").select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
  if (!t) return null;
  if (new Date(t.expires_at).getTime() - Date.now() > 120_000) return t.access_token;
  const r = await fetch(`${ML}/oauth/token`, {
    method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: Deno.env.get("ML_CLIENT_ID")!, client_secret: Deno.env.get("ML_CLIENT_SECRET")!, refresh_token: t.refresh_token }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  const tok = r ? await r.json().catch(() => null) : null;
  if (!r || !r.ok || !tok?.access_token) {
    await admin.from("ml_accounts").update({ status: "expired" }).eq("user_id", userId);
    return null;
  }
  await admin.from("ml_tokens").update({
    access_token: tok.access_token, refresh_token: tok.refresh_token ?? t.refresh_token,
    expires_at: new Date(Date.now() + (Number(tok.expires_in) || 21600) * 1000).toISOString(), updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return tok.access_token;
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) { const k = i++; if (k >= items.length) return; out[k] = await fn(items[k]); }
  }));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u, error: uerr } = await admin.auth.getUser(jwt);
  if (uerr || !u?.user) return json({ ok: false, error: "unauthorized", message: "Sua sessão expirou. Entre de novo." });
  const userId = u.user.id;
  const b = await req.json().catch(() => ({}));

  const { data: acc } = await admin.from("ml_accounts").select("ml_user_id").eq("user_id", userId).maybeSingle();
  if (!acc) return json({ ok: false, error: "ml_not_connected", message: "Conecte sua conta do Mercado Livre em Integrações." });
  const token = await accessToken(userId);
  if (!token) return json({ ok: false, error: "ml_expired", message: "A conexão com o Mercado Livre expirou. Conecte de novo em Integrações." });
  const H = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  if (b.action === "label") {
    const sid = String(b.shipment_id ?? "").replace(/\D/g, "");
    if (!sid) return json({ ok: false, error: "bad_request" });
    // confere que o envio é deste vendedor
    const sh = await fetch(`${ML}/shipments/${sid}`, { headers: { ...H, "x-format-new": "true" } }).then((r) => r.json()).catch(() => null);
    const sellerId = sh?.sender_id ?? sh?.origin?.sender_id;
    if (!sh || (sellerId && String(sellerId) !== String(acc.ml_user_id))) return json({ ok: false, error: "not_found", message: "Envio não encontrado nesta conta." });
    const r = await fetch(`${ML}/shipment_labels?shipment_ids=${sid}&response_type=pdf`, { headers: H });
    if (!r.ok) {
      const e = await r.json().catch(() => null);
      return json({ ok: false, error: "label_unavailable", message: "A etiqueta ainda não está disponível. Ela é liberada quando o pedido está pago e pronto para envio.", detail: e?.message ?? null });
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return json({ ok: true, filename: `etiqueta-${sid}.pdf`, pdf_base64: btoa(bin) });
  }

  // lista de pedidos
  const since = new Date(Date.now() - 90 * 86400_000).toISOString().replace(/\.\d+Z$/, ".000-00:00");
  const orders: any[] = [];
  for (let offset = 0; offset < 100; offset += 50) {
    const url = `${ML}/orders/search?seller=${acc.ml_user_id}&sort=date_desc&limit=50&offset=${offset}&order.date_created.from=${encodeURIComponent(since)}`;
    const r = await fetch(url, { headers: H, signal: AbortSignal.timeout(20_000) }).then((x) => x.json()).catch(() => null);
    const res = Array.isArray(r?.results) ? r.results : [];
    orders.push(...res);
    if (res.length < 50) break;
  }
  const shipIds = [...new Set(orders.map((o) => o.shipping?.id).filter(Boolean))].slice(0, 60);
  const ships = await pool(shipIds, 6, async (id) => {
    const s = await fetch(`${ML}/shipments/${id}`, { headers: { ...H, "x-format-new": "true" }, signal: AbortSignal.timeout(15_000) }).then((x) => x.json()).catch(() => null);
    return [id, s] as const;
  });
  const shipBy = new Map(ships.filter(([, s]) => s && !s.error).map(([id, s]) => [String(id), s]));

  const list = orders.map((o) => {
    const s: any = o.shipping?.id ? shipBy.get(String(o.shipping.id)) : null;
    const addr = s?.destination?.shipping_address ?? s?.receiver_address ?? null;
    return {
      id: String(o.id),
      pack_id: o.pack_id ? String(o.pack_id) : null,
      date: o.date_created,
      status: o.status,
      total: Number(o.total_amount ?? 0),
      paid: Number(o.paid_amount ?? 0),
      buyer: o.buyer ? (o.buyer.nickname || [o.buyer.first_name, o.buyer.last_name].filter(Boolean).join(" ")) : "",
      items: (o.order_items ?? []).map((it: any) => ({
        item_id: it.item?.id ?? null, title: it.item?.title ?? "", sku: it.item?.seller_sku ?? it.item?.seller_custom_field ?? null,
        qty: Number(it.quantity ?? 1), unit_price: Number(it.unit_price ?? 0), sale_fee: Number(it.sale_fee ?? 0),
      })),
      shipping: o.shipping?.id ? {
        id: String(o.shipping.id),
        status: s?.status ?? null, substatus: s?.substatus ?? null,
        logistic: s?.logistic?.type ?? s?.logistic_type ?? null,
        city: addr?.city?.name ?? null, state: addr?.state?.id ?? addr?.state?.name ?? null,
        receiver: addr?.receiver_name ?? null,
      } : null,
    };
  });
  return json({ ok: true, seller_id: acc.ml_user_id, orders: list, fetched_at: new Date().toISOString() });
});
