// ml-publish: publica um produto do lojista logado no Mercado Livre dele.
//
// O front-end manda os dados do anúncio (título, descrição, preço, fotos, atributos).
// O estoque vem sempre do catálogo do fornecedor (catalog_products), nunca do navegador.
// Sempre responde 200 com { ok: true, ... } ou { ok: false, step, error, message, causes },
// para o front-end conseguir mostrar a mensagem certa no popup de publicação.
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const ML = "https://api.mercadolibre.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const fail = (step: string, error: string, message: string, causes: string[] = []) => {
  console.log("ml-publish: falhou", JSON.stringify({ step, error, causes }));
  return json({ ok: false, step, error, message, causes });
};

const GTIN_REASON: Record<string, string> = {
  no_code: "O produto não tem código cadastrado",
  kit: "O produto é um kit ou pack",
  handmade: "O produto é artesanal",
};

// Token válido do usuário; renova com o refresh_token quando está para vencer.
async function accessToken(userId: string): Promise<string | null> {
  const { data: t } = await admin.from("ml_tokens")
    .select("access_token, refresh_token, expires_at").eq("user_id", userId).maybeSingle();
  if (!t) return null;
  if (new Date(t.expires_at).getTime() - Date.now() > 120_000) return t.access_token;
  const clientId = Deno.env.get("ML_CLIENT_ID"), clientSecret = Deno.env.get("ML_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  const r = await fetch(`${ML}/oauth/token`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token", client_id: clientId, client_secret: clientSecret, refresh_token: t.refresh_token,
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  const tok = r ? await r.json().catch(() => null) : null;
  if (!r || !r.ok || !tok?.access_token) {
    console.error("ml-publish: refresh falhou", r?.status, tok?.error);
    await admin.from("ml_accounts").update({ status: "expired" }).eq("user_id", userId);
    return null;
  }
  await admin.from("ml_tokens").update({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? t.refresh_token,
    expires_at: new Date(Date.now() + (Number(tok.expires_in) || 21_600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return tok.access_token;
}

// Motivos de recusa do ML traduzidos, com o que o lojista precisa fazer
const KNOWN: Record<string, string> = {
  address_pending: "Sua conta do Mercado Livre ainda não tem endereço cadastrado. Entre no Mercado Livre > Meu perfil > Endereços e cadastre um (pode usar o endereço do fornecedor, em Integrações).",
  phone_pending: "Sua conta do Mercado Livre precisa de um telefone confirmado. Cadastre em Meu perfil > Dados pessoais.",
  identification_pending: "O Mercado Livre pede que você confirme seus dados (CPF/CNPJ) antes de anunciar.",
  "seller.unable_to_list": "Sua conta do Mercado Livre está impedida de anunciar no momento.",
  "item.price.invalid": "O preço não é aceito pelo Mercado Livre nessa categoria.",
  "item.title.length.invalid": "O título passou do limite de letras da categoria.",
  "item.pictures.invalid": "O Mercado Livre não conseguiu baixar as fotos do produto.",
  "item.attributes.missing_required": "A categoria exige atributos que não foram preenchidos.",
  "item.category_id.invalid": "A categoria sugerida não aceita anúncios diretos.",
  "item.listing_type_id.invalid": "O tipo de anúncio não é aceito para esta conta.",
  "seller.shipping_mode.not_supported": "A forma de envio da sua conta não é aceita nesta categoria.",
};
function mlCauses(body: any): string[] {
  const out: string[] = [];
  const add = (code?: string, msg?: string) => {
    const k = String(code ?? "").trim();
    const t = KNOWN[k] ?? (msg ? String(msg) : k);
    if (t && !out.includes(t)) out.push(t);
  };
  const list = Array.isArray(body?.cause) ? body.cause : [];
  for (const c of list) {
    if (typeof c === "string") add(c);
    else if (c && c.type !== "warning") add(c.code, c.message);
  }
  if (!out.length) add(body?.message, body?.error);
  return out.slice(0, 6);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u, error: uerr } = await admin.auth.getUser(jwt);
  if (uerr || !u?.user) return fail("auth", "unauthorized", "Sua sessão expirou. Entre de novo no Sellex.");
  const userId = u.user.id;

  const b = await req.json().catch(() => null);
  if (!b) return fail("product", "bad_request", "Dados do anúncio inválidos.");
  const title = String(b.title ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const description = String(b.description ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 50_000);
  const price = Math.round(Number(b.price) * 100) / 100;
  const brand = String(b.brand ?? "").trim().slice(0, 80);
  const model = String(b.model ?? "").trim().slice(0, 80);
  const gtin = String(b.gtin ?? "").replace(/\D/g, "").slice(0, 14);
  const pictures = (Array.isArray(b.images) ? b.images : [])
    .map(String).filter((s: string) => /^https:\/\/\S+$/.test(s)).slice(0, 10);
  if (!title || !(price > 0) || !brand || !model || !pictures.length || (!gtin && !GTIN_REASON[b.gtinReason])) {
    return fail("product", "incomplete", "Faltam dados obrigatórios no anúncio.");
  }

  // Estoque real do fornecedor
  let stock = 0, dims: any = null;
  if (b.catalogId) {
    const { data: c } = await admin.from("catalog_products")
      .select("stock, active, weight_kg, width_cm, height_cm, length_cm").eq("id", String(b.catalogId)).maybeSingle();
    if (!c || !c.active) return fail("stock", "not_in_catalog", "Este produto não está mais no catálogo do fornecedor.");
    stock = Math.max(0, Number(c.stock) || 0);
    dims = c;
  } else {
    stock = Math.max(0, Math.floor(Number(b.stock) || 0));
  }
  if (stock <= 0) return fail("stock", "no_stock", "O fornecedor está sem estoque deste produto agora.");

  // Conta do Mercado Livre
  const { data: acc } = await admin.from("ml_accounts").select("status").eq("user_id", userId).maybeSingle();
  if (!acc) return fail("integration", "ml_not_connected", "Conecte sua conta do Mercado Livre em Integrações.");
  const token = await accessToken(userId);
  if (!token) return fail("integration", "ml_expired", "A conexão com o Mercado Livre expirou. Conecte de novo em Integrações.");
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" };

  // A conta pode anunciar? (o ML bloqueia, por exemplo, contas sem endereço cadastrado)
  const me = await fetch(`${ML}/users/me`, { headers: H, signal: AbortSignal.timeout(15_000) })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (me?.status?.list && me.status.list.allow === false) {
    const codes: string[] = Array.isArray(me.status.list.codes) ? me.status.list.codes : [];
    return fail("integration", "seller_cannot_list",
      "Sua conta do Mercado Livre ainda não pode anunciar.",
      mlCauses({ cause: codes.length ? codes : ["seller.unable_to_list"] }));
  }

  // Categoria sugerida pelo próprio ML a partir do título
  const disc = await fetch(`${ML}/sites/MLB/domain_discovery/search?limit=1&q=${encodeURIComponent(title)}`, {
    headers: H, signal: AbortSignal.timeout(15_000),
  }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const categoryId = Array.isArray(disc) && disc[0]?.category_id ? String(disc[0].category_id) : null;
  if (!categoryId) return fail("publish", "no_category", "O Mercado Livre não encontrou uma categoria para este título. Deixe o título mais descritivo.");

  const attributes: any[] = [
    { id: "BRAND", value_name: brand },
    { id: "MODEL", value_name: model },
    { id: "ITEM_CONDITION", value_name: "Novo" },
  ];
  if (gtin) attributes.push({ id: "GTIN", value_name: gtin });
  else attributes.push({ id: "EMPTY_GTIN_REASON", value_name: GTIN_REASON[b.gtinReason] });
  if (dims?.height_cm) attributes.push({ id: "SELLER_PACKAGE_HEIGHT", value_name: `${Math.ceil(Number(dims.height_cm))} cm` });
  if (dims?.width_cm) attributes.push({ id: "SELLER_PACKAGE_WIDTH", value_name: `${Math.ceil(Number(dims.width_cm))} cm` });
  if (dims?.length_cm) attributes.push({ id: "SELLER_PACKAGE_LENGTH", value_name: `${Math.ceil(Number(dims.length_cm))} cm` });
  if (dims?.weight_kg) attributes.push({ id: "SELLER_PACKAGE_WEIGHT", value_name: `${Math.ceil(Number(dims.weight_kg) * 1000)} g` });

  const item: Record<string, unknown> = {
    title,
    category_id: categoryId,
    price,
    currency_id: "BRL",
    available_quantity: stock,
    buying_mode: "buy_it_now",
    condition: "new",
    listing_type_id: b.listingType === "gold_pro" ? "gold_pro" : "gold_special",
    pictures: pictures.map((source: string) => ({ source })),
    attributes,
  };
  if (b.sku) item.seller_custom_field = String(b.sku).slice(0, 60);

  const post = (body: unknown) => fetch(`${ML}/items`, {
    method: "POST", headers: H, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000),
  }).then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => null) }))
    .catch(() => ({ ok: false, status: 0, body: null as any }));

  let res = await post(item);
  // Contas no modelo "user products" do ML exigem family_name no lugar do título
  if (!res.ok && JSON.stringify(res.body ?? "").includes("family_name")) {
    const { title: _t, ...rest } = item;
    res = await post({ ...rest, family_name: title });
  }
  if (!res.ok || !res.body?.id) {
    console.error("ml-publish: ML recusou", res.status, JSON.stringify(res.body)?.slice(0, 800));
    return fail("publish", "ml_rejected",
      res.status === 0 ? "O Mercado Livre não respondeu. Tente de novo em instantes."
        : res.status === 403 ? "O Mercado Livre não deixou sua conta publicar agora."
        : "O Mercado Livre recusou o anúncio.",
      mlCauses(res.body));
  }
  const itemId = String(res.body.id);
  console.log("ml-publish: publicado", JSON.stringify({ itemId, status: res.body.status, categoryId }));

  // Descrição (texto simples). Se falhar, o anúncio continua publicado.
  let descriptionSaved = true;
  if (description) {
    const d = await fetch(`${ML}/items/${itemId}/description`, {
      method: "POST", headers: H, body: JSON.stringify({ plain_text: description }), signal: AbortSignal.timeout(20_000),
    }).catch(() => null);
    descriptionSaved = !!d?.ok;
  }

  return json({
    ok: true,
    id: itemId,
    permalink: res.body.permalink ?? null,
    status: res.body.status ?? null,
    category_id: categoryId,
    available_quantity: stock,
    description_saved: descriptionSaved,
  });
});
