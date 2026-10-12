// ml-diagnose: verifica, sem publicar nada, se as contas conectadas conseguem anunciar.
// Para cada conta do Mercado Livre conectada: renova o acesso se precisar, lê a situação
// da conta (/users/me) e valida um produto real do catálogo em /items/validate.
// Autenticação: header x-sync-token (mesmo segredo interno do c7-sync).
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const ML = "https://api.mercadolibre.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 1), { status: s, headers: { "Content-Type": "application/json" } });
const norm = (t: unknown) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function accessToken(userId: string): Promise<{ token: string | null; refreshed: boolean; err?: string }> {
  const { data: t } = await admin.from("ml_tokens").select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
  if (!t) return { token: null, refreshed: false, err: "sem_token" };
  if (new Date(t.expires_at).getTime() - Date.now() > 120_000) return { token: t.access_token, refreshed: false };
  const r = await fetch(`${ML}/oauth/token`, {
    method: "POST", headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: Deno.env.get("ML_CLIENT_ID")!, client_secret: Deno.env.get("ML_CLIENT_SECRET")!, refresh_token: t.refresh_token }),
  }).catch(() => null);
  const tok = r ? await r.json().catch(() => null) : null;
  if (!r || !r.ok || !tok?.access_token) return { token: null, refreshed: false, err: `refresh_falhou:${r?.status}:${tok?.error ?? ""}:${tok?.message ?? ""}` };
  await admin.from("ml_tokens").update({
    access_token: tok.access_token, refresh_token: tok.refresh_token ?? t.refresh_token,
    expires_at: new Date(Date.now() + (Number(tok.expires_in) || 21600) * 1000).toISOString(), updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return { token: tok.access_token, refreshed: true };
}

function specsFromHtml(html: string) {
  const t = String(html ?? "").replace(/<(h[3-6]|p)[^>]*>\s*(?:<strong>)?([^<]{1,50}?)(?:<\/strong>)?\s*<\/\1>\s*<p[^>]*>([^<]{1,80})<\/p>/gi, "\n$2: $3\n")
    .replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ");
  return t.split("\n").map((l) => l.trim()).map((l) => l.match(/^([^:]{2,40}):\s*(.{1,80})$/)).filter(Boolean).map((m: any) => ({ k: m[1].trim(), v: m[2].trim() }));
}

Deno.serve(async (req) => {
  const { data: cfg } = await admin.from("internal_config").select("value").eq("key", "sync_token").maybeSingle();
  if (!cfg || req.headers.get("x-sync-token") !== cfg.value) return json({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));

  // produto de teste: com estoque, fotos e detalhes
  const { data: prods } = await admin.from("catalog_products")
    .select("id,name,gtin,price_dropshipping,price_list,stock,images,description_html,weight_kg,width_cm,height_cm,length_cm")
    .eq("active", true).gt("stock", 0).not("detail_synced_at", "is", null).not("gtin", "is", null)
    .order("stock", { ascending: false }).limit(body.product_offset ? Number(body.product_offset) + 1 : 1);
  const p: any = prods?.[prods.length - 1];

  const { data: accs } = await admin.from("ml_accounts").select("user_id, nickname, status");
  const out: any[] = [];
  for (const a of accs ?? []) {
    const rep: any = { nickname: a.nickname, status_db: a.status };
    const at = await accessToken(a.user_id);
    rep.token = at.token ? (at.refreshed ? "renovado" : "valido") : at.err;
    if (!at.token) { out.push(rep); continue; }
    const H = { Authorization: `Bearer ${at.token}`, "Content-Type": "application/json", Accept: "application/json" };
    const me = await fetch(`${ML}/users/me`, { headers: H }).then((r) => r.json()).catch(() => null);
    rep.user = me ? { id: me.id, site: me.site_id, list: me.status?.list, sell: me.status?.sell, user_type: me.user_type, tags: me.tags } : null;
    if (!p) { rep.validate = "sem_produto_de_teste"; out.push(rep); continue; }
    const title = String(p.name).replace(/\s+/g, " ").trim().slice(0, 60);
    const disc = await fetch(`${ML}/sites/MLB/domain_discovery/search?limit=1&q=${encodeURIComponent(title)}`, { headers: H }).then((r) => r.json()).catch(() => null);
    const categoryId = Array.isArray(disc) ? disc[0]?.category_id : null;
    rep.category = categoryId ? { id: categoryId, domain: disc[0]?.domain_name } : disc;
    if (!categoryId) { out.push(rep); continue; }
    const cost = Number(p.price_dropshipping ?? p.price_list ?? 0);
    const price = Math.round(((cost * 1.35 + 5) / 0.9701) * 100) / 100;
    const attrs: any[] = [{ id: "BRAND", value_name: "Genérica" }, { id: "MODEL", value_name: "Padrão" }, { id: "ITEM_CONDITION", value_name: "Novo" }, { id: "GTIN", value_name: String(p.gtin).replace(/\D/g, "") }];
    if (p.height_cm) attrs.push({ id: "SELLER_PACKAGE_HEIGHT", value_name: `${Math.ceil(p.height_cm)} cm` });
    if (p.width_cm) attrs.push({ id: "SELLER_PACKAGE_WIDTH", value_name: `${Math.ceil(p.width_cm)} cm` });
    if (p.length_cm) attrs.push({ id: "SELLER_PACKAGE_LENGTH", value_name: `${Math.ceil(p.length_cm)} cm` });
    if (p.weight_kg) attrs.push({ id: "SELLER_PACKAGE_WEIGHT", value_name: `${Math.ceil(p.weight_kg * 1000)} g` });
    const catAttrs = await fetch(`${ML}/categories/${categoryId}/attributes`, { headers: H }).then((r) => r.json()).catch(() => []);
    const specs = specsFromHtml(p.description_html);
    const required = (Array.isArray(catAttrs) ? catAttrs : []).filter((x: any) => (x.tags?.required || x.tags?.catalog_required) && !x.tags?.read_only)
      .map((x: any) => ({ id: x.id, name: x.name, type: x.value_type, has: attrs.some((y) => y.id === x.id) || specs.some((s) => norm(s.k) === norm(x.name)) }));
    rep.required_attrs = required;
    const item = {
      title, category_id: categoryId, price, currency_id: "BRL", available_quantity: Math.min(5, p.stock), buying_mode: "buy_it_now",
      condition: "new", listing_type_id: "gold_special", pictures: (p.images ?? []).slice(0, 6).map((s: string) => ({ source: s })), attributes: attrs,
    };
    const sp = await fetch(`${ML}/users/${me.id}/shipping_preferences`, { headers: H }).then((r) => r.json()).catch(() => null);
    rep.shipping_prefs = sp ? { modes: sp.modes, logistics: (sp.logistics ?? []).map((l: any) => ({ mode: l.mode, types: (l.types ?? []).map((t: any) => t.type) })) } : null;
    const modes: string[] = Array.isArray(sp?.modes) ? sp.modes : [];
    const mode = modes.includes("me2") ? "me2" : modes.includes("not_specified") ? "not_specified" : modes[0] ?? "not_specified";
    (item as any).shipping = { mode, local_pick_up: false, free_shipping: false };
    rep.test_item = { product: p.name, price, pictures: item.pictures.length, shipping_mode: mode };
    const v = await fetch(`${ML}/items/validate`, { method: "POST", headers: H, body: JSON.stringify(item) });
    rep.validate = { status: v.status, body: v.status === 204 ? "OK (seria aceito)" : await v.json().catch(() => null) };
    if (v.status !== 204 && JSON.stringify(rep.validate.body ?? "").includes("family_name")) {
      const { title: _t, ...rest } = item as any;
      const v2 = await fetch(`${ML}/items/validate`, { method: "POST", headers: H, body: JSON.stringify({ ...rest, family_name: title }) });
      rep.validate_family_name = { status: v2.status, body: v2.status === 204 ? "OK (seria aceito)" : await v2.json().catch(() => null) };
    }
    if (body.variants) {
      const base: any = JSON.parse(JSON.stringify(item));
      const tries: Record<string, any> = {
        ship_me2_only: { ...base, shipping: { mode: "me2" } },
        no_shipping: (() => { const x = { ...base }; delete x.shipping; return x; })(),
        no_pkg_attrs: { ...base, attributes: base.attributes.filter((a: any) => !String(a.id).startsWith("SELLER_PACKAGE")) },
        gold_pro: { ...base, listing_type_id: "gold_pro" },
        with_sale_terms: { ...base, sale_terms: [{ id: "WARRANTY_TYPE", value_name: "Garantia do vendedor" }, { id: "WARRANTY_TIME", value_name: "90 dias" }] },
        family_name: (() => { const x = { ...base, family_name: base.title }; delete x.title; return x; })(),
        price_50: { ...base, price: 50 },
      };
      rep.variants = {};
      for (const [k, it] of Object.entries(tries)) {
        const r = await fetch(`${ML}/items/validate`, { method: "POST", headers: H, body: JSON.stringify(it) });
        const b = r.status === 204 ? "OK" : await r.json().catch(() => null);
        rep.variants[k] = { status: r.status, causes: b === "OK" ? "OK" : (b?.cause ?? []).map((c: any) => typeof c === "string" ? c : `${c.type}:${c.code}`), msg: b?.message };
      }
    }
    out.push(rep);
  }
  return json({ product: p?.name ?? null, accounts: out });
});
