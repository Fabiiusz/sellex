(function(){
"use strict";

/* ================= ícones dos canais (embutidos) ================= */
var CH_ICON = {
  shopee: "assets/shopee.png",
  ml: "assets/ml.png",
  amazon: "assets/amazon.png",
  shein: "assets/shein.png"
};

var CHANNELS = {
  shopee: { name: "Shopee" },
  ml: { name: "Mercado Livre" },
  amazon: { name: "Amazon" },
  shein: { name: "Shein" }
};

/* ================= util ================= */
function fmtBRL(v){ return (v||0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); }
function fmtInt(v){ return Math.round(v||0).toLocaleString('pt-BR'); }
function fmtPct(v){
  if (!isFinite(v)) return "—";
  var s = v.toLocaleString('pt-BR', {maximumFractionDigits:1, minimumFractionDigits:1});
  return (v>=0? "+":"") + s + "%";
}
function pad2(n){ return n<10 ? "0"+n : ""+n; }
function isoDate(d){ return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
function daysAgo(iso, today){
  var d0 = new Date(today+"T00:00:00");
  var d1 = new Date(iso+"T00:00:00");
  return Math.round((d0-d1)/86400000);
}
function relDate(iso, today){
  var n = daysAgo(iso, today);
  if (n<=0) return "Hoje";
  if (n===1) return "Ontem";
  return "há " + n + " dias";
}
function uid(prefix){ return prefix + "_" + Math.random().toString(36).slice(2,9); }
function escapeHtml(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function iconSVG(key, cls){ return '<svg'+(cls?' class="'+cls+'"':'')+'><use href="#pi-'+(key||"box")+'"/></svg>'; }
var ICON_LABELS = {
  fone:"Fone de ouvido", headsetgamer:"Headset gamer", caixasom:"Caixa de som", carregador:"Carregador",
  ventilador:"Ventilador", difusor:"Difusor/umidificador", pincel:"Pincéis de maquiagem", secador:"Secador de cabelo",
  "round-brush":"Escova secadora", straightener:"Chapinha/alisadora", "watch-smart":"Relógio digital/smartwatch",
  "watch-analog":"Relógio analógico", oculos:"Óculos de sol", mochila:"Mochila", garrafa:"Garrafa térmica",
  luminaria:"Luminária", suportecelular:"Suporte veicular", airfryer:"Fritadeira sem óleo", organizador:"Organizador",
  camera:"Câmera de segurança", powerbank:"Power bank", caneca:"Caneca térmica", cinto:"Cinto", skincare:"Skincare",
  smartphone:"Smartphone", notebook:"Notebook", panela:"Panela/kit de cozinha", teclado:"Teclado", mouse:"Mouse", box:"Genérico"
};

function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ seed>>>15, 1 | seed);
    t = (t + Math.imul(t ^ t>>>7, 61 | t)) ^ t;
    return ((t ^ t>>>14) >>> 0) / 4294967296;
  };
}
function hashSeed(str){
  var h = 0;
  for (var i=0;i<str.length;i++){ h = (Math.imul(31,h) + str.charCodeAt(i)) | 0; }
  return h;
}

/* ================= storage ================= */
var STORE_KEYS = { products:"sx_products_v2_c7", channels:"sx_channels_v1", settings:"sx_settings_v1" };
function loadJSON(key, fallback){
  try{
    var raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  }catch(e){ return fallback; }
}
function saveJSON(key, value){
  try{ window.localStorage.setItem(key, JSON.stringify(value)); }catch(e){ /* ignora se indisponível */ }
}

/* ================= dados iniciais ================= */
function defaultProducts(){
  return [
    {id:"p1", name:"Fone Bluetooth Pro", icon:"fone", channel:"ml", category:"Eletrônicos", price:129.90, stock:320, active:true, weight:3, margin:40},
    {id:"p2", name:"Smartwatch Ultra", icon:"watch-smart", channel:"shopee", category:"Eletrônicos", price:199.90, stock:84, active:true, weight:2.6, margin:35},
    {id:"p3", name:"Air Fryer 4L", icon:"airfryer", channel:"amazon", category:"Casa", price:289.90, stock:6, active:true, weight:2.2, margin:30},
    {id:"p4", name:"Escova Alisadora", icon:"straightener", channel:"shein", category:"Beleza", price:159.90, stock:0, active:false, weight:0.4, margin:45},
    {id:"p5", name:"Caixa de Som Bluetooth", icon:"caixasom", channel:"shopee", category:"Eletrônicos", price:89.90, stock:150, active:true, weight:2.0, margin:38},
    {id:"p6", name:"Mouse Gamer RGB", icon:"mouse", channel:"ml", category:"Eletrônicos", price:79.90, stock:210, active:true, weight:1.6, margin:42},
    {id:"p7", name:"Luminária LED USB", icon:"luminaria", channel:"shein", category:"Casa", price:34.90, stock:400, active:true, weight:1.3, margin:50},
    {id:"p8", name:"Carregador Turbo 65W", icon:"carregador", channel:"amazon", category:"Eletrônicos", price:69.90, stock:12, active:true, weight:1.8, margin:45},
    {id:"p9", name:"Kit Panelas Antiaderente", icon:"panela", channel:"amazon", category:"Casa", price:349.90, stock:25, active:true, weight:1.1, margin:28},
    {id:"p10", name:"Relógio Digital Esportivo", icon:"watch-smart", channel:"shopee", category:"Acessórios", price:119.90, stock:60, active:true, weight:1.4, margin:33},
    {id:"p11", name:"Secador de Cabelo Íon", icon:"secador", channel:"shein", category:"Beleza", price:99.90, stock:8, active:true, weight:0.9, margin:40},
    {id:"p12", name:"Teclado Mecânico Compacto", icon:"teclado", channel:"ml", category:"Eletrônicos", price:249.90, stock:40, active:true, weight:1.0, margin:32}
  ];
}
function defaultChannelsActive(){ return {shopee:true, ml:true, amazon:true, shein:true}; }
function defaultSettings(){
  return { pauseNoStock:true, autoPrice:false, defaultMargin:35, notify:true, c7Tier:"DROPSHIPPING", lastSync:{
    shopee: "2026-09-15T09:12:00", ml: "2026-09-15T22:40:00", amazon: "2026-09-14T18:05:00", shein: "2026-09-16T07:30:00"
  }};
}



var STATUS_LABEL = {concluido:"Concluído", enviado:"Enviado", processando:"Processando", cancelado:"Cancelado"};
var STATUS_BADGE = {concluido:"success", enviado:"success", processando:"warning", cancelado:"danger"};

/* ================= catálogo de mineração (fornecedores) ================= */
var CATEGORY_GRAD = {
  "Eletrônicos": "linear-gradient(135deg,#0B0918,#19204A)",
  "Casa": "linear-gradient(135deg,#081A14,#123E2E)",
  "Beleza": "linear-gradient(135deg,#1A0818,#4A1740)",
  "Acessórios": "linear-gradient(135deg,#1A1208,#4A3410)"
};
// (o catálogo de mineração agora vem do fornecedor C7 Drop via Supabase)

/* ================= estado ================= */
var state = {
  today: null,
  products: [],
  orders: [],
  channelsActive: {},
  settings: {},
  period: "7d",
  produtosPeriod: "30d",
  vendasPeriod: "30d",
  editingProductId: null,
  mining: {
    search: "",
    inStock: true, withGtin: false, notImported: false, onlyTrending: false, category: "",
    priceMin: null, priceMax: null,
    sort: "recent",
    view: "grid",
    limit: 48
  }
};

// Pedidos: só os reais. Ficam vazios até os pedidos do Mercado Livre serem integrados.
// Exceção: o modo demonstração (5 cliques na logo) guarda pedidos simulados aqui.
var DEMO_ORDERS_KEY = "sx_demo_orders_v1";
function loadOrders(){
  if (mlo.orders.length) return mlo.orders;
  var demo = loadJSON(DEMO_ORDERS_KEY, null);
  return Array.isArray(demo) ? demo : [];
}

/* ================= pedidos reais do Mercado Livre ================= */
var mlo = { orders: [], raw: [], loaded: false, loading: false, error: null, fetchedAt: null };
var ML_SHIP_LABEL = { pending: "Aguardando pagamento", handling: "Preparando", ready_to_ship: "Pronto para enviar", shipped: "A caminho", delivered: "Entregue", not_delivered: "Não entregue", cancelled: "Cancelado" };
function mlStatusToSellex(o){
  if (o.status === "cancelled" || (o.shipping && o.shipping.status === "cancelled")) return "cancelado";
  if (o.shipping && o.shipping.status === "delivered") return "concluido";
  if (o.shipping && o.shipping.status === "shipped") return "enviado";
  return "processando";
}
function pad(n){ return n < 10 ? "0" + n : "" + n; }
function mapMlOrder(o){
  var it = o.items[0] || { title: "", qty: 1, unit_price: o.total, sale_fee: 0 };
  var p = it.item_id ? state.products.find(function(x){ return x.mlItemId === it.item_id; }) : null;
  var d = new Date(o.date);
  var qty = o.items.reduce(function(a, x){ return a + x.qty; }, 0) || 1;
  return {
    id: "ml_" + o.id, mlOrderId: o.id, packId: o.pack_id,
    date: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()), hour: d.getHours(),
    channel: "ml", productId: p ? p.id : "ml:" + (it.item_id || o.id), title: it.title,
    qty: qty, total: o.total, status: mlStatusToSellex(o), client: o.buyer || "Comprador",
    unitCost: p && p.cost != null ? p.cost : null,
    fees: o.items.reduce(function(a, x){ return a + (x.sale_fee || 0) * x.qty; }, 0),
    sku: (p && p.sku) || it.sku || null, mlItemId: it.item_id, items: o.items, shipping: o.shipping, mlStatus: o.status
  };
}
function loadMlOrders(force){
  var client = sb();
  if (!client || !ml.account || mlo.loading) return Promise.resolve();
  if (mlo.loaded && !force && mlo.fetchedAt && Date.now() - mlo.fetchedAt < 120000) return Promise.resolve();
  mlo.loading = true; renderMlOrdersBar(); if (currentPage() === "vendas") renderVendas();
  return client.functions.invoke("ml-orders", { method: "POST", body: { action: "list" } }).then(function(r){
    mlo.loading = false;
    var d = r.data;
    if (d && d.ok){
      mlo.raw = d.orders || [];
      mlo.orders = simOrdersMapped().concat(mlo.raw.map(mapMlOrder));
      mlo.loaded = true; mlo.error = null; mlo.fetchedAt = Date.now();
      state.orders = loadOrders();
    } else mlo.error = (d && d.message) || "Não consegui buscar os pedidos do Mercado Livre agora.";
    renderMlOrdersBar();
    renderVendasCount();
    var pg = currentPage();
    if (pg === "vendas") renderVendas();
    if (pg === "painel") renderPainel();
    if (pg === "pedidos"){ renderVendasDashboard(); renderPedidos(); }
  }).catch(function(){ mlo.loading = false; mlo.error = "Sem conexão com o servidor."; renderMlOrdersBar(); });
}
function renderMlOrdersBar(){
  var el = document.getElementById("pedidos-sync"); if (!el) return;
  if (!ml.account){ el.innerHTML = '<span class="sx-muted">Conecte o Mercado Livre em <a href="#" data-goto="integracoes" style="color:var(--sx-blue-light)">Integrações</a> para ver suas vendas aqui.</span>'; return; }
  el.innerHTML = (mlo.loading ? '<span class="sx-muted">Buscando vendas no Mercado Livre…</span>'
    : mlo.error ? '<span style="color:#FF8A83">'+escapeHtml(mlo.error)+'</span>'
    : '<span class="sx-muted">'+(mlo.raw.length ? fmtInt(mlo.raw.length) + ' venda(s) do Mercado Livre' : (!mlo.orders.length && vdSource().length ? fmtInt(vdSource().length) + ' venda(s)' : 'Nenhuma venda no Mercado Livre nos últimos 90 dias'))+(mlo.fetchedAt ? ' · atualizado às ' + new Date(mlo.fetchedAt).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}) : '')+'</span>') +
    '<button type="button" class="sx-btn sx-btn--ghost sx-btn--sm" id="pedidos-refresh"'+(mlo.loading?' disabled':'')+'><svg><use href="#refresh"/></svg>Atualizar</button>';
}
function downloadMlLabel(btn, shipmentId){
  if (/^(SIMSHIP|DEMOSHIP)/.test(String(shipmentId))){
    var so = vdSource().find(function(x){ return x.shipping && x.shipping.id === shipmentId; });
    var blob = sampleLabelPdf(so);
    saveBlob(blob, "etiqueta-exemplo-" + shipmentId + ".pdf");
    toast("Etiqueta de exemplo baixada (venda simulada).");
    return Promise.resolve(true);
  }
  var client = sb(); if (!client) return Promise.resolve(false);
  var old = btn.innerHTML; btn.disabled = true; btn.textContent = "Baixando…";
  return client.functions.invoke("ml-orders", { method: "POST", body: { action: "label", shipment_id: shipmentId } }).then(function(r){
    btn.disabled = false; btn.innerHTML = old;
    var d = r.data;
    if (!d || !d.ok){ toast((d && d.message) || "Não consegui baixar a etiqueta.", true); return false; }
    var bin = atob(d.pdf_base64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    saveBlob(new Blob([arr], { type: "application/pdf" }), d.filename || "etiqueta.pdf");
    toast("Etiqueta baixada.");
    return true;
  }).catch(function(){ btn.disabled = false; btn.innerHTML = old; toast("Sem conexão com o servidor.", true); return false; });
}
function saveBlob(blob, filename){
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
}
// PDF simples (sem bibliotecas) com os dados da venda simulada
function sampleLabelPdf(o){
  var asc = function(t){ return String(t == null ? "" : t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "").replace(/([()\\])/g, "\\$1"); };
  var it = (o && o.items && o.items[0]) || {};
  var sh = (o && o.shipping) || {};
  var lines = [
    [22, "ETIQUETA DE EXEMPLO - SIMULACAO"],
    [11, "Esta etiqueta NAO vale para envio. Na venda real, o Mercado Livre gera a etiqueta oficial."],
    [14, " "],
    [14, "Venda: " + asc(o ? (o.packId || o.mlOrderId) : "-")],
    [14, "Envio: " + asc(sh.id || "-") + "   (Mercado Envios)"],
    [14, "Destinatario: " + asc(o ? o.client : "-")],
    [14, "Destino: " + asc((sh.city || "-") + (sh.state ? "/" + String(sh.state).replace("BR-", "") : ""))],
    [14, " "],
    [14, "Produto: " + asc((it.title || (o && o.title) || "-").slice(0, 60))],
    [14, "Quantidade: " + asc(o ? o.qty : 1) + "     SKU: " + asc((o && o.sku) || it.sku || "-")],
    [14, " "],
    [10, "Gerado pelo Sellex em " + asc(new Date().toLocaleString("pt-BR"))]
  ];
  var y = 780, body = "BT\n";
  lines.forEach(function(l){ body += "/F1 " + l[0] + " Tf 1 0 0 1 40 " + y + " Tm (" + l[1] + ") Tj\n"; y -= l[0] + 12; });
  body += "ET\n0.8 w 30 " + (y - 10) + " 535 " + (800 - y + 20) + " re S\n";
  var objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    "<< /Length " + body.length + " >>\nstream\n" + body + "endstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];
  var pdf = "%PDF-1.4\n", offs = [];
  objs.forEach(function(ob, i){ offs.push(pdf.length); pdf += (i + 1) + " 0 obj\n" + ob + "\nendobj\n"; });
  var xref = pdf.length;
  pdf += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n" + offs.map(function(n){ return ("0000000000" + n).slice(-10) + " 00000 n \n"; }).join("");
  pdf += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  return new Blob([pdf], { type: "application/pdf" });
}
var SUPPLIER_SITE = "https://www.c7drop.com.br";
function supplierUrlForOrder(o){
  var it = (o && o.items && o.items[0]) || {};
  var p = productById(o.productId) || (it.item_id ? state.products.find(function(x){ return x.mlItemId === it.item_id; }) : null);
  var row = p && p.catalogId ? catalog.byId[p.catalogId] : null;
  if (!row && p && p.sku) row = catalog.items.find(function(r){ return r.sku === p.sku; });
  if (!row && it.sku) row = catalog.items.find(function(r){ return r.sku === it.sku; });
  return row && row.slug ? SUPPLIER_SITE + "/produto/" + encodeURIComponent(row.slug) : SUPPLIER_SITE + "/produtos";
}
// ---- pedido no fornecedor (modo manual guiado) ----
// O lojista faz o pedido no site do C7 com o mínimo de trabalho: o Sellex baixa a etiqueta,
// abre o produto certo, copia o SKU, leva ao checkout e guarda o nº do pedido.
var C7_PACKAGING_FEE = 1.5;
function supplierCostForOrder(o){
  var it = (o.items && o.items[0]) || {};
  var p = productById(o.productId) || (it.item_id ? state.products.find(function(x){ return x.mlItemId === it.item_id; }) : null);
  var unit = p && p.cost != null ? Number(p.cost) : (o.unitCost != null ? Number(o.unitCost) : null);
  var row = (p && p.catalogId && catalog.byId[p.catalogId]) || (it.sku ? catalog.items.find(function(r){ return r.sku === it.sku; }) : null);
  if (unit == null && row) unit = tierCost(row).value;
  var sku = (p && p.sku) || (row && row.sku) || it.sku || o.sku || "";
  return { product: p, unit: unit, sku: sku, qty: o.qty || 1, total: unit != null ? Math.round(unit * (o.qty || 1) * 100) / 100 : null };
}
var C7_STEPS_KEY = function(){ return "sx_c7_steps_v1:" + (account.user ? account.user.id : "anon"); };
function c7Steps(id){ var m = loadJSON(C7_STEPS_KEY(), {}) || {}; return m[id] || {}; }
function setC7Step(id, patch){
  var m = loadJSON(C7_STEPS_KEY(), {}) || {};
  m[id] = Object.assign({}, m[id] || {}, patch);
  saveJSON(C7_STEPS_KEY(), m);
}
function c7OrderNumber(id){ return c7Steps(id).num || ""; }
var payState = { order: null };
function renderSupSteps(){
  var o = payState.order; if (!o) return;
  var st = c7Steps(o.id), done = !!c7Done()[o.id];
  var flags = { label: st.label || done, product: st.product || done, checkout: st.checkout || done, done: done };
  var firstOpen = ["label","product","checkout","done"].find(function(k){ return !flags[k]; });
  document.querySelectorAll("#sup-steps > li").forEach(function(li){
    var k = li.getAttribute("data-step");
    li.classList.toggle("is-done", !!flags[k]);
    li.classList.toggle("is-current", k === firstOpen);
    li.querySelector("i").innerHTML = flags[k] ? '<svg><use href="#check"/></svg>' : String(["label","product","checkout","done"].indexOf(k) + 1);
  });
  document.getElementById("pay-done").textContent = done ? "Pedido feito ✓" : "Marcar pedido feito";
}
function orderAtSupplier(o){
  payState.order = o;
  var c = supplierCostForOrder(o), p = c.product, sh = o.shipping || {};
  var title = p ? (p.title || p.name) : (o.title || "Produto");
  var src = p && (p.images && p.images[0] || p.image);
  var th = document.getElementById("pay-thumb");
  th.style.setProperty("--ad-tile", prodTileBg(p ? p.category : ""));
  th.classList.toggle("is-empty", !src);
  th.innerHTML = iconSVG(p ? p.icon : "box") + (src ? '<img src="'+escapeHtml(src)+'" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add(\'is-empty\');this.remove()">' : "");
  document.getElementById("pay-title").textContent = title;
  document.getElementById("pay-meta").textContent = fmtInt(c.qty) + " un." + (c.unit != null ? " × " + fmtBRL(c.unit) : "") + " · venda " + (o.packId || o.mlOrderId || o.id);
  document.getElementById("pay-total").textContent = c.total != null ? fmtBRL(c.total + C7_PACKAGING_FEE) : "—";
  document.getElementById("pay-total-note").textContent = c.total != null ? "produto " + fmtBRL(c.total) + " + embalagem " + fmtBRL(C7_PACKAGING_FEE) : "confira o valor no C7";
  document.getElementById("sup-qty").textContent = fmtInt(c.qty);
  document.getElementById("sup-sku").textContent = c.sku ? "Copiar SKU " + c.sku : "Copiar dados do pedido";
  var labelReady = sh.status === "ready_to_ship" || sh.status === "shipped" || /^(SIMSHIP|DEMOSHIP)/.test(String(sh.id || ""));
  var lb = document.querySelector("#pay-modal [data-pay=label]");
  lb.disabled = !sh.id || !labelReady;
  document.getElementById("sup-label-txt").textContent = !sh.id
    ? "Esta venda não usa Mercado Envios. Combine o envio com o fornecedor."
    : labelReady ? "Ela vai anexada no pedido do fornecedor. É com ela que o pacote sai para o seu cliente."
    : "O Mercado Livre libera a etiqueta quando o pagamento da venda é aprovado. Volte aqui em alguns minutos.";
  document.getElementById("sup-num").value = c7OrderNumber(o.id);
  renderSupSteps();
  document.getElementById("pay-modal").classList.add("is-open");
}
function closePayModal(){ document.getElementById("pay-modal").classList.remove("is-open"); payState.order = null; }
function initPayModal(){
  var m = document.getElementById("pay-modal");
  m.addEventListener("click", function(e){
    if (e.target === m || e.target.closest("[data-pay=close]")){ closePayModal(); return; }
    var o = payState.order; if (!o) return;
    var b = e.target.closest("[data-pay]"); if (!b || b.disabled) return;
    var act = b.getAttribute("data-pay");
    if (act === "label"){
      downloadMlLabel(b, o.shipping.id).then(function(ok){
        if (ok && payState.order === o){ setC7Step(o.id, { label: true }); renderSupSteps(); }
      });
    }
    if (act === "open"){
      var win = window.open(supplierUrlForOrder(o), "_blank", "noopener");
      var c = supplierCostForOrder(o);
      copyText(c.sku || c7OrderText(o)).catch(function(){});
      setC7Step(o.id, { product: true }); renderSupSteps();
      toast(win === null ? "Libere pop-ups para o Sellex abrir o C7." : "Abrimos o produto no C7. Escolha Dropshipping e quantidade " + fmtInt(c.qty) + ".");
    }
    if (act === "sku"){
      var cs = supplierCostForOrder(o);
      copyText(cs.sku || c7OrderText(o)).then(function(){ flashCopied(b); toast(cs.sku ? "SKU copiado: cole na busca do C7." : "Dados do pedido copiados."); }).catch(function(){ toast("Não consegui copiar.", true); });
    }
    if (act === "checkout"){
      var w2 = window.open(SUPPLIER_SITE + "/checkout", "_blank", "noopener");
      setC7Step(o.id, { checkout: true }); renderSupSteps();
      if (w2 === null) toast("Libere pop-ups para o Sellex abrir o C7.", true);
    }
    if (act === "done"){
      var num = document.getElementById("sup-num").value.replace(/[^\w-]/g, "").slice(0, 30);
      setC7Step(o.id, { label: true, product: true, checkout: true, num: num });
      setC7Done(o.id, true);
      toast(num ? "Pedido C7 nº " + num + " registrado." : "Pedido marcado como feito no fornecedor.");
      closePayModal();
      if (currentPage() === "vendas") renderVendas();
      if (currentPage() === "pedidos" && typeof renderPedidos === "function") renderPedidos();
    }
  });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && m.classList.contains("is-open")) closePayModal(); });
}
function c7OrderText(o){
  var lines = ["Pedido Mercado Livre " + (o.packId || o.mlOrderId)];
  (o.items || []).forEach(function(it){
    var p = it.item_id ? state.products.find(function(x){ return x.mlItemId === it.item_id; }) : null;
    lines.push((it.qty || 1) + "x " + ((p && p.sku) || it.sku || "SKU?") + " - " + ((p && (p.supplierName || p.name)) || it.title));
  });
  if (o.shipping) lines.push("Envio: Mercado Envios (etiqueta " + o.shipping.id + ")" + (o.shipping.city ? " - " + o.shipping.city + (o.shipping.state ? "/" + String(o.shipping.state).replace("BR-", "") : "") : ""));
  return lines.join("\n");
}

function productById(id){ return state.products.find(function(p){ return p.id===id; }); }
function validOrders(list){ return list.filter(function(o){ return o.status !== "cancelado"; }); }
function productMargin(productId){
  var p = productById(productId);
  var m = p && p.margin!=null ? p.margin : (state.settings.defaultMargin!=null ? state.settings.defaultMargin : 35);
  return Math.max(0, Math.min(95, m));
}
var TILE_PALETTE = [
  "linear-gradient(135deg,#0B0918,#19204A)", "linear-gradient(135deg,#081A14,#123E2E)",
  "linear-gradient(135deg,#1A0818,#4A1740)", "linear-gradient(135deg,#1A1208,#4A3410)",
  "linear-gradient(135deg,#081420,#0E3A4A)", "linear-gradient(135deg,#140A1E,#33205A)"
];
function prodTileBg(category){
  if (CATEGORY_GRAD[category]) return CATEGORY_GRAD[category];
  return TILE_PALETTE[Math.abs(hashSeed(String(category||""))) % TILE_PALETTE.length];
}
// miniatura do produto nas tabelas: foto quando existe, ícone quando não
function prodThumb(p){
  var icon = iconSVG(p ? p.icon : null);
  if (p && p.image) return icon + '<img src="'+escapeHtml(p.image)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">';
  return icon;
}
function productMarginPct(p){
  if (p && p.fees && p.cost > 0) return Math.max(0, productUnitProfit(p) / p.cost * 100);
  if (p && p.cost != null && p.price > 0) return Math.max(0, (p.price - p.cost) / p.price * 100);
  var m = p && p.margin!=null ? p.margin : (state.settings.defaultMargin!=null ? state.settings.defaultMargin : 35);
  return Math.max(0, Math.min(95, m));
}
function profitOfOrder(o){
  if (o.status === "cancelado") return 0;
  if (o.unitCost != null) return o.total - o.unitCost * o.qty - (o.fees || 0);
  return o.total * (productMargin(o.productId) / 100);
}

function periodDays(period){ return period==="hoje" ? 1 : period==="7d" ? 7 : period==="30d" ? 30 : 90; }

function ordersInRange(startInclusive, endExclusive){
  return state.orders.filter(function(o){
    var n = daysAgo(o.date, state.today);
    return n >= startInclusive && n < endExclusive;
  });
}

function computeMetrics(orders){
  var v = validOrders(orders);
  var faturamento = v.reduce(function(a,o){ return a+o.total; }, 0);
  var pedidos = v.length;
  var ticket = pedidos ? faturamento/pedidos : 0;
  var itens = v.reduce(function(a,o){ return a+o.qty; }, 0);
  return {faturamento:faturamento, pedidos:pedidos, ticket:ticket, itens:itens};
}

function delta(cur, prev){
  if (prev===0) return cur===0 ? 0 : Infinity;
  return ((cur-prev)/prev)*100;
}

/* ================= render: KPIs ================= */
function renderKPIs(){
  var days = periodDays(state.period);
  var cur = computeMetrics(ordersInRange(0, days));
  var prev = computeMetrics(ordersInRange(days, days*2));

  var cards = [
    {label:"Faturamento", value:fmtBRL(cur.faturamento), d:delta(cur.faturamento, prev.faturamento)},
    {label:"Pedidos", value:fmtInt(cur.pedidos), d:delta(cur.pedidos, prev.pedidos)},
    {label:"Ticket médio", value:fmtBRL(cur.ticket), d:delta(cur.ticket, prev.ticket)},
    {label:"Itens vendidos", value:fmtInt(cur.itens), d:delta(cur.itens, prev.itens)}
  ];

  var html = cards.map(function(c){
    var deltaOk = isFinite(c.d);
    var down = state.orders.length > 0 && deltaOk && c.d < 0;
    var deltaText = !state.orders.length ? "Nenhuma venda ainda" : (deltaOk ? fmtPct(c.d) + " vs. período anterior" : "sem dados no período anterior");
    return '<div class="sx-card">' +
      '<div class="sx-stat__label">'+escapeHtml(c.label)+'</div>' +
      '<div class="sx-stat__value">'+c.value+'</div>' +
      '<div class="sx-stat__delta'+(down?' sx-stat__delta--down':'')+'">'+deltaText+'</div>' +
    '</div>';
  }).join("");
  document.getElementById("kpi-grid").innerHTML = html;
}

/* ================= render: gráfico ================= */
function renderChart(){
  var period = state.period;
  var buckets = [];
  if (period==="hoje"){
    var todays = validOrders(ordersInRange(0,1));
    var ranges = [[8,11,"8–11h"],[11,14,"11–14h"],[14,17,"14–17h"],[17,20,"17–20h"],[20,23,"20–23h"]];
    buckets = ranges.map(function(r){
      var sum = todays.filter(function(o){ return o.hour>=r[0] && o.hour<r[1]; }).reduce(function(a,o){ return a+o.total; },0);
      return {label:r[2], value:sum};
    });
    document.getElementById("chart-caption").textContent = "por horário — hoje";
  } else if (period==="90d"){
    var weeks = 13;
    for (var w=weeks-1; w>=0; w--){
      var startOff = w*7, endOff = w*7+7;
      var sum = computeMetrics(ordersInRange(startOff, endOff)).faturamento;
      var d = new Date(state.today+"T00:00:00"); d.setDate(d.getDate()-endOff+1);
      buckets.push({label: pad2(d.getDate())+"/"+pad2(d.getMonth()+1), value:sum});
    }
    document.getElementById("chart-caption").textContent = "por semana — últimos 90 dias";
  } else {
    var days = periodDays(period);
    for (var off=days-1; off>=0; off--){
      var dd = new Date(state.today+"T00:00:00"); dd.setDate(dd.getDate()-off);
      var sum2 = computeMetrics(ordersInRange(off, off+1)).faturamento;
      buckets.push({label: pad2(dd.getDate())+"/"+pad2(dd.getMonth()+1), value:sum2});
    }
    document.getElementById("chart-caption").textContent = period==="7d" ? "por dia — últimos 7 dias" : "por dia — últimos 30 dias";
  }

  if (!buckets.some(function(b){ return b.value > 0; })){
    document.getElementById("chart-host").innerHTML = '<div class="empty">Nenhuma venda no período. O faturamento aparece aqui quando os pedidos do Mercado Livre começarem a entrar.</div>';
    return;
  }
  var max = Math.max.apply(null, buckets.map(function(b){ return b.value; }).concat([1]));
  var W = 900, H = 220, padL = 8, padR = 8, padB = 26, padT = 10;
  var innerW = W - padL - padR, innerH = H - padT - padB;
  var n = buckets.length;
  var gap = n>40 ? 2 : 8;
  var barW = Math.max(2, (innerW - gap*(n-1)) / n);

  var bars = "", labels = "";
  buckets.forEach(function(b, i){
    var h = max>0 ? (b.value/max)*innerH : 0;
    var x = padL + i*(barW+gap);
    var y = padT + (innerH - h);
    bars += '<rect class="chart-bar" x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+Math.max(1,h).toFixed(1)+'" rx="3">' +
      '<title>'+escapeHtml(b.label)+': '+fmtBRL(b.value)+'</title></rect>';
    var showLabel = n<=14 || i % Math.ceil(n/14) === 0;
    if (showLabel){
      labels += '<text class="chart-axis" x="'+(x+barW/2).toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle">'+escapeHtml(b.label)+'</text>';
    }
  });

  var svg = '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" aria-label="Gráfico de faturamento">' +
    '<defs><linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">' +
      '<stop offset="0%" stop-color="#1B2C80"/><stop offset="55%" stop-color="#3D5AF1"/><stop offset="100%" stop-color="#8FA3FF"/>' +
    '</linearGradient></defs>' +
    bars + labels +
  '</svg>';
  document.getElementById("chart-host").innerHTML = svg;
}

/* ================= render: canais ================= */
function renderChannelBreakdown(){
  var days = periodDays(state.period);
  var v = validOrders(ordersInRange(0, days));
  var totals = {};
  Object.keys(CHANNELS).forEach(function(k){ totals[k]=0; });
  v.forEach(function(o){ totals[o.channel] = (totals[o.channel]||0) + o.total; });
  var grandTotal = Object.keys(totals).reduce(function(a,k){ return a+totals[k]; }, 0);

  if (!grandTotal){
    document.getElementById("channel-breakdown").innerHTML = '<div class="empty">Nenhuma venda no período.</div>';
    return;
  }
  var order = Object.keys(totals).filter(function(k){ return totals[k] > 0; }).sort(function(a,b){ return totals[b]-totals[a]; });
  var html = order.map(function(k){
    var pct = grandTotal>0 ? (totals[k]/grandTotal*100) : 0;
    return '<div class="channel-row">' +
      '<img src="'+CH_ICON[k]+'" alt="'+CHANNELS[k].name+'">' +
      '<div class="info">' +
        '<div class="top"><span>'+CHANNELS[k].name+'</span><b>'+fmtBRL(totals[k])+' · '+pct.toFixed(0)+'%</b></div>' +
        '<div class="sx-progress"><span style="width:'+pct.toFixed(1)+'%"></span></div>' +
      '</div>' +
    '</div>';
  }).join("");
  document.getElementById("channel-breakdown").innerHTML = html || '<div class="empty">Sem vendas no período.</div>';
}

/* ================= render: top produtos ================= */
function renderTopProducts(){
  var days = periodDays(state.period);
  var v = validOrders(ordersInRange(0, days));
  var agg = {};
  v.forEach(function(o){
    if (!agg[o.productId]) agg[o.productId] = {qty:0, revenue:0, title:o.title};
    agg[o.productId].qty += o.qty;
    agg[o.productId].revenue += o.total;
  });
  var rows = Object.keys(agg).map(function(id){ return {id:id, qty:agg[id].qty, revenue:agg[id].revenue, title:agg[id].title}; })
    .sort(function(a,b){ return b.revenue-a.revenue; }).slice(0,5);

  var tbody = rows.map(function(r){
    var p = productById(r.id);
    var name = p ? p.name : r.title;
    if (!name) return "";
    return '<tr><td class="prod"><span>'+prodThumb(p)+'</span>'+escapeHtml(name)+'</td><td>'+fmtInt(r.qty)+'</td><td>'+fmtBRL(r.revenue)+'</td></tr>';
  }).join("");
  document.querySelector("#top-products-table tbody").innerHTML = tbody || '<tr><td colspan="3" class="empty">Sem vendas no período.</td></tr>';
}

/* ================= render: pedidos recentes (painel) ================= */
function renderRecentOrders(){
  var recent = state.orders.slice().sort(function(a,b){
    if (a.date!==b.date) return a.date<b.date ? 1 : -1;
    return b.hour-a.hour;
  }).slice(0,7);

  var tbody = recent.map(function(o){
    var p = productById(o.productId);
    return '<tr>' +
      '<td class="prod"><span>'+prodThumb(p)+'</span>'+(p?escapeHtml(p.name):escapeHtml(o.title||"Produto removido"))+'</td>' +
      '<td>'+escapeHtml(o.client)+'</td>' +
      '<td><img class="mk" src="'+CH_ICON[o.channel]+'" alt="'+CHANNELS[o.channel].name+'"></td>' +
      '<td>'+fmtBRL(o.total)+'</td>' +
      '<td><span class="sx-badge sx-badge--'+STATUS_BADGE[o.status]+'"><i class="sx-dot"></i>'+STATUS_LABEL[o.status]+'</span></td>' +
      '<td class="sx-muted">'+relDate(o.date, state.today)+'</td>' +
    '</tr>';
  }).join("");
  document.querySelector("#recent-orders-table tbody").innerHTML = tbody || '<tr><td colspan="6" class="empty">Nenhum pedido ainda.</td></tr>';
}

/* ================= render: banner lateral (resumo) ================= */
function renderSideSummary(){
  var lowStock = state.products.filter(function(p){ return p.active && p.stock>0 && p.stock<10; }).length;
  var outOfStock = state.products.filter(function(p){ return p.stock===0; }).length;
  var activeProducts = state.products.filter(function(p){ return p.active; }).length;
  document.getElementById("side-active-products").textContent = fmtInt(activeProducts);
  document.getElementById("side-low-stock").textContent = fmtInt(lowStock);
  document.getElementById("side-out-stock").textContent = fmtInt(outOfStock);
}

function renderPainel(){
  renderKPIs();
  renderChart();
  renderChannelBreakdown();
  renderTopProducts();
  renderRecentOrders();
  renderSideSummary();
  renderMlMini();
  renderOnboarding();
}
var ONBOARDING_DEMO = true;
var SELLER_LEVEL = { name: "Gold", sold: 366000, from: 100000, to: 500000, next: "Platinum" };
function fmtMil(v){ return "R$ " + fmtInt(v / 1000) + " mil"; }
function sellerLevelHTML(){
  var L = SELLER_LEVEL;
  var pct = Math.max(0, Math.min(100, (L.sold - L.from) / (L.to - L.from) * 100));
  return '<div class="lvl">' +
    '<div class="lvl-head"><span class="lvl-medal"><svg><use href="#trophy"/></svg></span>' +
      '<div><span class="lvl-label">Classificação</span><b class="lvl-name">Vendedor '+L.name+'</b></div></div>' +
    '<div class="lvl-sold"><b>'+fmtMil(L.sold)+'</b> vendidos</div>' +
    '<div class="lvl-bar" role="progressbar" aria-valuemin="'+L.from+'" aria-valuemax="'+L.to+'" aria-valuenow="'+L.sold+'"><span style="width:'+pct.toFixed(1)+'%"></span></div>' +
    '<div class="lvl-scale"><span>'+fmtMil(L.from)+'</span><span>'+fmtMil(L.to)+'</span></div>' +
    '<p class="lvl-next">Faltam <b>'+fmtMil(L.to - L.sold)+'</b> para Vendedor '+L.next+'</p>' +
  '</div>';
}
function renderOnboarding(){
  var el = document.getElementById("onboarding");
  if (!el) return;
  var steps = [
    {done: !!(typeof ml !== "undefined" && ml.account), title: "Conecte sua conta do Mercado Livre", desc: "Você autoriza na página do próprio Mercado Livre.", goto: "integracoes", cta: "Conectar"},
    {done: state.products.length > 0, title: "Escolha produtos do fornecedor", desc: "Na Mineração, clique em + nos produtos que quer vender.", goto: "mineracao", cta: "Abrir Mineração"},
    {done: state.products.some(function(p){ return p.mlItemId; }), title: "Publique no Mercado Livre", desc: "Abra um produto, revise o anúncio e clique em Publicar produto.", goto: "produtos", cta: "Ver produtos"}
  ];
  // SIMULADO (fase de testes): todos os passos concluídos e nível Gold para todos os usuários
  if (ONBOARDING_DEMO) steps.forEach(function(s){ s.done = true; });
  var doneCount = steps.filter(function(s){ return s.done; }).length;
  el.innerHTML = '<div class="sx-card__head"><h2 class="sx-card__title">Primeiros passos</h2><span class="sx-badge">'+doneCount+' de '+steps.length+'</span></div>' +
    '<ol class="onb-list">' + steps.map(function(s){
      return '<li class="onb-step'+(s.done?' is-done':'')+'"><span class="onb-check" aria-hidden="true">'+(s.done?'<svg><use href="#check"/></svg>':'')+'</span>' +
        '<div class="onb-text"><b>'+escapeHtml(s.title)+'</b><span>'+escapeHtml(s.desc)+'</span>' +
        (!s.done && s.goto ? '<a class="sx-btn sx-btn--sm" href="#" data-goto="'+s.goto+'">'+escapeHtml(s.cta)+'</a>' : '') + '</div></li>';
    }).join("") + '</ol>' + (ONBOARDING_DEMO ? sellerLevelHTML() : '');
}

/* ================= produtos: dashboard + grid limpo ================= */
function statusOfProduct(p){
  if (!p.active) return {label:"Pausado", tone:"danger"};
  if (p.stock===0) return {label:"Sem estoque no fornecedor", tone:"danger"};
  if (p.stock<10) return {label:"Estoque baixo", tone:"warning"};
  return {label:"Em estoque", tone:"success"};
}
function salesForProduct(productId, days){
  var os = ordersInRange(0, days).filter(function(o){ return o.productId===productId && o.status!=="cancelado"; });
  return {
    qty: os.reduce(function(a,o){ return a+o.qty; },0),
    revenue: os.reduce(function(a,o){ return a+o.total; },0),
    profit: os.reduce(function(a,o){ return a+profitOfOrder(o); },0)
  };
}
function renderProdutosKPIs(){
  var days = periodDays(state.produtosPeriod);
  var total = state.products.length;
  var active = state.products.filter(function(p){ return p.active; }).length;
  var attention = state.products.filter(function(p){ return p.stock===0 || (p.active && p.stock<10); }).length;
  var profit = sumProfit(ordersInRange(0, days));

  var cards = [
    {label:"Produtos cadastrados", value:fmtInt(total)},
    {label:"Produtos ativos", value:fmtInt(active)},
    {label:"Precisam de atenção", value:fmtInt(attention), warn:attention>0},
    {label:"Lucro do período", value:fmtBRL(profit)}
  ];
  document.getElementById("produtos-kpi-grid").innerHTML = cards.map(function(c){
    return '<div class="sx-card"><div class="sx-stat__label">'+escapeHtml(c.label)+'</div>' +
      '<div class="sx-stat__value">'+c.value+'</div>' +
      (c.warn ? '<div class="sx-stat__delta sx-stat__delta--down">estoque baixo ou zerado</div>' : '<div class="sx-stat__delta" style="color:var(--sx-muted)">no período selecionado</div>') +
    '</div>';
  }).join("");
}
function renderProdutosGrid(){
  var days = periodDays(state.produtosPeriod);
  var q = (document.getElementById("produtos-search").value||"").trim().toLowerCase();
  var list = state.products.filter(function(p){ return !q || p.name.toLowerCase().indexOf(q)>-1; });

  var withSales = list.map(function(p){ return {p:p, sales: salesForProduct(p.id, days)}; });
  withSales.sort(function(a,b){ return b.sales.revenue - a.sales.revenue || a.p.name.localeCompare(b.p.name,'pt-BR'); });
  var maxRevenue = withSales.reduce(function(m,x){ return Math.max(m, x.sales.revenue); }, 0) || 1;

  var grid = document.getElementById("produtos-grid");
  if (!withSales.length){
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1">' + (state.products.length
      ? 'Nenhum produto encontrado.'
      : (catalog.loaded ? 'Você ainda não tem produtos. <a href="#" data-goto="mineracao" style="color:var(--sx-blue-light)">Escolha produtos na Mineração</a>.' : 'Carregando seus produtos do fornecedor…')) + '</div>';
    return;
  }

  grid.innerHTML = withSales.map(function(x){
    var p = x.p, s = x.sales;
    var st = statusOfProduct(p);
    var pct = maxRevenue>0 ? (s.revenue/maxRevenue*100) : 0;
    var unitProfit = productUnitProfit(p);
    var ch = CHANNELS[p.channel] ? p.channel : "ml";
    return '<div class="product-card'+(p.catalogId?' is-clickable':'')+'" data-product="'+p.id+'">' +
      '<div class="product-card__actions">' +
        '<button class="icon-btn" data-edit="'+p.id+'" aria-label="Editar"><svg><use href="#edit"/></svg></button>' +
        '<button class="icon-btn icon-btn--danger" data-delete="'+p.id+'" aria-label="Excluir"><svg><use href="#trash"/></svg></button>' +
      '</div>' +
      '<div class="product-card__img" style="background:'+prodTileBg(p.category)+'">'+iconSVG(p.icon)+(p.image ? productImg(p.image, p.name) : '')+'</div>' +
      '<div class="product-card__body">' +
        '<div class="product-card__price"><span class="now">'+fmtBRL(p.price)+'</span><span class="stock">'+fmtInt(p.stock)+' em estoque</span></div>' +
        '<div class="product-card__name" title="'+escapeHtml(p.name)+'">'+escapeHtml(p.name)+'</div>' +
        '<div class="product-card__chrow">'+escapeHtml(p.category)+(p.sku ? ' · SKU '+escapeHtml(p.sku) : '')+'</div>' +
        (p.cost != null
          ? '<div class="sx-muted" style="font-size:12.5px">Custo '+fmtBRL(p.cost)+' · lucro '+fmtBRL(unitProfit)+' por un. ('+fmtInt(productMarginPct(p))+'%)</div>'
          : '<div class="sx-muted" style="font-size:12.5px">Margem '+fmtInt(productMarginPct(p))+'%</div>') +
        '<div class="row" style="gap:6px"><span class="sx-badge sx-badge--'+st.tone+'"><i class="sx-dot"></i>'+st.label+'</span>' +
          (p.mlItemId ? '<span class="sx-badge sx-badge--success"><i class="sx-dot"></i>No Mercado Livre</span>' : (p.status==="pronto" ? '<span class="sx-badge sx-badge--info"><i class="sx-dot"></i>Pronto para publicar</span>' : '<span class="sx-badge"><i class="sx-dot"></i>Não publicado</span>')) + '</div>' +
        '<div class="product-stats">' +
          '<div class="figures"><span class="sx-muted">Vendido no período</span><b>'+fmtInt(s.qty)+' un. · '+fmtBRL(s.revenue)+'</b></div>' +
          '<div class="figures"><span class="sx-muted">Lucro no período</span><b>'+fmtBRL(s.profit)+'</b></div>' +
          '<div class="sx-progress"><span style="width:'+pct.toFixed(1)+'%"></span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join("");
}
function renderProdutos(){
  renderProdutosKPIs();
  renderProdutosGrid();
}

function updateModalCostHint(){
  var p = state.editingProductId ? productById(state.editingProductId) : null;
  var hint = document.getElementById("f-cost-hint");
  var marginEl = document.getElementById("f-margin");
  if (!p || p.cost == null){
    hint.style.display = "none";
    marginEl.readOnly = false;
    return;
  }
  var price = parseFloat(document.getElementById("f-price").value) || 0;
  var lucro = price - p.cost;
  marginEl.readOnly = true;
  marginEl.value = price > 0 ? Math.round(lucro / price * 1000) / 10 : 0;
  hint.style.display = "";
  hint.innerHTML = 'Custo no fornecedor: <b>'+fmtBRL(p.cost)+'</b> · lucro de <b'+(lucro<0?' style="color:var(--sx-red)"':'')+'>'+fmtBRL(lucro)+'</b> por unidade. A margem é calculada pelo preço; o estoque vem do fornecedor.';
}
function openProductModal(id){
  state.editingProductId = id || null;
  var p = id ? productById(id) : null;
  var fromSupplier = !!(p && p.catalogId);
  document.getElementById("modal-title").textContent = p ? "Editar produto" : "Novo produto";
  document.getElementById("f-name").value = p ? p.name : "";
  document.getElementById("f-icon").value = p && p.icon ? p.icon : "box";
  document.getElementById("f-channel").value = p && CHANNELS[p.channel] ? p.channel : "ml";
  document.getElementById("f-category").value = p ? p.category : "";
  document.getElementById("f-price").value = p ? p.price : "";
  document.getElementById("f-stock").value = p ? p.stock : "";
  document.getElementById("f-stock").readOnly = fromSupplier;
  document.getElementById("f-margin").value = p && p.margin!=null ? p.margin : (state.settings.defaultMargin!=null ? state.settings.defaultMargin : 35);
  document.getElementById("f-active").checked = p ? p.active : true;
  updateModalCostHint();
  document.getElementById("product-modal").classList.add("is-open");
  document.getElementById("f-name").focus();
}
function closeProductModal(){
  document.getElementById("product-modal").classList.remove("is-open");
  state.editingProductId = null;
}
function saveProductForm(ev){
  ev.preventDefault();
  var name = document.getElementById("f-name").value.trim();
  if (!name){ toast("Dê um nome ao produto.", true); return; }
  var price = parseFloat(document.getElementById("f-price").value) || 0;
  var stock = parseInt(document.getElementById("f-stock").value,10) || 0;
  var margin = parseFloat(document.getElementById("f-margin").value);
  if (isNaN(margin)) margin = state.settings.defaultMargin!=null ? state.settings.defaultMargin : 35;
  margin = Math.max(0, Math.min(95, margin));
  var existing = state.editingProductId ? productById(state.editingProductId) : null;
  var fromSupplier = !!(existing && existing.catalogId);
  var data = {
    name: name,
    icon: document.getElementById("f-icon").value || "box",
    channel: document.getElementById("f-channel").value,
    category: document.getElementById("f-category").value.trim() || "Geral",
    price: Math.max(0, price),
    active: document.getElementById("f-active").checked
  };
  if (!fromSupplier){ data.stock = Math.max(0, stock); data.margin = margin; }
  if (existing){
    Object.assign(existing, data);
    toast(fromSupplier && existing.cost != null && price < existing.cost
      ? "Produto atualizado. Atenção: o preço está abaixo do custo."
      : "Produto atualizado.");
  } else {
    data.id = uid("p");
    data.weight = 1;
    state.products.push(data);
    toast("Produto criado.");
  }
  saveJSON(STORE_KEYS.products, state.products);
  state.orders = loadOrders();
  closeProductModal();
  renderProdutos();
  renderSideSummary();
}
function deleteProduct(id){
  var p = productById(id);
  if (!p) return;
  if (!window.confirm('Excluir "'+p.name+'"? Essa ação não pode ser desfeita.')) return;
  state.products = state.products.filter(function(x){ return x.id!==id; });
  saveJSON(STORE_KEYS.products, state.products);
  state.orders = loadOrders();
  renderProdutos();
  renderSideSummary();
  toast("Produto excluído.");
}

/* ================= catálogo C7 Drop (Supabase) ================= */
var SUPABASE_URL = "https://vcqntqhfyollatevvntq.supabase.co";
var SUPABASE_KEY = "sb_publishable_HTZph3lq0lYtDs2s0j2GGw_5wwh9cZg";
var CATALOG_FIELDS = "id,slug,name,sku,gtin,price_list,price_vip,price_atacado,price_dropshipping,compare_at_price,stock,image_url,images,category_name,categories,detail_synced_at,list_synced_at";
// categorias do C7 que não descrevem o produto (são vitrines/etiquetas)
var META_CATEGORIES = ["fora de estoque","mais vendidos","promoções do mês","promocoes do mes","anúncios em massa"];
var MINING_PAGE = 48;

var catalog = { items: [], byId: {}, loaded: false, error: null, categories: [] };

function realCategory(row){
  var cats = Array.isArray(row.categories) ? row.categories : [];
  for (var i=0;i<cats.length;i++){
    var n = cats[i] && cats[i].name;
    if (n && META_CATEGORIES.indexOf(n.toLowerCase()) === -1) return n;
  }
  return row.category_name && META_CATEGORIES.indexOf(row.category_name.toLowerCase())===-1 ? row.category_name : "Outros";
}
// custo do produto na faixa do lojista; se o detalhe ainda não sincronizou, usa o preço de lista
function tierCost(row){
  var tier = (state.settings.c7Tier || "DROPSHIPPING");
  var v = tier==="GRUPO_VIP" ? row.price_vip : tier==="ATACADO" ? row.price_atacado : row.price_dropshipping;
  if (v != null) return { value: Number(v), exact: true };
  return { value: Number(row.price_list || 0), exact: false };
}
function suggestedSalePrice(cost){
  return priceForMargin(cost, adDefaults());
}
function productImg(src, alt){
  return '<img class="prod-photo" src="'+escapeHtml(src)+'" alt="'+escapeHtml(alt||"")+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">';
}

function fetchCatalogPage(offset, limit){
  var url = SUPABASE_URL + "/rest/v1/catalog_products?select=" + CATALOG_FIELDS +
    "&active=eq.true&order=id.desc&offset=" + offset + "&limit=" + limit;
  return fetch(url, { headers: { apikey: SUPABASE_KEY, Accept: "application/json" } })
    .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
}
function loadCatalog(){
  setCatalogStatus("loading");
  var all = [];
  function next(offset){
    return fetchCatalogPage(offset, 1000).then(function(rows){
      all = all.concat(rows);
      if (rows.length === 1000) return next(offset + 1000);
      return all;
    });
  }
  return next(0).then(function(rows){
    rows.forEach(function(r, i){ r._order = i; r._category = realCategory(r); });
    catalog.items = rows;
    catalog.byId = {};
    rows.forEach(function(r){ catalog.byId[r.id] = r; });
    var cats = {};
    rows.forEach(function(r){ cats[r._category] = (cats[r._category]||0) + 1; });
    catalog.categories = Object.keys(cats).sort(function(a,b){ return a.localeCompare(b,'pt-BR'); })
      .map(function(k){ return {name:k, count:cats[k]}; });
    catalog.loaded = true;
    catalog.error = null;
    computeTrending();
    fillCategorySelect();
    setCatalogStatus("ok");
  }).catch(function(e){
    catalog.error = e && e.message ? e.message : String(e);
    setCatalogStatus("error");
    throw e;
  });
}
function setCatalogStatus(kind){
  var el = document.getElementById("catalog-status");
  if (!el) return;
  if (kind==="loading"){ el.className = "sx-badge"; el.innerHTML = '<i class="sx-dot"></i>Carregando catálogo…'; }
  else if (kind==="ok"){
    var inStock = catalog.items.filter(function(r){ return r.stock>0; }).length;
    el.className = "sx-badge sx-badge--success";
    el.innerHTML = '<i class="sx-dot"></i>Fornecedor conectado · '+fmtInt(catalog.items.length)+' produtos · '+fmtInt(inStock)+' com estoque';
  } else { el.className = "sx-badge sx-badge--danger"; el.innerHTML = '<i class="sx-dot"></i>Não foi possível carregar o catálogo'; }
}
function fillCategorySelect(){
  var sel = document.getElementById("mining-category");
  var cur = sel.value;
  sel.innerHTML = '<option value="">Todas as categorias</option>' + catalog.categories.map(function(c){
    return '<option value="'+escapeHtml(c.name)+'">'+escapeHtml(c.name)+' ('+c.count+')</option>';
  }).join("");
  sel.value = cur;
}
function importedCatalogIds(){
  var set = {};
  state.products.forEach(function(p){ if (p.catalogId) set[p.catalogId] = true; });
  return set;
}

/* ================= mineração de produtos ================= */
/* "Vencedores da semana" — TOP 3 (SIMULADO): sorteia produtos com estoque, fixo durante a semana e diferente a cada semana */
var TRENDING_COUNT = 3;
function weekKey(d){
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  var day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  var y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return d.getUTCFullYear() + "-W" + Math.ceil(((d - y0) / 86400000 + 1) / 7);
}
function computeTrending(){
  var pool = catalog.items.filter(function(r){ return r.stock > 0; });
  pool.sort(function(a,b){ return a.id < b.id ? -1 : 1; });
  var rnd = mulberry32(hashSeed("sellex-trend-" + weekKey(new Date())));
  for (var i = pool.length - 1; i > 0; i--){ var j = Math.floor(rnd() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  var picks = pool.slice(0, TRENDING_COUNT).map(function(r){ return { id: r.id, units: 18 + Math.floor(rnd() * 140) }; });
  picks.sort(function(a,b){ return b.units - a.units; });
  catalog.trending = {};
  catalog.trendingList = picks.map(function(x, i){ catalog.trending[x.id] = { rank: i + 1, units: x.units }; return x.id; });
}
function trendInfo(id){ return catalog.trending ? catalog.trending[id] || null : null; }
function matchesMining(row, imported){
  var m = state.mining;
  if (m.onlyTrending && !trendInfo(row.id)) return false;
  if (m.inStock && !(row.stock > 0)) return false;
  if (m.withGtin && !row.gtin) return false;
  if (m.notImported && imported[row.id]) return false;
  if (m.category && row._category !== m.category) return false;
  var cost = tierCost(row).value;
  if (m.priceMin!=null && cost < m.priceMin) return false;
  if (m.priceMax!=null && cost > m.priceMax) return false;
  if (m.search){
    var hay = (row.name + " " + (row.sku||"") + " " + (row.gtin||"") + " " + row._category).toLowerCase();
    if (hay.indexOf(m.search) === -1) return false;
  }
  return true;
}
function sortMining(list){
  var s = state.mining.sort, copy = list.slice();
  if (s==="price-asc") copy.sort(function(a,b){ return tierCost(a).value - tierCost(b).value; });
  else if (s==="price-desc") copy.sort(function(a,b){ return tierCost(b).value - tierCost(a).value; });
  else if (s==="stock") copy.sort(function(a,b){ return b.stock - a.stock; });
  else if (s==="name") copy.sort(function(a,b){ return a.name.localeCompare(b.name,'pt-BR'); });
  else copy.sort(function(a,b){ return a._order - b._order; });
  // os 3 vencedores da semana ficam no topo na ordenação padrão
  if ((s==="recent" || !s) && !state.mining.search){
    var top = copy.filter(function(r){ return trendInfo(r.id); }).sort(function(a,b){ return trendInfo(a.id).rank - trendInfo(b.id).rank; });
    copy = top.concat(copy.filter(function(r){ return !trendInfo(r.id); }));
  }
  return copy;
}
function renderMiningChips(){
  var m = state.mining, chips = [];
  if (m.onlyTrending) chips.push({key:"onlyTrending", label:"Top 3 da semana"});
  if (m.inStock) chips.push({key:"inStock", label:"Só com estoque"});
  if (m.withGtin) chips.push({key:"withGtin", label:"Com código de barras"});
  if (m.notImported) chips.push({key:"notImported", label:"Ainda não importados"});
  if (m.category) chips.push({key:"category", label:m.category});
  if (m.priceMin!=null || m.priceMax!=null){
    chips.push({key:"price", label:"Custo " + (m.priceMin!=null?fmtBRL(m.priceMin):"R$ 0") + " – " + (m.priceMax!=null?fmtBRL(m.priceMax):"∞")});
  }
  var host = document.getElementById("mining-chips");
  host.innerHTML = chips.length ? chips.map(function(c){
    return '<span class="chip">'+escapeHtml(c.label)+'<button type="button" data-chip="'+c.key+'" aria-label="Remover filtro"><svg><use href="#x"/></svg></button></span>';
  }).join("") + '<button type="button" class="chip-clear" id="mining-chip-clear">Limpar tudo</button>' : "";
}
function renderMining(){
  var grid = document.getElementById("mining-grid");
  var more = document.getElementById("mining-more");
  grid.classList.toggle("is-list", state.mining.view==="list");
  renderMiningChips();
  if (!catalog.loaded){
    more.style.display = "none";
    document.getElementById("mining-count").textContent = "";
    grid.innerHTML = catalog.error
      ? '<div class="empty" style="grid-column:1/-1">Não consegui carregar o catálogo do fornecedor agora. Verifique sua conexão e <a href="#" id="catalog-retry" style="color:var(--sx-blue-light)">tente de novo</a>.</div>'
      : '<div class="empty" style="grid-column:1/-1">Carregando o catálogo do fornecedor…</div>';
    return;
  }
  var imported = importedCatalogIds();
  var list = sortMining(catalog.items.filter(function(r){ return matchesMining(r, imported); }));
  var shown = list.slice(0, state.mining.limit);
  document.getElementById("mining-count").innerHTML = "<b>"+fmtInt(list.length)+"</b> de " + fmtInt(catalog.items.length) + " produtos" +
    (state.mining.search ? ' para "'+escapeHtml(state.mining.search)+'"' : "");
  more.style.display = list.length > shown.length ? "" : "none";
  more.textContent = "Carregar mais (" + fmtInt(list.length - shown.length) + " restantes)";

  if (!shown.length){
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1">Nenhum produto encontrado com esses filtros.</div>';
    return;
  }
  grid.innerHTML = shown.map(function(r){ return miningCardHTML(r, imported); }).join("");
}
function miningCardHTML(r, imported){
    var added = !!imported[r.id];
    var cost = tierCost(r);
    var sale = suggestedSalePrice(cost.value);
    var noStock = !(r.stock > 0);
    var badges = '';
    var tr = trendInfo(r.id);
    if (tr) badges += '<span class="mining-badge mining-badge--top" title="Vencedor da semana"><svg><use href="#trophy"/></svg>Top '+tr.rank+'</span>';
    if (noStock) badges += '<span class="mining-badge" style="color:#FF8A83">Esgotado</span>';
    if (r.gtin) badges += '<span class="mining-badge">GTIN</span>';
    var canAdd = !added && !noStock;
    return '<div class="mining-card'+(tr?' is-top':'')+'">' +
      '<div class="mining-badges">'+badges+'</div>' +
      '<div class="mining-card__img" style="background:'+prodTileBg(r._category)+'">'+iconSVG("box")+(r.image_url ? productImg(r.image_url, r.name) : '')+'</div>' +
      '<div class="mining-card__body">' +
        '<div class="mining-card__price"><span class="now">'+fmtBRL(cost.value)+'</span><span class="sx-muted" style="font-size:12px">custo'+(cost.exact?'':' (lista)')+'</span></div>' +
        '<div class="mining-card__name" title="'+escapeHtml(r.name)+'">'+escapeHtml(r.name)+'</div>' +
        '<div class="sx-muted" style="font-size:12px">Venda sugerida '+fmtBRL(sale)+' · '+escapeHtml(r._category)+'</div>' +
        '<div class="mining-card__meta">' +
          '<span class="sold-label">'+(noStock ? 'Sem estoque' : fmtInt(r.stock)+' em estoque')+'</span>' +
          (r.sku ? '<span class="sold-label" title="SKU">'+escapeHtml(r.sku)+'</span>' : '<span></span>') +
          '<button class="mining-add'+(added?' is-added':'')+'" data-mining-add="'+escapeHtml(r.id)+'" aria-label="'+(added?'Já está nos seus produtos':(noStock?'Sem estoque':'Adicionar aos meus produtos'))+'" title="'+(added?'Já está nos seus produtos':(noStock?'Sem estoque no fornecedor':'Adicionar aos meus produtos'))+'" '+(canAdd?'':'disabled')+'>' +
            '<svg><use href="#'+(added?'check':'plus')+'"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}
function productFromCatalog(r){
  var cost = tierCost(r).value;
  return {
    id: "c7_" + r.id,
    catalogId: r.id,
    name: r.name,
    icon: "box",
    image: r.image_url || null,
    images: Array.isArray(r.images) && r.images.length ? r.images.slice(0, 12) : (r.image_url ? [r.image_url] : []),
    supplierName: r.name,
    title: r.name,
    gtinAuto: !!r.gtin,
    channel: "ml",
    category: r._category,
    cost: cost,
    price: suggestedSalePrice(cost),
    stock: Math.max(0, r.stock || 0),
    sku: r.sku || null,
    gtin: r.gtin || null,
    active: true,
    weight: 1
  };
}
function addFromMining(id){
  var r = catalog.byId[id];
  if (!r) return;
  if (importedCatalogIds()[id]) return;
  var p = productFromCatalog(r);
  p.fees = adDefaults();
  p.marginModel = "cost";
  if ((p.title || "").length > 60){ p.title = suggestTitle(p); p.name = p.title; }
  p.price = priceForMargin(p.cost, p.fees);
  p.margin = p.fees.margin;
  state.products.push(p);
  saveJSON(STORE_KEYS.products, state.products);
  state.orders = loadOrders();
  renderSideSummary();
  openListingEditor(p.id, { isNew: true, from: "mineracao" });
}
// mantém estoque e custo dos seus produtos iguais aos do fornecedor
function refreshProductsFromCatalog(){
  var changed = false;
  state.products.forEach(function(p){
    if (!p.catalogId) return;
    var r = catalog.byId[p.catalogId];
    if (!r) return;
    var stock = Math.max(0, r.stock || 0);
    var cost = tierCost(r).value;
    if (p.stock !== stock){ p.stock = stock; changed = true; }
    if (p.cost !== cost){ p.cost = cost; changed = true; }
    if (!p.image && r.image_url){ p.image = r.image_url; changed = true; }
    if (p.category !== r._category){ p.category = r._category; changed = true; }
  });
  return changed;
}
/* ================= preparar anúncio (tela do produto antes de publicar) ================= */
var ad = { id: null, isNew: false, from: "mineracao", sel: 0, dragFrom: null, saveTimer: null, titleOpts: null, titleRound: 0, descStyle: null };
var DETAIL_FIELDS = "id,short_description,description_html,images,gtin,weight_kg,width_cm,height_cm,length_cm";

function adDefaults(){
  var s = state.settings;
  return {
    commission: 0, // comissão removida da tela e da conta
    fixedFee: s.mlFixedFee != null ? s.mlFixedFee : 5,
    advance: s.mlAdvance != null ? s.mlAdvance : 2.99,
    margin: s.defaultMargin != null ? s.defaultMargin : 30
  };
}
function num(v){ v = String(v == null ? "" : v).replace(/[^\d,.\-]/g, ""); if (v.indexOf(",") > -1) v = v.replace(/\./g, "").replace(",", "."); v = parseFloat(v); return isNaN(v) ? 0 : v; }
function round2(v){ return Math.round(v * 100) / 100; }
// preço que deixa a margem pedida depois de comissão, taxa fixa e antecipação
// margem SOBRE O CUSTO: lucro = custo × margem; o preço cobre custo + lucro + taxa fixa + antecipação
function priceForMargin(cost, f){
  var den = 1 - f.advance / 100;
  if (den <= 0.05) den = 0.05;
  return round2((cost * (1 + f.margin / 100) + f.fixedFee) / den);
}
function marginFromPrice(p){
  var cost = p.cost || 0;
  if (!(cost > 0)) return 0;
  return Math.round(feesBreakdown(p).profit / cost * 1000) / 10;
}
function feesBreakdown(p){
  var f = p.fees || adDefaults();
  var price = p.price || 0, cost = p.cost || 0;
  var commission = 0;
  var advance = round2(price * f.advance / 100);
  var fixed = round2(f.fixedFee);
  var profit = round2(price - cost - commission - fixed - advance);
  return { cost: cost, commission: commission, fixed: fixed, advance: advance, profit: profit, f: f };
}
// lucro por unidade considerando as taxas do marketplace, quando configuradas
function productUnitProfit(p){
  if (p.cost == null) return null;
  return p.fees ? feesBreakdown(p).profit : round2(p.price - p.cost);
}

function htmlToText(html){
  if (!html) return "";
  // ficha técnica "<h3>Marca</h3><p>ATK</p>" vira "Marca: ATK"
  var pairs = String(html).replace(/<(h[3-6]|p)[^>]*>\s*(?:<strong>)?([^<]{1,50}?)(?:<\/strong>)?\s*<\/\1>\s*<p[^>]*>([^<]{1,80})<\/p>/gi, function(all, tag, k, v){
    return "<p>" + k.trim() + ": " + v.trim() + "</p>";
  });
  var t = pairs
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return t.split("\n").map(function(l){ return l.replace(/\s+/g, " ").trim(); }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
// procura "Marca" / "Modelo" na ficha técnica do fornecedor
function attrFromText(text, labels){
  var lines = text.split("\n").map(function(l){ return l.trim(); }).filter(Boolean);
  for (var i = 0; i < lines.length; i++){
    var low = lines[i].toLowerCase().replace(/:$/, "");
    for (var j = 0; j < labels.length; j++){
      if (low === labels[j] && lines[i+1] && lines[i+1].length < 60) return lines[i+1];
      if (low.indexOf(labels[j] + ":") === 0) return lines[i].slice(labels[j].length + 1).trim();
    }
  }
  return "";
}
function fetchCatalogDetail(id){
  var url = SUPABASE_URL + "/rest/v1/catalog_products?select=" + DETAIL_FIELDS + "&id=eq." + encodeURIComponent(id);
  return fetch(url, { headers: { apikey: SUPABASE_KEY, Accept: "application/json" } })
    .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function(rows){ return rows && rows[0] ? rows[0] : null; });
}
function applyCatalogDetail(p, d){
  if (!d) return;
  p.detail = {
    short: d.short_description || "",
    text: htmlToText(d.description_html),
    weight: d.weight_kg != null ? Number(d.weight_kg) : null,
    dims: d.width_cm != null ? [Number(d.width_cm), Number(d.height_cm), Number(d.length_cm)] : null
  };
  if ((!p.images || p.images.length <= 1) && Array.isArray(d.images) && d.images.length) p.images = d.images.slice(0, 12);
  if (!p.gtin && d.gtin){ p.gtin = d.gtin; p.gtinAuto = true; }
  if (!p.brand) p.brand = attrFromText(p.detail.text, ["marca"]) || "Genérica";
  if (!p.model) p.model = attrFromText(p.detail.text, ["modelo", "nome do modelo"]) || p.sku || "Padrão";
  if (!p.description) p.description = suggestDescription(p);
}

/* ---------- gerador de títulos e descrições (a partir dos dados de cada produto) ---------- */
var DESC_STYLES = [
  { key: "completa", label: "Completa" },
  { key: "direta", label: "Direta" },
  { key: "destaques", label: "Destaques" }
];
var SKIP_VALUES = /^(sim|não|nao|n\/a|-|aleat[oó]ri[ao]|outros?|unidade|novo|genérica|generica)$/i;
function specPairs(p){
  var text = (p.detail && p.detail.text) || "";
  var out = [];
  text.split("\n").forEach(function(l){
    var m = l.match(/^([^:]{2,40}):\s*(.{1,80})$/);
    if (m && !/^https?$/i.test(m[1].trim())) out.push({ k: m[1].trim(), v: m[2].trim() });
  });
  return out;
}
function proseLines(p){
  var text = (p.detail && p.detail.text) || "";
  return text.split("\n").map(function(l){ return l.trim(); }).filter(function(l){
    return l.length > 40 && !/^([^:]{2,40}):\s*(.{1,80})$/.test(l);
  });
}
function titleCaseCaps(t){
  return t.replace(/\b([A-ZÀ-Ú]{4,})\b/g, function(w){ return /\d/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase(); });
}
// O Mercado Livre não aceita palavras promocionais no título (e não acha categoria com elas)
var ML_PROMO_WORDS = /\b(super\s+)?(promo[cç][aã]o|promo|oferta|imperd[ií]vel|liquida[cç][aã]o|queima\s+de\s+estoque|desconto|barato|melhor\s+pre[cç]o|frete\s+gr[aá]tis|envio\s+(imediato|r[aá]pido)|pronta\s+entrega|lan[cç]amento|novidade|mega|top)\b/gi;
function mlTitle(t){
  t = String(t || "").replace(ML_PROMO_WORDS, " ")
    .replace(/[!?¡¿*#@$%^~<>{}\[\]=_"'´`]+/g, " ")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, " ")
    .replace(/\s+/g, " ").trim();
  // palavras em CAIXA ALTA viram Capitalizadas (siglas curtas como HD, USB, LED ficam)
  t = t.split(" ").map(function(w){
    return w.length > 3 && w === w.toUpperCase() && /[A-ZÀ-Ú]{4}/.test(w) ? w.charAt(0) + w.slice(1).toLowerCase() : w;
  }).join(" ");
  return t.replace(/^[\s,\-–\/|]+|[\s,\-–\/|]+$/g, "");
}
function fitTitle(t){
  t = mlTitle(t);
  var seen = {}, words = String(t).replace(/[|•;]+/g, " ").replace(/\s+/g, " ").trim().split(" ");
  words = words.filter(function(w){ var k = w.toLowerCase(); if (w.length > 2 && seen[k]) return false; seen[k] = 1; return true; });
  t = words.join(" ");
  if (t.length > 60){ t = t.slice(0, 61); t = t.slice(0, t.lastIndexOf(" ") > 25 ? t.lastIndexOf(" ") : 60); }
  t = t.replace(/[\s,\-–\/]+$/, "");
  while (/\s(e|de|da|do|das|dos|para|com|a|o|em|sem|p\/)$/i.test(t)) t = t.replace(/\s\S+$/, "");
  return t;
}
function productFeatures(p){
  var want = /(cor|voltagem|tens[aã]o|pot[eê]ncia|capacidade|material|tamanho|resolu|conectividade|bateria|frequ[eê]ncia|quantidade|velocidade|comprimento|volume)/i;
  var feats = [];
  specPairs(p).forEach(function(x){
    if (!want.test(x.k) || SKIP_VALUES.test(x.v) || x.v.length > 18) return;
    var v = x.v;
    if (/quantidade/i.test(x.k) && /^\d+$/.test(v)) v = v + " Peças";
    if (/^(110|127|220)\s*v?\s*\/\s*(220|127)/i.test(v) || /bivolt/i.test(v)) v = "Bivolt";
    feats.push(v);
  });
  return feats.filter(function(v, i){ return feats.indexOf(v) === i; });
}
function titleOptions(p, round){
  var base = titleCaseCaps(String(p.supplierName || p.name || "").replace(/\s+/g, " ").trim());
  var brand = (p.brand || "").trim(), model = (p.model || "").trim();
  var useBrand = brand && !/gen[eé]ric/i.test(brand) && base.toLowerCase().indexOf(brand.toLowerCase()) === -1;
  var hasModel = model && base.toLowerCase().indexOf(model.toLowerCase()) === -1;
  var words = base.split(" ");
  var core = words.slice(0, Math.min(words.length, 4)).join(" ");
  var feats = productFeatures(p);
  var off = feats.length ? round % feats.length : 0;
  var f = feats.slice(off).concat(feats.slice(0, off));
  var cand = [
    { t: base, why: "Nome do fornecedor" },
    { t: core + (useBrand ? " " + brand : "") + (hasModel ? " " + model : "") + (f[0] ? " " + f[0] : ""), why: "Marca e modelo" },
    { t: base + (f[0] ? " " + f[0] : "") + (f[1] ? " " + f[1] : ""), why: "Com características" },
    { t: core + (f[0] ? " " + f[0] : "") + (f[1] ? " " + f[1] : "") + (f[2] ? " " + f[2] : "") + (useBrand ? " " + brand : ""), why: "Palavras-chave" },
    { t: (p.category && base.toLowerCase().indexOf(p.category.split(" ")[0].toLowerCase()) === -1 ? core + " " + (hasModel ? model + " " : "") + "para " + p.category : core + (hasModel ? " " + model : "") + (useBrand ? " " + brand : "")), why: "Busca por categoria" }
  ];
  var out = [], seen = {};
  cand.forEach(function(c){
    var t = fitTitle(c.t);
    var k = t.toLowerCase();
    if (t.length >= Math.min(25, base.length) && !seen[k]){ seen[k] = 1; out.push({ t: t, why: c.why }); }
  });
  return out.slice(0, 4);
}
function suggestTitle(p){ var o = titleOptions(p, 0); return o.length ? o[0].t : fitTitle(p.name || ""); }

function specBlock(p){
  var d = p.detail || {}, spec = [];
  if (p.brand) spec.push("Marca: " + p.brand);
  if (p.model) spec.push("Modelo: " + p.model);
  if (d.weight) spec.push("Peso: " + String(d.weight).replace(".", ",") + " kg");
  if (d.dims) spec.push("Dimensões da embalagem: " + d.dims.map(function(x){ return String(x).replace(".", ","); }).join(" x ") + " cm");
  return spec;
}
function suggestDescription(p, style){
  style = style || "completa";
  var d = p.detail || {};
  var title = p.title || p.name;
  var pairs = specPairs(p).filter(function(x){ return !/^(marca|modelo|nome do modelo|condi[cç][aã]o|fabricante|nr\.? de homologa)/i.test(x.k) && !SKIP_VALUES.test(x.v); });
  var prose = proseLines(p).filter(function(l){ return !d.short || l.indexOf(d.short.slice(0, 40)) === -1; });
  var bullets = pairs.map(function(x){ return "- " + x.k + ": " + x.v; });
  var spec = specBlock(p);
  var parts = [];
  if (style === "direta"){
    parts.push(title);
    if (d.short) parts.push(d.short);
    if (bullets.length) parts.push(bullets.slice(0, 6).join("\n"));
    if (spec.length) parts.push(spec.join("\n"));
    parts.push("Produto novo, enviado com nota fiscal.");
  } else if (style === "destaques"){
    parts.push(title.toUpperCase());
    if (d.short) parts.push(d.short);
    var hl = productFeatures(p).map(function(v){ return "- " + v; });
    if (prose.length) hl = hl.concat(prose.slice(0, 3).map(function(l){ return "- " + l.replace(/[.!]+$/, ""); }));
    if (hl.length) parts.push("DESTAQUES\n" + hl.slice(0, 7).join("\n"));
    if (bullets.length || spec.length) parts.push("FICHA TÉCNICA\n" + spec.concat(bullets.map(function(b){ return b.slice(2); })).slice(0, 14).join("\n"));
    parts.push("ENVIO\nProduto novo, enviado com nota fiscal. Despachamos assim que o pagamento é aprovado.");
  } else {
    parts.push(title);
    if (d.short) parts.push(d.short);
    if (bullets.length) parts.push("PRINCIPAIS CARACTERÍSTICAS\n" + bullets.slice(0, 12).join("\n"));
    if (prose.length) parts.push(prose.slice(0, 6).join("\n\n"));
    if (spec.length) parts.push("ESPECIFICAÇÕES\n" + spec.join("\n"));
    parts.push("INFORMAÇÕES IMPORTANTES\n- Produto novo\n- Enviado com nota fiscal\n- Em caso de dúvida, use o campo de perguntas antes de comprar");
  }
  return parts.join("\n\n").slice(0, 5000);
}
function renderTitleOptions(p){
  var box = document.getElementById("ad-title-opts");
  if (!ad.titleOpts || !ad.titleOpts.length){ box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  box.innerHTML = '<div class="ad-opts__head"><span>Escolha um título</span><span><button type="button" data-gen="title">Gerar outros</button> · <button type="button" data-opts-close>Fechar</button></span></div>' +
    ad.titleOpts.map(function(o, i){
      return '<button type="button" class="ad-opt'+(o.t===p.title?' is-current':'')+'" data-title-opt="'+i+'"><span>'+escapeHtml(o.t)+'</span><small>'+o.t.length+'/60 · '+escapeHtml(o.why)+'</small></button>';
    }).join("");
}
function renderDescStyles(){
  var box = document.getElementById("ad-desc-styles");
  if (!ad.descStyle){ box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = DESC_STYLES.map(function(s){
    return '<button type="button" data-desc-style="'+s.key+'" class="'+(s.key===ad.descStyle?'is-active':'')+'">'+s.label+'</button>';
  }).join("");
}

/* ---------- popup de publicação ---------- */
var PUB_STEPS = [
  { key: "product", label: "Verificando produto" },
  { key: "stock", label: "Verificando estoque" },
  { key: "prepare", label: "Preparando anúncio" },
  { key: "integration", label: "Analisando integração com a loja" },
  { key: "publish", label: "Publicando no Mercado Livre", done: "Sucesso na publicação" }
];
var pub = { running: false };
// MODO TESTE: true = simula a publicação (não envia nada ao Mercado Livre e não exige conta conectada).
// Para publicar de verdade, troque para false.
var PUBLISH_TEST_MODE = false;
function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
function pubRender(stateByKey, finalOk){
  document.getElementById("pub-steps").innerHTML = PUB_STEPS.map(function(s, i){
    var st = stateByKey[s.key] || "";
    var cls = st === "run" ? "is-run" : st === "ok" ? "is-ok" : st === "fail" ? "is-fail" : "";
    var icon = st === "ok" ? '<svg><use href="#check"/></svg>' : st === "fail" ? '<svg><use href="#x"/></svg>' : "";
    var label = (st === "ok" && s.done) ? s.done : s.label;
    return '<li class="pub-step '+cls+(i===PUB_STEPS.length-1?' is-final':'')+'"><i>'+icon+'</i><span>'+label+'</span></li>';
  }).join("");
  var done = PUB_STEPS.filter(function(s){ return stateByKey[s.key] === "ok"; }).length;
  var running = PUB_STEPS.some(function(s){ return stateByKey[s.key] === "run"; }) ? 0.5 : 0;
  var bar = document.getElementById("pub-bar");
  bar.style.width = Math.min(100, (done + running) / PUB_STEPS.length * 100) + "%";
  bar.parentNode.classList.toggle("is-error", PUB_STEPS.some(function(s){ return stateByKey[s.key] === "fail"; }));
  bar.parentNode.classList.toggle("is-done", !!finalOk);
}
function pubOpen(p){
  var th = document.getElementById("pub-thumb");
  th.style.setProperty("--ad-tile", prodTileBg(p.category));
  var src = (p.images && p.images[0]) || p.image;
  th.classList.toggle("is-empty", !src);
  th.innerHTML = iconSVG(p.icon) + (src ? '<img src="'+escapeHtml(src)+'" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add(\'is-empty\');this.remove()">' : "");
  document.getElementById("pub-title").textContent = p.title || p.name;
  document.getElementById("pub-result").innerHTML = "";
  document.getElementById("pub-modal").classList.add("is-open");
}
function pubFinish(){
  clearTimeout(pub.autoTimer);
  pubClose();
  if (ad.id) leaveListingEditor(false);
  goToPage("produtos");
}
function pubClose(){
  if (pub.running) return;
  document.getElementById("pub-modal").classList.remove("is-open");
}
// Se o ML não achar categoria pelo título, tenta de novo com títulos mais simples
// (nome original do produto e versões mais curtas) antes de mostrar o erro.
function titleFallbacks(payload, p){
  var base = payload.title, words = base.split(" "), out = [base];
  [fitTitle(p.name || ""), words.slice(0, 5).join(" "), words.slice(0, 4).join(" "), words.slice(0, 3).join(" ")].forEach(function(t){
    t = fitTitle(t);
    if (t && t.length >= 8 && out.indexOf(t) === -1) out.push(t);
  });
  return out;
}
function publishWithTitleFallback(client, payload, p){
  var titles = titleFallbacks(payload, p), i = 0;
  var attempt = function(){
    var body = Object.assign({}, payload, { title: titles[i] });
    return client.functions.invoke("ml-publish", { method: "POST", body: body }).then(function(res){
      var r = res && res.data;
      if (r && !r.ok && r.error === "no_category" && i < titles.length - 1){ i++; return attempt(); }
      if (r && r.ok && i > 0){ p.title = titles[i]; }
      return res;
    });
  };
  return attempt();
}
function pubFail(states, key, message, opts){
  opts = opts || {};
  states[key] = "fail";
  pubRender(states);
  pub.running = false;
  var causes = (opts.causes || []).filter(Boolean);
  document.getElementById("pub-result").innerHTML =
    '<p class="pub-msg">'+escapeHtml(message)+'</p>' +
    (causes.length ? '<ul class="pub-causes">'+causes.map(function(c){ return '<li>'+escapeHtml(c)+'</li>'; }).join("")+'</ul>' : '') +
    (opts.address ? '<div class="pub-addr"><span>Endereço do fornecedor:</span><b>'+escapeHtml(supplierAddressText())+'</b>' +
      '<button type="button" class="addr-copy" data-pub="copy-address"><svg><use href="#copy"/></svg><span>Copiar endereço</span></button></div>' : '') +
    '<div class="pub-actions">' +
      '<button type="button" class="sx-btn sx-btn--ghost sx-btn--sm" data-pub="close">'+(opts.fix ? 'Corrigir' : 'Fechar')+'</button>' +
      (opts.connect ? '<button type="button" class="sx-btn sx-btn--sm" data-pub="connect">Conectar Mercado Livre</button>'
                    : (opts.retry ? '<button type="button" class="sx-btn sx-btn--sm" data-pub="retry">Tentar de novo</button>' : '')) +
    '</div>';
}
// a categoria do ML pediu atributos que não estavam na ficha: o lojista preenche aqui e publica de novo
function pubAskAttributes(states, p, r){
  states.publish = "fail"; pubRender(states);
  pub.running = false;
  pub.missing = r.missing_attributes;
  var prev = {}; (p.extraAttrs || []).forEach(function(a){ prev[a.id] = a; });
  document.getElementById("pub-result").innerHTML =
    '<p class="pub-msg">'+escapeHtml(r.message || "O Mercado Livre pede mais informações sobre o produto.")+' Preencha e publique de novo:</p>' +
    '<form class="pub-attrs" id="pub-attrs">' + r.missing_attributes.map(function(m, i){
      var cur = prev[m.id] || {};
      var field = m.values && m.values.length
        ? '<select class="sx-select" data-attr="'+i+'" required><option value="">Selecione</option>' + m.values.map(function(v){
            return '<option value="'+escapeHtml(v.id)+'"'+(cur.value_id===v.id?' selected':'')+'>'+escapeHtml(v.name)+'</option>'; }).join("") + '</select>'
        : '<input class="sx-input" data-attr="'+i+'" required value="'+escapeHtml(cur.value_name || "")+'" placeholder="'+escapeHtml(m.name)+'">';
      return '<label><span>'+escapeHtml(m.name)+'</span>'+field+'</label>';
    }).join("") +
    '<div class="pub-actions"><button type="button" class="sx-btn sx-btn--ghost sx-btn--sm" data-pub="close">Fechar</button>' +
    '<button type="submit" class="sx-btn sx-btn--sm">Preencher e publicar</button></div></form>';
  var first = document.querySelector("#pub-attrs [data-attr]"); if (first) first.focus();
}
function fetchCatalogStock(id){
  var url = SUPABASE_URL + "/rest/v1/catalog_products?select=stock,active&id=eq." + encodeURIComponent(id);
  return fetch(url, { headers: { apikey: SUPABASE_KEY, Accept: "application/json" } })
    .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function(rows){ return rows && rows[0] ? rows[0] : null; });
}
function runPublish(p){
  if (pub.running) return;
  pub.running = true;
  pub.productId = p.id;
  var states = {};
  pubOpen(p);
  pubRender(states);
  var STEP_MS = 750, payload = null;
  function step(key, work){
    states[key] = "run"; pubRender(states);
    var t0 = Date.now();
    return Promise.resolve().then(work).then(function(v){
      return wait(Math.max(0, STEP_MS - (Date.now() - t0))).then(function(){ return v; });
    });
  }
  function stop(){ var e = new Error("stop"); e.stop = true; throw e; }

  step("product", function(){
    var m = adMissing(p);
    if (m.length){ pubFail(states, "product", "Antes de publicar, preencha: " + m.join(", ") + ".", { fix: true }); stop(); }
  }).then(function(){
    states.product = "ok";
    return step("stock", function(){
      if (!p.catalogId) return;
      return fetchCatalogStock(p.catalogId).catch(function(){ return { failed: true }; }).then(function(r){
        if (r && r.failed){ pubFail(states, "stock", "Não consegui consultar o estoque do fornecedor agora.", { retry: true }); stop(); }
        if (!r || r.active === false){ pubFail(states, "stock", "Este produto não está mais no catálogo do fornecedor."); stop(); }
        p.stock = Math.max(0, r.stock || 0);
        if (p.stock <= 0){ pubFail(states, "stock", "O fornecedor está sem estoque deste produto agora. Tente de novo quando ele repor."); stop(); }
      });
    });
  }).then(function(){
    states.stock = "ok";
    return step("prepare", function(){
      payload = {
        catalogId: p.catalogId || null, sku: p.sku || null, stock: p.stock,
        title: fitTitle(p.title || p.name) || (p.title || p.name).trim().slice(0, 60),
        description: (p.description || "").trim(),
        price: p.price, brand: (p.brand || "").trim(), model: (p.model || "").trim(),
        gtin: (p.gtin || "").replace(/\D/g, ""), gtinReason: p.gtinReason || "",
        images: (p.images || []).filter(function(u){ return /^https:\/\//.test(u); }).slice(0, 10),
        specs: specPairs(p).slice(0, 60),
        extraAttrs: p.extraAttrs || []
      };
      if (!payload.images.length){ pubFail(states, "prepare", "O Mercado Livre exige pelo menos uma foto com endereço público (https).", { fix: true }); stop(); }
    });
  }).then(function(){
    states.prepare = "ok";
    return step("integration", function(){
      if (PUBLISH_TEST_MODE) return;
      return refreshMlStatus().catch(function(){}).then(function(){
        if (!ml.account){ pubFail(states, "integration", "Sua conta do Mercado Livre ainda não está conectada ao Sellex.", { connect: true }); stop(); }
        if (ml.account.status && ml.account.status !== "connected"){ pubFail(states, "integration", "A conexão com o Mercado Livre expirou. Conecte de novo.", { connect: true }); stop(); }
      });
    });
  }).then(function(){
    states.integration = "ok";
    states.publish = "run"; pubRender(states);
    var client = sb();
    var request = PUBLISH_TEST_MODE
      ? wait(1400).then(function(){
          return { data: { ok: true, test: true, id: "MLB" + String(Date.now()).slice(-10), permalink: null, available_quantity: p.stock, description_saved: true } };
        })
      : (client ? publishWithTitleFallback(client, payload, p) : null);
    if (!request){ pubFail(states, "publish", "Sem conexão com o servidor do Sellex.", { retry: true }); stop(); }
    return request.then(function(res){
      var r = res.data;
      if (!r && res.error){
        return functionErrorCode(res.error).then(function(code){
          pubFail(states, "publish", code === "network" ? "Sem conexão com o servidor. Verifique sua internet." :
            (code === "http_401" ? "Sua sessão expirou. Entre de novo no Sellex." : "O servidor não conseguiu publicar agora."), { retry: true });
          stop();
        });
      }
      if (!r || !r.ok){
        var key = r && PUB_STEPS.some(function(s){ return s.key === r.step; }) ? r.step : "publish";
        PUB_STEPS.forEach(function(s, i){ if (i >= PUB_STEPS.findIndex(function(x){ return x.key === key; })) delete states[s.key]; });
        if (r && r.error === "missing_attributes" && Array.isArray(r.missing_attributes)){
          pubAskAttributes(states, p, r);
          stop();
        }
        pubFail(states, key, (r && r.message) || "O Mercado Livre não aceitou o anúncio.", {
          causes: r && r.causes, connect: r && /ml_not_connected|ml_expired/.test(r.error || ""), retry: !(r && r.error === "ml_rejected"), fix: r && r.error === "ml_rejected",
          address: r && (r.causes || []).some(function(c){ return /endereço/i.test(c); })
        });
        stop();
      }
      p.mlItemId = r.id;
      p.mlPermalink = r.permalink || null;
      p.status = "publicado";
      p.testPublish = !!r.test;
      p.publishedAt = new Date().toISOString();
      if (r.available_quantity != null) p.stock = r.available_quantity;
      saveJSON(STORE_KEYS.products, state.products);
      states.publish = "ok";
      pubRender(states, true);
      pub.running = false;
      ad.isNew = false;
      document.getElementById("pub-result").innerHTML =
        '<div class="pub-success"><div class="pub-success__ico"><svg><use href="#check"/></svg></div>' +
        '<h3>Produto publicado!</h3>' +
        '<p class="pub-msg">Anúncio <b>'+escapeHtml(r.id)+'</b> criado no Mercado Livre por <b>'+fmtBRL(p.price)+'</b>.' +
          (r.status === "paused" || r.status === "not_yet_active" || r.status === "under_review"
            ? ' O Mercado Livre está processando as fotos: o anúncio fica <b>ativo em alguns minutos</b>.'
            : (r.status && r.status !== "active" ? ' Situação no Mercado Livre: <b>'+escapeHtml(({inactive:"inativo",closed:"finalizado"})[r.status] || r.status)+'</b>.' : '')) +
          (r.description_saved === false ? ' A descrição não foi aceita; você pode ajustá-la direto no Mercado Livre.' : '') + '</p>' +
        '<div class="pub-actions" style="justify-content:center">' +
          (p.mlPermalink ? '<a class="sx-btn sx-btn--ghost sx-btn--sm" href="'+escapeHtml(p.mlPermalink)+'" target="_blank" rel="noopener">Ver anúncio</a>' : '') +
          '<button type="button" class="sx-btn sx-btn--sm" data-pub="done">Ir para Produtos</button>' +
        '</div></div>';
      clearTimeout(pub.autoTimer);
      pub.autoTimer = setTimeout(function(){
        if (document.getElementById("pub-modal").classList.contains("is-open") && pub.productId === p.id) pubFinish();
      }, 2200);
    });
  }).catch(function(e){
    if (!e || !e.stop){ pubFail(states, "publish", "Algo deu errado ao publicar. Tente de novo.", { retry: true }); }
  });
}

function adProduct(){ return ad.id ? productById(ad.id) : null; }
function adMissing(p){
  var m = [];
  if (!p.images || !p.images.length) m.push("foto");
  if (!(p.title || "").trim()) m.push("título");
  if (!(p.brand || "").trim()) m.push("marca");
  if (!(p.model || "").trim()) m.push("modelo");
  if (!(p.gtin || "").trim() && !p.gtinReason) m.push("EAN ou motivo");
  if (feesBreakdown(p).profit <= 0) m.push("preço com lucro");
  return m;
}

function openListingEditor(id, opts){
  var p = productById(id);
  if (!p) return;
  opts = opts || {};
  ad.id = id; ad.isNew = !!opts.isNew; ad.from = opts.from || "produtos"; ad.sel = 0;
  ad.titleOpts = null; ad.titleRound = 0; ad.descStyle = null;
  if (!p.fees) p.fees = adDefaults();
  if (p.fees.commission || p.marginModel !== "cost"){
    p.fees.commission = 0; p.marginModel = "cost";
    if (!p.mlItemId) p.price = priceForMargin(p.cost || 0, p.fees);
    else p.fees.margin = marginFromPrice(p);
    saveJSON(STORE_KEYS.products, state.products);
  }
  if (!p.images) p.images = p.image ? [p.image] : [];
  if (!p.title) p.title = p.name;
  // sem marca/modelo no fornecedor: usa padrões aceitos pelo Mercado Livre para não travar a publicação
  if (p.detail && !p.brand) p.brand = "Genérica";
  if (p.detail && !p.model) p.model = p.sku || "Padrão";
  if (!p.supplierName) p.supplierName = p.name;
  document.getElementById("ad-crumb-from").textContent = ad.from === "mineracao" ? "Mineração" : "Produtos";
  document.getElementById("ad-cancel").textContent = ad.isNew ? "Cancelar" : "Voltar";
  goToPage("anuncio");
  renderListingEditor();
  if (p.catalogId && !p.detail){
    fetchCatalogDetail(p.catalogId).then(function(d){
      if (!d) return;
      applyCatalogDetail(p, d);
      saveJSON(STORE_KEYS.products, state.products);
      if (ad.id === p.id) renderListingEditor();
    }).catch(function(){ /* sem detalhe: o lojista preenche */ });
  }
}

function renderAdGallery(p){
  var imgs = p.images || [];
  if (ad.sel >= imgs.length) ad.sel = 0;
  var tile = prodTileBg(p.category);
  var main = document.getElementById("ad-main");
  main.style.setProperty("--ad-tile", tile);
  var src = imgs[ad.sel];
  main.classList.toggle("is-empty", !src);
  main.innerHTML = iconSVG(p.icon) + (src ? '<img src="'+escapeHtml(src)+'" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add(\'is-empty\');this.remove()">' : '');
  var acts = [];
  if (imgs.length && ad.sel > 0) acts.push('<button type="button" data-ad-act="cover">Usar como capa</button>');
  if (imgs.length > 1) acts.push('<button type="button" class="is-danger" data-ad-act="remove">Remover foto</button>');
  if (!imgs.length) acts.push('<span class="sx-muted" style="font-size:12.5px">Sem fotos do fornecedor ainda</span>');
  document.getElementById("ad-main-actions").innerHTML = acts.join("");
  document.getElementById("ad-thumbs").innerHTML = imgs.map(function(u, i){
    return '<button type="button" class="ad-thumb'+(i===ad.sel?' is-active':'')+'" draggable="true" data-thumb="'+i+'" style="--ad-tile:'+tile+'" aria-label="Foto '+(i+1)+'">' +
      iconSVG(p.icon) + '<img src="'+escapeHtml(u)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add(\'is-empty\');this.remove()">' +
      (i===0 ? '<b>Capa</b>' : '') + '</button>';
  }).join("");
}
function renderAdFinance(p){
  var b = feesBreakdown(p);
  document.getElementById("ad-sum").innerHTML =
    '<div class="r"><span>Custo do produto</span><b>'+fmtBRL(b.cost)+'</b></div>' +
    '<div class="r"><span>Taxa fixa</span><b>− '+fmtBRL(b.fixed)+'</b></div>' +
    '<div class="r"><span>Antecipação ('+fmtPctBR(b.f.advance)+')</span><b>− '+fmtBRL(b.advance)+'</b></div>' +
    '<div class="r total'+(b.profit<=0?' is-neg':'')+'"><span>Lucro estimado</span><b>'+fmtBRL(b.profit)+'</b></div>';
  var priceEl = document.getElementById("ad-price");
  if (document.activeElement !== priceEl) priceEl.value = (p.price || 0).toFixed(2).replace(".", ",");
}
function fmtPctBR(v){ return String(round2(v)).replace(".", ",") + "%"; }
function renderAdChecks(p){
  var m = adMissing(p);
  var el = document.getElementById("ad-check");
  el.className = "ad-bar__check " + (m.length ? "warn" : "ok");
  el.textContent = m.length ? "Falta: " + m.join(", ") : "Tudo pronto para publicar";
  ["brand","model"].forEach(function(k){
    document.getElementById("ad-"+k).classList.toggle("is-missing", !(p[k]||"").trim());
  });
  var msg = document.getElementById("ad-gtin-msg");
  if ((p.gtin||"").trim() && p.gtinAuto){ msg.className = "ad-gtin-msg ok"; msg.innerHTML = '<svg><use href="#check"/></svg>EAN encontrado automaticamente no fornecedor.'; }
  else if ((p.gtin||"").trim()){ msg.className = "ad-gtin-msg ok"; msg.innerHTML = '<svg><use href="#check"/></svg>EAN informado.'; }
  else if (p.gtinReason){ msg.className = "ad-gtin-msg ok"; msg.innerHTML = '<svg><use href="#check"/></svg>Sem EAN, com motivo informado.'; }
  else { msg.className = "ad-gtin-msg warn"; msg.textContent = "Informe o EAN ou escolha o motivo de ele estar vazio."; }
  var tl = (p.title||"").length;
  document.getElementById("ad-title-count").textContent = tl;
  document.getElementById("ad-title-count").parentNode.classList.toggle("is-full", tl >= 60);
}
function renderListingEditor(){
  var p = adProduct();
  if (!p) return;
  renderAdGallery(p);
  var set = function(id, v){ var el = document.getElementById(id); if (document.activeElement !== el) el.value = v == null ? "" : v; };
  set("ad-category", p.category);
  set("ad-title", p.title);
  set("ad-desc", p.description || "");
  set("ad-brand", p.brand);
  set("ad-model", p.model);
  set("ad-gtin", p.gtin);
  set("ad-gtin-reason", p.gtinReason || "");
  set("ad-sku", p.sku || "—");
  set("ad-stock", fmtInt(p.stock) + " un.");
  set("ad-fixed", p.fees.fixedFee);
  set("ad-advance", p.fees.advance);
  set("ad-margin", p.fees.margin);
  renderAdFinance(p);
  renderAdChecks(p);
  renderTitleOptions(p);
  renderDescStyles();
  var pubBtn = document.getElementById("ad-publish");
  pubBtn.textContent = p.mlItemId ? "Ver no Mercado Livre" : "Publicar produto";
}
function adSaved(){
  var el = document.getElementById("ad-saved");
  el.classList.add("is-saving"); el.querySelector("span").textContent = "Salvando…";
  clearTimeout(ad.saveTimer);
  ad.saveTimer = setTimeout(function(){
    saveJSON(STORE_KEYS.products, state.products);
    el.classList.remove("is-saving"); el.querySelector("span").textContent = "Salvo automaticamente";
  }, 400);
}
function adFieldChanged(el){
  var p = adProduct(); if (!p) return;
  var key = el.getAttribute("data-ad");
  if (key){
    p[key] = el.value;
    if (key === "title") p.name = el.value.trim() || p.supplierName;
    if (key === "gtin"){ p.gtin = el.value.replace(/\D/g, ""); p.gtinAuto = false; }
    if (key === "category") p.category = el.value.trim() || p.category;
  }
  var fee = el.getAttribute("data-fee");
  if (fee){
    p.fees[fee] = Math.max(0, num(el.value));
    p.price = priceForMargin(p.cost || 0, p.fees);
    // lembra as taxas para os próximos produtos
    if (fee === "fixedFee") state.settings.mlFixedFee = p.fees.fixedFee;
    if (fee === "advance") state.settings.mlAdvance = p.fees.advance;
    saveJSON(STORE_KEYS.settings, state.settings);
  }
  if (el.id === "ad-price"){
    p.price = Math.max(0, round2(num(el.value)));
    var b = feesBreakdown(p);
    p.fees.margin = marginFromPrice(p);
    document.getElementById("ad-margin").value = p.fees.margin;
  }
  p.margin = p.fees.margin;
  renderAdFinance(p);
  renderAdChecks(p);
  adSaved();
}
function leaveListingEditor(discard){
  var p = adProduct();
  if (discard && p && ad.isNew){
    state.products = state.products.filter(function(x){ return x.id !== p.id; });
    toast("Produto descartado.");
  }
  saveJSON(STORE_KEYS.products, state.products);
  var back = ad.from === "mineracao" ? "mineracao" : "produtos";
  ad.id = null;
  renderSideSummary();
  goToPage(back);
}
function publishListing(){
  var p = adProduct(); if (!p) return;
  if (p.mlItemId){
    if (p.mlPermalink) window.open(p.mlPermalink, "_blank", "noopener");
    else toast("Este produto já está publicado no Mercado Livre (" + p.mlItemId + ").");
    return;
  }
  runPublish(p);
}
function initListingEditor(){
  var page = document.getElementById("page-anuncio");
  page.addEventListener("input", function(e){
    var el = e.target;
    if (el.matches("[data-ad],[data-fee],#ad-price")) adFieldChanged(el);
  });
  page.addEventListener("change", function(e){
    if (e.target.matches("select[data-ad]")) adFieldChanged(e.target);
    if (e.target.id === "ad-price"){ var p = adProduct(); if (p) e.target.value = (p.price||0).toFixed(2).replace(".", ","); }
  });
  page.addEventListener("click", function(e){
    var p = adProduct(); if (!p) return;
    var gen = e.target.closest("[data-gen]");
    if (gen){
      if (gen.getAttribute("data-gen") === "title"){
        ad.titleOpts = titleOptions(p, ad.titleRound++);
        renderTitleOptions(p);
      } else {
        var i = DESC_STYLES.findIndex(function(x){ return x.key === ad.descStyle; });
        ad.descStyle = DESC_STYLES[(i + 1) % DESC_STYLES.length].key;
        p.description = suggestDescription(p, ad.descStyle);
        document.getElementById("ad-desc").value = p.description;
        renderDescStyles(); adSaved();
      }
      return;
    }
    var opt = e.target.closest("[data-title-opt]");
    if (opt){
      var o = ad.titleOpts[+opt.getAttribute("data-title-opt")];
      p.title = o.t; p.name = o.t;
      document.getElementById("ad-title").value = o.t;
      renderAdChecks(p); renderTitleOptions(p); adSaved(); return;
    }
    if (e.target.closest("[data-opts-close]")){ ad.titleOpts = null; renderTitleOptions(p); return; }
    var ds = e.target.closest("[data-desc-style]");
    if (ds){
      ad.descStyle = ds.getAttribute("data-desc-style");
      p.description = suggestDescription(p, ad.descStyle);
      document.getElementById("ad-desc").value = p.description;
      renderDescStyles(); adSaved(); return;
    }
    var th = e.target.closest("[data-thumb]");
    if (th){ ad.sel = +th.getAttribute("data-thumb"); renderAdGallery(p); return; }
    var act = e.target.closest("[data-ad-act]");
    if (act){
      var a = act.getAttribute("data-ad-act");
      if (a === "cover"){ var img = p.images.splice(ad.sel, 1)[0]; p.images.unshift(img); ad.sel = 0; }
      if (a === "remove" && p.images.length > 1){ p.images.splice(ad.sel, 1); ad.sel = Math.max(0, ad.sel - 1); }
      p.image = p.images[0] || null;
      renderAdGallery(p); renderAdChecks(p); adSaved();
    }
  });
  var thumbs = document.getElementById("ad-thumbs");
  thumbs.addEventListener("dragstart", function(e){
    var th = e.target.closest("[data-thumb]"); if (!th) return;
    ad.dragFrom = +th.getAttribute("data-thumb"); th.classList.add("is-drag");
    try{ e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(ad.dragFrom)); }catch(err){}
  });
  thumbs.addEventListener("dragover", function(e){
    var th = e.target.closest("[data-thumb]"); if (!th || ad.dragFrom == null) return;
    e.preventDefault();
    thumbs.querySelectorAll(".is-over").forEach(function(x){ x.classList.remove("is-over"); });
    th.classList.add("is-over");
  });
  thumbs.addEventListener("drop", function(e){
    var th = e.target.closest("[data-thumb]"); var p = adProduct();
    if (!th || !p || ad.dragFrom == null) return;
    e.preventDefault();
    var to = +th.getAttribute("data-thumb");
    var img = p.images.splice(ad.dragFrom, 1)[0];
    p.images.splice(to, 0, img);
    p.image = p.images[0] || null;
    ad.sel = to; ad.dragFrom = null;
    renderAdGallery(p); adSaved();
  });
  thumbs.addEventListener("dragend", function(){
    ad.dragFrom = null;
    thumbs.querySelectorAll(".is-drag,.is-over").forEach(function(x){ x.classList.remove("is-drag","is-over"); });
  });
  document.getElementById("ad-back").addEventListener("click", function(){ leaveListingEditor(false); });
  document.getElementById("ad-crumb-from").addEventListener("click", function(e){ e.preventDefault(); leaveListingEditor(false); });
  document.getElementById("ad-cancel").addEventListener("click", function(){
    if (ad.isNew && !window.confirm("Descartar este produto? Ele não será adicionado aos seus produtos.")) return;
    leaveListingEditor(ad.isNew);
  });
  document.getElementById("ad-publish").addEventListener("click", publishListing);
  document.getElementById("pub-modal").addEventListener("click", function(e){
    var b = e.target.closest("[data-pub]");
    if (!b) return;
    var a = b.getAttribute("data-pub");
    var p = productById(pub.productId);
    if (a === "close"){ pubClose(); return; }
    if (a === "copy-address"){ copyText(supplierAddressText()).then(function(){ flashCopied(b); }).catch(function(){ toast("Não consegui copiar.", true); }); return; }
    if (a === "retry" && p){ pubClose(); runPublish(p); return; }
    if (a === "connect"){ pubClose(); goToPage("integracoes"); return; }
    if (a === "done") pubFinish();
  });
  document.getElementById("pub-modal").addEventListener("submit", function(e){
    if (e.target.id !== "pub-attrs") return;
    e.preventDefault();
    var p = productById(pub.productId); if (!p || !pub.missing) return;
    var map = {}; (p.extraAttrs || []).forEach(function(a){ map[a.id] = a; });
    e.target.querySelectorAll("[data-attr]").forEach(function(el){
      var m = pub.missing[+el.getAttribute("data-attr")]; if (!m) return;
      if (el.tagName === "SELECT"){
        var opt = el.options[el.selectedIndex];
        if (el.value) map[m.id] = { id: m.id, value_id: el.value, value_name: opt ? opt.textContent : null };
      } else if (el.value.trim()) map[m.id] = { id: m.id, value_name: el.value.trim() };
    });
    p.extraAttrs = Object.keys(map).map(function(k){ return map[k]; });
    saveJSON(STORE_KEYS.products, state.products);
    pubClose(); runPublish(p);
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && document.getElementById("pub-modal").classList.contains("is-open")) pubClose();
  });
}

function syncMiningViewButtons(){
  document.getElementById("mining-view-grid").setAttribute("data-active", state.mining.view==="grid");
  document.getElementById("mining-view-list").setAttribute("data-active", state.mining.view==="list");
}
function resetMiningFilters(){
  state.mining = {search:state.mining.search, inStock:false, withGtin:false, notImported:false, onlyTrending:false, category:"", priceMin:null, priceMax:null, sort:state.mining.sort, view:state.mining.view, limit:MINING_PAGE};
  document.querySelectorAll("[data-mfilter]").forEach(function(cb){ cb.checked=false; });
  document.getElementById("mining-category").value = "";
  document.getElementById("mining-price-min").value = "";
  document.getElementById("mining-price-max").value = "";
  document.querySelectorAll(".price-preset").forEach(function(b){ b.classList.remove("is-active"); });
  renderMining();
}

/* ================= pedidos ================= */
/* ================= pedidos: dashboard de vendas (logística + financeiro) ================= */
var STATUS_COLOR = {processando:"var(--sx-yellow)", enviado:"var(--sx-blue-light)", concluido:"var(--sx-green)", cancelado:"var(--sx-red)"};
var STATUS_ORDER = ["processando","enviado","concluido","cancelado"];

function sumProfit(orders){
  return orders.filter(function(o){ return o.status!=="cancelado"; })
    .reduce(function(a,o){ return a + profitOfOrder(o); }, 0);
}
function renderVendasKPIs(){
  var days = periodDays(state.vendasPeriod);
  var cur = ordersInRange(0, days);
  var prev = ordersInRange(days, days*2);

  var faturamento = cur.filter(function(o){ return o.status!=="cancelado"; }).reduce(function(a,o){ return a+o.total; },0);
  var faturamentoPrev = prev.filter(function(o){ return o.status!=="cancelado"; }).reduce(function(a,o){ return a+o.total; },0);

  var lucro = sumProfit(cur);
  var lucroPrev = sumProfit(prev);

  var aReceber = cur.filter(function(o){ return o.status==="processando" || o.status==="enviado"; }).reduce(function(a,o){ return a+o.total; },0);
  var aReceberPrev = prev.filter(function(o){ return o.status==="processando" || o.status==="enviado"; }).reduce(function(a,o){ return a+o.total; },0);

  var cancelados = cur.filter(function(o){ return o.status==="cancelado"; });
  var canceladosValor = cancelados.reduce(function(a,o){ return a+o.total; },0);
  var canceladosValorPrev = prev.filter(function(o){ return o.status==="cancelado"; }).reduce(function(a,o){ return a+o.total; },0);

  var validCount = cur.filter(function(o){ return o.status!=="cancelado"; }).length;
  var ticket = validCount ? faturamento/validCount : 0;
  var validCountPrev = prev.filter(function(o){ return o.status!=="cancelado"; }).length;
  var ticketPrev = validCountPrev ? faturamentoPrev/validCountPrev : 0;

  var cards = [
    {label:"Faturamento", value:fmtBRL(faturamento), d:delta(faturamento, faturamentoPrev)},
    {label:"Lucro", value:fmtBRL(lucro), d:delta(lucro, lucroPrev), sub: faturamento ? (lucro/faturamento*100).toFixed(1).replace(".",",")+"% de margem no período" : null},
    {label:"A receber", value:fmtBRL(aReceber), d:delta(aReceber, aReceberPrev)},
    {label:"Cancelamentos", value:fmtBRL(canceladosValor), d:delta(canceladosValor, canceladosValorPrev), invert:true},
    {label:"Ticket médio", value:fmtBRL(ticket), d:delta(ticket, ticketPrev)}
  ];
  document.getElementById("vendas-kpi-grid").innerHTML = cards.map(function(c){
    var deltaOk = isFinite(c.d);
    var down = state.orders.length > 0 && deltaOk && (c.invert ? c.d > 0 : c.d < 0);
    var deltaText = !state.orders.length ? "Nenhuma venda ainda" : c.sub ? c.sub : (deltaOk ? fmtPct(c.d) + " vs. período anterior" : "sem dados no período anterior");
    return '<div class="sx-card"><div class="sx-stat__label">'+escapeHtml(c.label)+'</div>' +
      '<div class="sx-stat__value">'+c.value+'</div>' +
      '<div class="sx-stat__delta'+(down?' sx-stat__delta--down':'')+'">'+deltaText+'</div>' +
    '</div>';
  }).join("");
}
function renderPedidosStatusBreakdown(){
  var days = periodDays(state.vendasPeriod);
  var cur = ordersInRange(0, days);
  var total = cur.length;
  var host = document.getElementById("pedidos-status-breakdown");
  if (!total){ host.innerHTML = '<div class="empty">Sem pedidos no período.</div>'; return; }
  host.innerHTML = STATUS_ORDER.map(function(s){
    var group = cur.filter(function(o){ return o.status===s; });
    var value = group.reduce(function(a,o){ return a+o.total; },0);
    var pct = total ? (group.length/total*100) : 0;
    return '<div class="stat-row"><span class="dot" style="background:'+STATUS_COLOR[s]+'"></span>' +
      '<div class="info"><div class="top"><span>'+STATUS_LABEL[s]+'</span><b>'+group.length+' · '+fmtBRL(value)+'</b></div>' +
      '<div class="sx-progress"><span style="width:'+pct.toFixed(1)+'%;background:'+STATUS_COLOR[s]+'"></span></div></div></div>';
  }).join("");
}
function renderPedidosChannelBreakdown(){
  var days = periodDays(state.vendasPeriod);
  var cur = ordersInRange(0, days);
  var total = cur.length;
  var host = document.getElementById("pedidos-channel-breakdown");
  if (!total){ host.innerHTML = '<div class="empty">Sem pedidos no período.</div>'; return; }
  var order = Object.keys(CHANNELS).map(function(k){
    var group = cur.filter(function(o){ return o.channel===k; });
    return {k:k, count:group.length, value:group.reduce(function(a,o){ return a+o.total; },0)};
  }).sort(function(a,b){ return b.value-a.value; });
  host.innerHTML = order.map(function(c){
    var pct = total ? (c.count/total*100) : 0;
    return '<div class="stat-row"><img src="'+CH_ICON[c.k]+'" alt="">' +
      '<div class="info"><div class="top"><span>'+CHANNELS[c.k].name+'</span><b>'+c.count+' · '+fmtBRL(c.value)+'</b></div>' +
      '<div class="sx-progress"><span style="width:'+pct.toFixed(1)+'%"></span></div></div></div>';
  }).join("");
}
function renderVendasDashboard(){
  renderVendasKPIs();
  renderPedidosStatusBreakdown();
  renderPedidosChannelBreakdown();
}

function renderPedidos(){
  var statusF = document.getElementById("pedidos-status").value;
  var channelF = document.getElementById("pedidos-channel").value;
  var q = (document.getElementById("pedidos-search").value||"").trim().toLowerCase();

  var list = state.orders.filter(function(o){
    if (statusF!=="todos" && o.status!==statusF) return false;
    if (channelF!=="todos" && o.channel!==channelF) return false;
    if (q){
      var p = productById(o.productId);
      var hay = (o.client+" "+(p?p.name:(o.title||""))+" "+(o.mlOrderId||"")).toLowerCase();
      if (hay.indexOf(q)===-1) return false;
    }
    return true;
  }).sort(function(a,b){
    if (a.date!==b.date) return a.date<b.date ? 1 : -1;
    return b.hour-a.hour;
  });

  var total = list.length;
  var shown = list.slice(0, 150);

  var rows = shown.map(function(o){
    var p = productById(o.productId);
    return '<tr>' +
      '<td class="sx-muted">'+o.date.split("-").reverse().join("/")+'</td>' +
      '<td class="prod"><span>'+prodThumb(p)+'</span>'+(p?escapeHtml(p.name):escapeHtml(o.title||"Produto removido"))+'</td>' +
      '<td>'+escapeHtml(o.client)+'</td>' +
      '<td><img class="mk" src="'+CH_ICON[o.channel]+'" alt="'+CHANNELS[o.channel].name+'"></td>' +
      '<td>'+fmtBRL(o.total)+'</td>' +
      (o.mlOrderId
        ? '<td><span class="sx-badge sx-badge--'+STATUS_BADGE[o.status]+'"><i class="sx-dot"></i>'+escapeHtml((o.shipping && ML_SHIP_LABEL[o.shipping.status]) || STATUS_LABEL[o.status])+'</span></td>'
        : '<td><select class="sx-select" data-order-status="'+o.id+'" style="padding:7px 32px 7px 10px;font-size:12.5px">' +
            Object.keys(STATUS_LABEL).map(function(s){ return '<option value="'+s+'"'+(s===o.status?" selected":"")+'>'+STATUS_LABEL[s]+'</option>'; }).join("") +
          '</select></td>') +
      '<td class="ord-act">' + (o.mlOrderId
        ? (o.shipping && o.status !== "cancelado" ? '<button type="button" class="sx-btn sx-btn--ghost sx-btn--sm" data-label="'+escapeHtml(o.shipping.id)+'"'+(o.shipping.status === "ready_to_ship" || o.shipping.status === "shipped" ? '' : ' title="A etiqueta é liberada quando o pedido está pronto para envio"')+'>Etiqueta</button>' : '') +
          (o.status !== "cancelado" ? '<button type="button" class="sx-btn sx-btn--sm" data-supplier="'+escapeHtml(o.id)+'">Pedir no fornecedor</button>' : '')
        : '') + '</td>' +
    '</tr>';
  }).join("");

  document.querySelector("#pedidos-table tbody").innerHTML = rows || '<tr><td colspan="7" class="empty">'+(state.orders.length ? 'Nenhum pedido encontrado com esses filtros.' : 'Nenhum pedido ainda. Os pedidos do Mercado Livre vão aparecer aqui.')+'</td></tr>';
  document.getElementById("pedidos-count").textContent = total + (total===1?" pedido":" pedidos") + (total>150 ? " (mostrando os 150 mais recentes)" : "");
}
function changeOrderStatus(orderId, newStatus){
  var o = state.orders.find(function(x){ return x.id===orderId; });
  if (!o) return;
  o.status = newStatus;
  toast("Status do pedido atualizado para “"+STATUS_LABEL[newStatus]+"”.");
}

/* ================= conta (login via Supabase Auth) ================= */
var sbClient = null;
function sb(){
  if (sbClient) return sbClient;
  if (!window.supabase || !window.supabase.createClient) return null;
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  // se o servidor disser que o login acabou, renova e tenta de novo uma vez;
  // se não der, volta para a tela de login com uma mensagem clara
  var rawInvoke = sbClient.functions.invoke.bind(sbClient.functions);
  // "login inválido" pode vir como 401, 403 ou como corpo {error:"unauthorized"} em qualquer status
  var isUnauth = function(r){
    if (!r) return Promise.resolve(false);
    if (r.data && r.data.error === "unauthorized") return Promise.resolve(true);
    var ctx = r.error && r.error.context;
    if (!ctx) return Promise.resolve(false);
    if (ctx.status === 401 || ctx.status === 403) return Promise.resolve(true);
    if (typeof ctx.clone !== "function") return Promise.resolve(false);
    return ctx.clone().json().then(function(b){ return !!(b && b.error === "unauthorized"); }).catch(function(){ return false; });
  };
  sbClient.functions.invoke = function(name, opts){
    return rawInvoke(name, opts).then(function(r){
      if (name === "sx-signup") return r;
      return isUnauth(r).then(function(bad){ return bad ? retry(r) : r; });
    });
    function retry(r){
      return sbClient.auth.refreshSession().then(function(rs){
        if (rs && rs.data && rs.data.session) return rawInvoke(name, opts);
        throw new Error("session_lost");
      }).then(function(r2){
        return isUnauth(r2).then(function(bad){ if (bad) throw new Error("session_lost"); return r2; });
      }).catch(function(){
        sessionLost();
        return { data: { ok: false, error: "session_lost", message: "Seu login terminou. Entre de novo." }, error: null };
      });
    }
  };
  return sbClient;
}
var account = { user: null, name: "", email: "" };
function sessionLost(){
  if (!account.user) return;
  var c = sbClient;
  (c ? c.auth.signOut({ scope: "local" }) : Promise.resolve()).catch(function(){}).then(function(){
    onSignedOut();
    var skew = clockSkewMinutes();
    showAuthMsg(skew != null && Math.abs(skew) > 10
      ? "Seu login terminou. A data e a hora deste computador estão erradas (diferença de " + Math.round(Math.abs(skew)/60) + "h), o que derruba o login. Ajuste o relógio para automático e entre de novo."
      : "Seu login terminou. Entre de novo.");
  });
}
// diferença (em minutos) entre o relógio deste computador e o do servidor, medida a cada chamada
var serverClockSkew = null;
function clockSkewMinutes(){ return serverClockSkew; }
// o login acabou de ser emitido pelo servidor: compara a hora dele (iat) com o relógio local
function measureClock(event, session){
  if (!session || !session.access_token || (event !== "SIGNED_IN" && event !== "TOKEN_REFRESHED")) return;
  try {
    var part = session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    var iat = JSON.parse(atob(part + "===".slice((part.length + 3) % 4))).iat;
    if (iat) serverClockSkew = (Date.now() - iat * 1000) / 60000;
  } catch(e){}
}
var authMode = "login";

var AUTH_ERRORS = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar. O link de confirmação foi enviado para a sua caixa de entrada."],
  [/already registered|already been registered|user already exists/i, "Já existe uma conta com esse e-mail. Use a aba Entrar."],
  [/password should be at least|password.*6/i, "A senha precisa ter pelo menos 6 caracteres."],
  [/rate limit|too many|security purposes/i, "Muitas tentativas seguidas. Espere um minuto e tente de novo."],
  [/invalid.*email|email.*invalid/i, "Esse e-mail não parece válido. Confira e tente de novo."],
  [/failed to fetch|network/i, "Sem conexão com o servidor. Verifique sua internet e tente de novo."]
];
function authErrorText(err){
  var m = (err && (err.message || err.error_description)) || String(err || "");
  for (var i=0;i<AUTH_ERRORS.length;i++) if (AUTH_ERRORS[i][0].test(m)) return AUTH_ERRORS[i][1];
  return "Não foi possível concluir agora (" + m + "). Tente de novo.";
}
function showAuthMsg(text, ok){
  var el = document.getElementById("auth-msg");
  el.textContent = text;
  el.classList.toggle("is-ok", !!ok);
  el.hidden = !text;
}
// link de recuperação de senha: o Supabase devolve com #...type=recovery no endereço
var recovering = /type=recovery/.test(location.hash);
var AUTH_TEXTS = {
  login:   ["Entrar", "Acesse seu painel de vendas.", "Entrar"],
  signup:  ["Criar conta", "Comece a vender com o catálogo do seu fornecedor.", "Criar conta"],
  forgot:  ["Recuperar senha", "Digite o e-mail da sua conta. Vamos mandar um link para você criar uma senha nova.", "Enviar link"],
  recover: ["Criar nova senha", "Escolha uma senha nova para a sua conta.", "Salvar nova senha"]
};
function setAuthMode(mode){
  authMode = mode;
  var t = AUTH_TEXTS[mode] || AUTH_TEXTS.login;
  document.querySelectorAll("#auth-tabs .sx-tab").forEach(function(b){ b.setAttribute("aria-selected", b.getAttribute("data-auth-mode")===mode ? "true" : "false"); });
  document.getElementById("auth-tabs").hidden = mode === "forgot" || mode === "recover";
  document.getElementById("auth-name-row").hidden = mode !== "signup";
  document.getElementById("auth-email").parentNode.hidden = mode === "recover";
  document.getElementById("auth-password-row").hidden = mode === "forgot";
  document.getElementById("auth-password2-row").hidden = mode !== "recover";
  document.getElementById("auth-password-label").textContent = mode === "recover" ? "Nova senha" : "Senha";
  document.getElementById("auth-forgot").hidden = mode !== "login";
  document.getElementById("auth-back").hidden = mode !== "forgot";
  document.getElementById("auth-title").textContent = t[0];
  document.getElementById("auth-sub").textContent = t[1];
  document.getElementById("auth-submit").textContent = t[2];
  document.getElementById("auth-password").setAttribute("autocomplete", mode === "login" ? "current-password" : "new-password");
  if (mode === "recover"){ document.getElementById("auth-password").value = ""; document.getElementById("auth-password2").value = ""; }
  showAuthMsg("");
}
function showRecoverForm(){
  document.getElementById("auth-gate").hidden = false;
  document.querySelector("#auth-gate .auth-card").hidden = false;
  document.getElementById("auth-pending").hidden = true;
  setAuthMode("recover");
}
function submitForgot(client){
  var email = document.getElementById("auth-email").value.trim();
  if (!email){ showAuthMsg("Digite o e-mail da sua conta."); return; }
  var btn = document.getElementById("auth-submit"); btn.disabled = true;
  client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function(res){
    btn.disabled = false;
    if (res.error){ showAuthMsg(authErrorText(res.error)); return; }
    showAuthMsg("Se existir uma conta com esse e-mail, o link para criar uma senha nova chega em alguns minutos. Confira também a caixa de spam.", true);
  }).catch(function(e){ btn.disabled = false; showAuthMsg(authErrorText(e)); });
}
function submitRecover(client){
  var p1 = document.getElementById("auth-password").value, p2 = document.getElementById("auth-password2").value;
  if (p1.length < 6){ showAuthMsg("A senha precisa ter pelo menos 6 caracteres."); return; }
  if (p1 !== p2){ showAuthMsg("As duas senhas não estão iguais."); return; }
  var btn = document.getElementById("auth-submit"); btn.disabled = true;
  client.auth.updateUser({ password: p1 }).then(function(res){
    btn.disabled = false;
    if (res.error){ showAuthMsg(/session|jwt|expired|missing/i.test(res.error.message||"") ? "Esse link expirou. Peça um novo em “Esqueci minha senha”." : authErrorText(res.error)); return; }
    recovering = false;
    try { history.replaceState(null, "", location.pathname); } catch(e){}
    return client.auth.getSession().then(function(r){
      var session = r && r.data && r.data.session;
      setAuthMode("login");
      if (session) onSignedIn(session);
      else showAuthGate("Senha alterada! Entre com a senha nova.", true);
      if (session && !isPendingUser(session.user)) toast("Senha alterada com sucesso.");
    });
  }).catch(function(e){ btn.disabled = false; showAuthMsg(authErrorText(e)); });
}
// conta criada, mas acesso ainda não liberado: mostra o aviso e não abre o sistema
var pendingShown = false;
function showPendingAccess(){
  pendingShown = true;
  document.getElementById("auth-gate").hidden = false;
  document.querySelector("#auth-gate .auth-card").hidden = true;
  document.getElementById("auth-pending").hidden = false;
}
function isPendingUser(u){ return !!(u && u.app_metadata && u.app_metadata.access === "pending"); }
function showAuthGate(message, ok){
  document.getElementById("auth-gate").hidden = false;
  if (pendingShown) return;
  if (message) showAuthMsg(message, ok);
}
function submitAuth(ev){
  ev.preventDefault();
  var client = sb();
  if (!client){ showAuthMsg("Não consegui carregar o login. Verifique sua internet e recarregue a página."); return; }
  if (authMode === "forgot") return submitForgot(client);
  if (authMode === "recover") return submitRecover(client);
  var email = document.getElementById("auth-email").value.trim();
  var password = document.getElementById("auth-password").value;
  var name = document.getElementById("auth-name").value.trim();
  if (!email || !password){ showAuthMsg("Preencha e-mail e senha."); return; }
  if (authMode === "signup" && password.length < 6){ showAuthMsg("A senha precisa ter pelo menos 6 caracteres."); return; }
  var btn = document.getElementById("auth-submit");
  btn.disabled = true;
  showAuthMsg("");
  var signIn = function(){ return client.auth.signInWithPassword({ email: email, password: password }); };
  // Cadastro: o servidor cria a conta já confirmada (sem e-mail de confirmação) e entramos em seguida
  var p = authMode === "signup"
    ? client.functions.invoke("sx-signup", { method: "POST", body: { email: email, password: password, name: name } }).then(function(r){
        var d = r.data;
        if (d && d.ok){ showPendingAccess(); return { data: {} }; }
        if (d && d.message) return { error: { message: d.message, friendly: true } };
        return { error: r.error || { message: "Não consegui criar a conta agora. Tente de novo em instantes.", friendly: true } };
      })
    : signIn();
  var label = btn.textContent;
  if (authMode === "signup") btn.textContent = "Criando sua conta…";
  p.then(function(res){
    btn.disabled = false; btn.textContent = label;
    if (res.error){ showAuthMsg(res.error.friendly ? res.error.message : authErrorText(res.error)); return; }
    // a sessão chega pelo onAuthStateChange
  }).catch(function(e){ btn.disabled = false; btn.textContent = label; showAuthMsg(authErrorText(e)); });
}
function initials(name){
  var parts = String(name||"").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "··";
  return ((parts[0][0]||"") + (parts.length>1 ? parts[parts.length-1][0] : (parts[0][1]||""))).toUpperCase();
}
function renderAccount(){
  var first = (account.name || "").split(/\s+/)[0] || "lojista";
  document.getElementById("greeting-name").textContent = first;
  ["header-avatar","profile-avatar"].forEach(function(id){ document.getElementById(id).textContent = initials(account.name || account.email); });
  document.getElementById("header-avatar").title = account.email ? "Minha conta (" + account.email + ")" : "Minha conta";
  document.getElementById("profile-name").textContent = account.name || "—";
  document.getElementById("profile-email").textContent = account.email || "";
  document.getElementById("account-name").textContent = account.name || "—";
  document.getElementById("account-email").textContent = account.email || "";
}
function onSignedIn(session){
  var u = session.user;
  if (recovering){ showRecoverForm(); return; }
  if (isPendingUser(u)){
    showPendingAccess();
    var c = sb(); if (c) c.auth.signOut({ scope: "local" }).catch(function(){});
    return;
  }
  if (account.user && account.user.id === u.id) return;
  account.user = u;
  account.email = u.email || "";
  account.name = (u.user_metadata && u.user_metadata.name) || account.email.split("@")[0];
  document.getElementById("auth-gate").hidden = true;
  document.getElementById("nav-clientes").hidden = !isAdmin();
  loadUserState(u.id);
  renderAccount();
  renderPainel();
  mlo.orders = simOrdersMapped(); state.orders = loadOrders(); renderVendasCount();
  refreshMlStatus().then(function(){ handleMlReturn(); loadMlOrders(); });
  startCatalog();
}
function onSignedOut(){
  account = { user: null, name: "", email: "" };
  document.getElementById("nav-clientes").hidden = true;
  cli.users = []; cli.loaded = false;
  if (currentPage() === "clientes") goToPage("painel");
  ml.account = null; ml.loaded = false;
  mlo.orders = []; mlo.raw = []; mlo.loaded = false; mlo.fetchedAt = null; mlo.error = null;
  state.products = []; state.orders = [];
  document.getElementById("auth-password").value = "";
  setAuthMode("login");
  showAuthGate();
}
function logout(){
  var client = sb();
  if (!client) return;
  client.auth.signOut({ scope: "local" }).catch(function(){}).then(function(){ onSignedOut(); });
}
function startAuth(){
  var client = sb();
  if (!client){ showAuthGate("Não consegui carregar o login. Verifique sua internet e recarregue a página."); return; }
  client.auth.onAuthStateChange(function(event, session){
    measureClock(event, session);
    if (event === "PASSWORD_RECOVERY") recovering = true;
    if (session && session.user) onSignedIn(session);
    else if (event === "SIGNED_OUT") onSignedOut();
  });
  var linkErr = /error_code=otp_expired|error=access_denied/.test(location.hash);
  if (linkErr){ recovering = false; try { history.replaceState(null, "", location.pathname); } catch(e){} }
  client.auth.getSession().then(function(res){
    var session = res && res.data && res.data.session;
    if (session) onSignedIn(session);
    else if (linkErr){ setAuthMode("forgot"); showAuthGate("Esse link expirou ou já foi usado. Digite seu e-mail para receber um novo."); }
    else showAuthGate();
  }).catch(function(){ showAuthGate("Sem conexão com o servidor. Verifique sua internet e recarregue a página."); });
}

/* ================= integrações ================= */
var ml = { account: null, loaded: false, error: null, busy: false, notConfigured: false };
var ML_RETURN_MSGS = {
  denied: "A conexão foi cancelada na tela do Mercado Livre.",
  invalid_request: "O Mercado Livre não devolveu os dados da autorização. Tente conectar de novo.",
  invalid_state: "Esse link de autorização não é mais válido. Clique em Conectar de novo.",
  expired_state: "A autorização demorou mais de 10 minutos e expirou. Clique em Conectar de novo.",
  not_configured: "A integração com o Mercado Livre ainda não foi configurada no servidor.",
  token_exchange: "O Mercado Livre recusou a autorização. Confira se o aplicativo do ML está com o endereço de retorno certo e tente de novo.",
  no_user: "Não consegui identificar a sua conta do Mercado Livre. Tente de novo.",
  save_failed: "A conta foi autorizada, mas não consegui salvar a conexão. Tente de novo."
};
var pendingMlReturn = null;
(function captureMlReturn(){
  try {
    var q = new URLSearchParams(location.search);
    if (!q.get("ml")) return;
    pendingMlReturn = { status: q.get("ml"), reason: q.get("reason") || "" };
    q.delete("ml"); q.delete("reason");
    var clean = location.pathname + (q.toString() ? "?" + q.toString() : "") + location.hash;
    history.replaceState(null, "", clean);
  } catch (e) {}
})();
function handleMlReturn(){
  if (!pendingMlReturn) return;
  var r = pendingMlReturn; pendingMlReturn = null;
  goToPage("integracoes");
  if (r.status === "connected") toast("Mercado Livre conectado" + (ml.account && ml.account.nickname ? " (" + ml.account.nickname + ")." : "."));
  else toast(ML_RETURN_MSGS[r.reason] || "Não foi possível conectar o Mercado Livre. Tente de novo.", true);
}
function refreshMlStatus(){
  var client = sb();
  if (!client || !account.user){ ml.loaded = true; renderIntegracoes(); return Promise.resolve(); }
  return client.from("ml_accounts").select("nickname, site_id, status, connected_at").maybeSingle().then(function(res){
    ml.loaded = true;
    ml.error = res.error ? res.error.message : null;
    ml.account = res.data || null;
    renderIntegracoes();
    renderMlMini();
    renderOnboarding();
  });
}
function functionErrorCode(error){
  if (!error) return Promise.resolve(null);
  var ctx = error.context;
  if (ctx && typeof ctx.json === "function") {
    return ctx.json().then(function(b){ return (b && b.error) || "http_" + ctx.status; }).catch(function(){ return "http_" + (ctx.status || "erro"); });
  }
  return Promise.resolve(/fetch|network/i.test(error.message||"") ? "network" : "unknown");
}
function connectMl(){
  var client = sb();
  if (!client || ml.busy) return;
  ml.busy = true; renderIntegracoes();
  client.functions.invoke("ml-connect", { method: "POST", body: {} }).then(function(res){
    if (res.data && res.data.url){ location.href = res.data.url; return; }
    return functionErrorCode(res.error).then(function(code){
      ml.busy = false;
      if (code === "ml_not_configured"){ ml.notConfigured = true; renderIntegracoes(); return; }
      renderIntegracoes();
      toast(code === "network" ? "Sem conexão com o servidor. Tente de novo." :
            code === "unauthorized" || code === "http_401" ? "Sua sessão expirou. Entre de novo para conectar." :
            "Não foi possível abrir a conexão com o Mercado Livre agora. Tente de novo.", true);
    });
  }).catch(function(){ ml.busy = false; renderIntegracoes(); toast("Sem conexão com o servidor. Tente de novo.", true); });
}
function disconnectMl(){
  var client = sb();
  if (!client || ml.busy) return;
  if (!window.confirm("Desconectar a conta do Mercado Livre? O Sellex deixa de ter acesso a ela até você conectar de novo.")) return;
  ml.busy = true; renderIntegracoes();
  client.functions.invoke("ml-disconnect", { method: "POST", body: {} }).then(function(res){
    ml.busy = false;
    if (res.error){ renderIntegracoes(); toast("Não consegui desconectar agora. Tente de novo.", true); return; }
    ml.account = null;
    renderIntegracoes(); renderMlMini();
    toast("Mercado Livre desconectado.");
  }).catch(function(){ ml.busy = false; renderIntegracoes(); toast("Sem conexão com o servidor. Tente de novo.", true); });
}
function renderMlMini(){
  var el = document.getElementById("ml-mini");
  if (!el) return;
  if (ml.account){
    el.innerHTML = '<img src="'+CH_ICON.ml+'" alt=""><span class="grow">Mercado Livre: <b>'+escapeHtml(ml.account.nickname || "conectado")+'</b></span><span class="sx-badge sx-badge--success"><i class="sx-dot"></i>Conectado</span>';
  } else {
    el.innerHTML = '<img src="'+CH_ICON.ml+'" alt=""><span class="grow">Mercado Livre não conectado</span><a class="sx-btn sx-btn--sm" href="#" data-goto="integracoes">Conectar</a>';
  }
}
function fmtDateBR(iso){
  try { return new Date(iso).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}); } catch(e){ return ""; }
}
function renderIntegracoes(){
  var host = document.getElementById("int-marketplaces");
  if (!host) return;
  var mlCard;
  if (!ml.loaded){
    mlCard = '<p class="int-desc">Verificando a conexão…</p>';
  } else if (ml.account){
    mlCard =
      '<div class="int-meta"><span>Conta: <b>'+escapeHtml(ml.account.nickname || "—")+'</b></span>' +
      (ml.account.connected_at ? '<span>Conectada em '+escapeHtml(fmtDateBR(ml.account.connected_at))+'</span>' : '') + '</div>' +
      '<div class="int-actions"><button class="sx-btn sx-btn--ghost sx-btn--sm" type="button" data-int="ml-disconnect" '+(ml.busy?'disabled':'')+'>'+(ml.busy?'Desconectando…':'Desconectar')+'</button></div>';
  } else {
    mlCard =
      '<p class="int-desc">Conecte sua conta para publicar os produtos do Sellex como anúncios e receber os pedidos aqui. Você autoriza na página do próprio Mercado Livre; o Sellex não vê sua senha.</p>' +
      (ml.notConfigured ? '<p class="int-note">A integração ainda não foi ativada no servidor do Sellex. Assim que for, este botão passa a funcionar.</p>' : '') +
      (ml.error ? '<p class="int-note">Não consegui verificar a conexão agora.</p>' : '') +
      '<div class="int-actions"><button class="sx-btn" type="button" data-int="ml-connect" '+(ml.busy?'disabled':'')+'><svg><use href="#plug"/></svg>'+(ml.busy?'Abrindo o Mercado Livre…':'Conectar Mercado Livre')+'</button></div>';
  }
  var badge = ml.account
    ? '<span class="sx-badge sx-badge--success"><i class="sx-dot"></i>Conectado</span>'
    : '<span class="sx-badge"><i class="sx-dot"></i>Não conectado</span>';
  var others = [["shopee","Shopee"],["amazon","Amazon"],["shein","Shein"]].map(function(c){
    return '<div class="sx-card int-card">' +
      '<div class="int-head"><img class="int-logo" src="'+CH_ICON[c[0]]+'" alt=""><div class="int-title"><div class="int-name">'+c[1]+'</div><span class="sx-badge"><i class="sx-dot"></i>Não conectado</span></div></div>' +
      '<p class="int-desc"><span class="int-avail">Já disponível para integração.</span> Conecte sua conta da '+c[1]+' para publicar seus produtos e receber os pedidos aqui.</p>' +
      '<div class="int-actions"><button class="sx-btn" type="button" data-int="other" data-int-key="'+c[0]+'" data-int-name="'+c[1]+'"><svg><use href="#plug"/></svg>Conectar '+c[1]+'</button></div>' +
    '</div>';
  }).join("");
  host.innerHTML =
    '<div class="sx-card int-card">' +
      '<div class="int-head"><img class="int-logo" src="'+CH_ICON.ml+'" alt=""><div class="int-title"><div class="int-name">Mercado Livre</div>'+badge+'</div></div>' +
      mlCard +
    '</div>' + others;

  renderSupplierAddress();
}
var SUPPLIER_ADDRESS = [
  { k: "cep", label: "CEP", v: "01022-050" },
  { k: "rua", label: "Rua / Número", v: "Parque Dom Pedro II, 268" },
  { k: "comp", label: "Complemento", v: "Apto 22" },
  { k: "bairro", label: "Bairro", v: "Centro" },
  { k: "cidade", label: "Cidade", v: "São Paulo" },
  { k: "uf", label: "UF", v: "SP" }
];
function supplierAddressText(){
  var a = {}; SUPPLIER_ADDRESS.forEach(function(x){ a[x.k] = x.v; });
  return a.rua + " - " + a.comp + ", " + a.bairro + ", " + a.cidade + " - " + a.uf + ", CEP " + a.cep;
}
function renderSupplierAddress(){
  var grid = document.getElementById("addr-grid");
  if (!grid || grid.childElementCount) return;
  grid.innerHTML = SUPPLIER_ADDRESS.map(function(x, i){
    return '<div class="addr-field"><div><span>'+escapeHtml(x.label)+'</span><b>'+escapeHtml(x.v)+'</b></div>' +
      '<button type="button" class="addr-copy" data-copy="'+i+'"><svg><use href="#copy"/></svg><span>Copiar</span></button></div>';
  }).join("");
}
function copyText(text){
  if (navigator.clipboard && window.isSecureContext){
    return navigator.clipboard.writeText(text).catch(function(){ return legacyCopy(text); });
  }
  return legacyCopy(text);
}
function legacyCopy(text){
  return new Promise(function(resolve, reject){
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
    ta.remove(); ok ? resolve() : reject(new Error("copy"));
  });
}
function flashCopied(btn){
  var span = btn.querySelector("span"), old = span.textContent;
  btn.classList.add("is-done"); span.textContent = "Copiado";
  setTimeout(function(){ btn.classList.remove("is-done"); span.textContent = old; }, 1600);
}

/* ---------- popup com QR code para conectar marketplace (SIMULADO) ---------- */
var QR_LOADING_MS = 2000, QR_TTL_S = 120;
var qrState = { key: null, name: null, timer: null, loadTimer: null, left: 0 };
function qrSvg(text){
  if (typeof window.qrcode !== "function") return null;
  var q = window.qrcode(0, "M");
  q.addData(text); q.make();
  var n = q.getModuleCount(), quiet = 2, size = n + quiet * 2, d = "";
  for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + (c + quiet) + " " + (r + quiet) + "h1v1h-1z";
  return '<svg viewBox="0 0 '+size+' '+size+'" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="'+size+'" height="'+size+'" fill="#fff"/><path d="'+d+'" fill="#06070D"/></svg>';
}
function qrLink(key){
  var token = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  var base = location.protocol === "file:" ? "https://usuarios.sellexbrasil.com.br/" : location.origin + location.pathname;
  return base + "?connect=" + encodeURIComponent(key) + "&code=" + token;
}
function openQrModal(key, name){
  qrState.key = key; qrState.name = name;
  document.getElementById("qr-logo").src = CH_ICON[key] || "";
  document.getElementById("qr-title").textContent = name;
  document.getElementById("qr-steps").innerHTML =
    '<li>Abra a câmera do seu celular</li>' +
    '<li>Aponte para o QR code acima</li>' +
    '<li>Entre na sua conta da '+escapeHtml(name)+' e autorize o Sellex</li>';
  document.getElementById("qr-modal").classList.add("is-open");
  qrGenerate();
}
function qrGenerate(){
  clearInterval(qrState.timer); clearTimeout(qrState.loadTimer);
  var stage = document.getElementById("qr-stage");
  stage.className = "qr-stage is-loading";
  stage.innerHTML = '<div class="qr-skeleton"><span class="qr-spin"></span></div><p>Gerando QR code seguro…</p>';
  document.getElementById("qr-foot").innerHTML = "";
  qrState.loadTimer = setTimeout(function(){
    var svg = qrSvg(qrLink(qrState.key));
    stage.className = "qr-stage is-ready";
    stage.innerHTML = svg ? '<div class="qr-code">'+svg+'<img class="qr-badge" src="'+(CH_ICON[qrState.key]||"")+'" alt=""></div>'
                          : '<p class="int-note">Não consegui gerar o QR code agora.</p>';
    qrState.left = QR_TTL_S;
    qrTick();
    qrState.timer = setInterval(qrTick, 1000);
  }, QR_LOADING_MS);
}
function qrTick(){
  var foot = document.getElementById("qr-foot");
  if (qrState.left <= 0){
    clearInterval(qrState.timer);
    var stage = document.getElementById("qr-stage");
    stage.classList.add("is-expired");
    foot.innerHTML = '<span class="qr-exp">QR code expirado</span><button type="button" class="sx-btn sx-btn--sm" data-qr="new">Gerar novo código</button>';
    return;
  }
  var m = Math.floor(qrState.left / 60), s = qrState.left % 60;
  foot.innerHTML = '<span class="qr-wait"><i></i>Aguardando leitura · expira em '+m+':'+(s<10?"0":"")+s+'</span><button type="button" class="qr-link" data-qr="new">Gerar novo código</button>';
  qrState.left--;
}
function closeQrModal(){
  clearInterval(qrState.timer); clearTimeout(qrState.loadTimer);
  document.getElementById("qr-modal").classList.remove("is-open");
}
function initQrModal(){
  var modal = document.getElementById("qr-modal");
  modal.addEventListener("click", function(e){
    if (e.target === modal){ closeQrModal(); return; }
    var b = e.target.closest("[data-qr]"); if (!b) return;
    if (b.getAttribute("data-qr") === "close") closeQrModal();
    if (b.getAttribute("data-qr") === "new") qrGenerate();
  });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && modal.classList.contains("is-open")) closeQrModal(); });
}

/* ================= vendas (operação de cada venda do ML) ================= */
var vd = { tab: "toship" };
var C7_DONE_KEY = function(){ return "sx_c7_done_v1:" + (account.user ? account.user.id : "anon"); };
function c7Done(){ return loadJSON(C7_DONE_KEY(), {}) || {}; }
function setC7Done(orderId, on){
  var m = c7Done(); if (on) m[orderId] = new Date().toISOString(); else delete m[orderId];
  saveJSON(C7_DONE_KEY(), m);
}
function vdGroup(o){
  if (o.status === "cancelado") return "cancelled";
  if (o.shipping && o.shipping.status === "delivered") return "delivered";
  if (o.shipping && (o.shipping.status === "shipped" || o.shipping.status === "not_delivered")) return "shipped";
  return "toship";
}
// vendas geradas pelo modo demonstração (5 cliques na logo) também aparecem aqui
var DEMO_CITIES = [["São Paulo","BR-SP"],["Rio de Janeiro","BR-RJ"],["Belo Horizonte","BR-MG"],["Recife","BR-PE"],["Salvador","BR-BA"],["Fortaleza","BR-CE"],["Curitiba","BR-PR"],["Porto Alegre","BR-RS"],["Goiânia","BR-GO"],["Brasília","BR-DF"],["Manaus","BR-AM"],["Campinas","BR-SP"]];
function demoToVenda(o){
  var h = Math.abs(hashSeed(String(o.id)));
  var p = productById(o.productId);
  var city = DEMO_CITIES[h % DEMO_CITIES.length];
  var ship = o.status === "cancelado" ? "cancelled" : o.status === "concluido" ? "delivered" : o.status === "enviado" ? "shipped" : (h % 3 === 0 ? "handling" : "ready_to_ship");
  var title = p ? (p.title || p.name) : (o.title || "Produto");
  return Object.assign({}, o, {
    demo: true, mlOrderId: String(o.id).replace(/^\D+/, "") || String(o.id), title: title,
    sku: (p && p.sku) || null, mlStatus: o.status === "cancelado" ? "cancelled" : "paid",
    items: [{ item_id: p ? p.mlItemId || null : null, title: title, sku: (p && p.sku) || null, qty: o.qty, unit_price: o.qty ? o.total / o.qty : o.total, sale_fee: 0 }],
    shipping: { id: "DEMOSHIP" + (h % 100000000), status: ship, city: city[0], state: city[1] }
  });
}
function vdSource(){
  if (mlo.orders.length) return mlo.orders;
  var demo = loadJSON(DEMO_ORDERS_KEY, null);
  return Array.isArray(demo) ? demo.map(demoToVenda) : [];
}
function vdOrders(){ return vdSource().slice().sort(function(a,b){ return a.date < b.date ? 1 : a.date > b.date ? -1 : b.hour - a.hour; }); }
// ---- vendas simuladas (só administrador, para testar o fluxo sem comprar) ----
var SIM_KEY = function(){ return "sx_sim_orders_v1:" + (account.user ? account.user.id : "anon"); };
function simRaw(){ var a = loadJSON(SIM_KEY(), []); return Array.isArray(a) ? a : []; }
function simOrdersMapped(){ return simRaw().map(function(r){ var o = mapMlOrder(r); o.sim = true; return o; }); }
function refreshSim(){
  mlo.orders = simOrdersMapped().concat(mlo.raw.map(mapMlOrder));
  state.orders = loadOrders();
  renderVendasCount(); renderVendas();
}
function simulateSale(){
  var pool = state.products.filter(function(p){ return p.mlItemId; });
  if (!pool.length) pool = state.products.slice();
  var p = pool[Math.floor(Math.random() * pool.length)];
  var cities = [["Recife","BR-PE"],["São Paulo","BR-SP"],["Salvador","BR-BA"],["Fortaleza","BR-CE"],["Belo Horizonte","BR-MG"],["Curitiba","BR-PR"]];
  var buyers = ["MARIA.SOUZA","JOAO_PE","CARLA.M","PEDRO77","ANA.BEATRIZ","LUCAS.SILVA"];
  var c = cities[Math.floor(Math.random() * cities.length)];
  var qty = Math.random() < 0.8 ? 1 : 2;
  var price = p ? Number(p.price) || 50 : 59.9;
  var id = "SIM" + String(Date.now()).slice(-9);
  var raw = {
    id: id, pack_id: null, date: new Date().toISOString(), status: "paid", total: Math.round(price * qty * 100) / 100,
    buyer: buyers[Math.floor(Math.random() * buyers.length)],
    items: [{ item_id: p ? (p.mlItemId || "SIMITEM_" + p.id) : "SIMITEM", title: p ? (p.title || p.name) : "Produto de teste", sku: p ? p.sku : null,
      qty: qty, unit_price: price, sale_fee: Math.round(price * 0.12 * 100) / 100 }],
    shipping: { id: "SIMSHIP" + id.slice(3), status: "ready_to_ship", city: c[0], state: c[1] }
  };
  if (p && !p.mlItemId){ raw.items[0].item_id = null; }
  var list = simRaw(); list.unshift(raw); saveJSON(SIM_KEY(), list.slice(0, 30));
  refreshSim();
  if (p && !p.mlItemId){ var o = mlo.orders[0]; if (o){ o.productId = p.id; o.unitCost = p.cost != null ? p.cost : null; o.sku = p.sku || null; } renderVendas(); }
  toast("Venda simulada criada" + (p ? ": " + (p.title || p.name) : "") + ".");
}
function simSetShip(id, status){
  var list = simRaw();
  list.forEach(function(r){ if ("ml_" + r.id === id){ if (status === "cancelled"){ r.status = "cancelled"; r.shipping.status = "cancelled"; } else { r.status = "paid"; r.shipping.status = status; } } });
  saveJSON(SIM_KEY(), list); refreshSim();
}
function simRemove(id){
  saveJSON(SIM_KEY(), simRaw().filter(function(r){ return "ml_" + r.id !== id; }));
  setC7Done(id, false); refreshSim(); toast("Venda simulada removida.");
}
function renderVendasCount(){
  var el = document.getElementById("nav-vendas-count"); if (!el) return;
  var n = vdSource().filter(function(o){ return vdGroup(o) === "toship" && o.mlStatus !== "payment_required"; }).length;
  el.hidden = !n; el.textContent = n > 99 ? "99+" : String(n);
}
function renderVendas(){
  var host = document.getElementById("vd-list"); if (!host) return;
  var syncEl = document.getElementById("vendas-sync");
  var bar = document.getElementById("pedidos-sync");
  renderMlOrdersBar();
  if (syncEl && bar) syncEl.innerHTML = bar.innerHTML.replace('id="pedidos-refresh"', 'id="vendas-refresh"') +
    (isAdmin() ? '<button type="button" class="sx-btn sx-btn--sm" id="vendas-simulate"><svg><use href="#plus"/></svg>Simular venda</button>' : '');
  var all = vdOrders(), done = c7Done();
  var groups = { toship: 0, shipped: 0, delivered: 0, cancelled: 0 };
  all.forEach(function(o){ groups[vdGroup(o)]++; });
  var pendingC7 = all.filter(function(o){ return vdGroup(o) === "toship" && !done[o.id]; }).length;
  var revenue = all.filter(function(o){ return o.status !== "cancelado"; }).reduce(function(a,o){ return a + o.total; }, 0);
  var withCost = all.filter(function(o){ return o.status !== "cancelado" && o.unitCost != null; });
  var profit = withCost.reduce(function(a,o){ return a + profitOfOrder(o); }, 0);
  document.getElementById("vd-kpis").innerHTML = [
    { l: "A enviar", v: fmtInt(groups.toship), warn: groups.toship > 0 },
    { l: "Falta pedir no fornecedor", v: fmtInt(pendingC7), warn: pendingC7 > 0 },
    { l: "Faturamento (90 dias)", v: fmtBRL(revenue) },
    { l: "Lucro (vendas do Sellex)", v: withCost.length ? fmtBRL(profit) : "—" }
  ].map(function(c){ return '<div class="sx-card"><div class="sx-stat__label">'+c.l+'</div><div class="sx-stat__value"'+(c.warn?' style="color:#FFD66B"':'')+'>'+c.v+'</div></div>'; }).join("");
  document.querySelectorAll("#vd-tabs .sx-tab").forEach(function(b){
    var k = b.getAttribute("data-vd"), n = k === "all" ? all.length : groups[k];
    b.setAttribute("aria-selected", k === vd.tab ? "true" : "false");
    if (!b.getAttribute("data-base")) b.setAttribute("data-base", b.textContent.trim());
    b.innerHTML = escapeHtml(b.getAttribute("data-base")) + (n ? ' <span class="vd-n">'+n+'</span>' : '');
  });
  if (!ml.account && !all.length){ host.innerHTML = '<div class="sx-card empty">Conecte sua conta do Mercado Livre em <a href="#" data-goto="integracoes" style="color:var(--sx-blue-light)">Integrações</a> para ver suas vendas aqui.</div>'; return; }
  if (mlo.loading && !mlo.loaded){ host.innerHTML = '<div class="sx-card empty">Buscando suas vendas no Mercado Livre…</div>'; return; }
  var full = all.filter(function(o){ return vd.tab === "all" || vdGroup(o) === vd.tab; });
  var list = full.slice(0, vd.limit || 40);
  if (!list.length){
    host.innerHTML = '<div class="sx-card empty">' + (vd.tab === "toship" ? (all.length ? "Nenhuma venda esperando envio. 🎉" : "Nenhuma venda ainda. Assim que alguém comprar na sua loja do Mercado Livre, a venda aparece aqui.") : "Nenhuma venda nesta aba.") + '</div>';
    return;
  }
  host.innerHTML = list.map(function(o){
    var p = productById(o.productId), g = vdGroup(o), sh = o.shipping || {};
    var labelReady = sh.status === "ready_to_ship" || sh.status === "shipped";
    var isDone = !!done[o.id];
    var paid = o.mlStatus === "paid" || g !== "toship";
    var steps = [
      { t: "Pago", ok: paid },
      { t: "Etiqueta", ok: labelReady || g === "shipped" || g === "delivered" },
      { t: "Pedido no fornecedor", ok: isDone || g === "shipped" || g === "delivered" },
      { t: g === "delivered" ? "Entregue" : "Enviado", ok: g === "shipped" || g === "delivered" }
    ];
    var profit = profitOfOrder(o);
    return '<div class="sx-card vd-card'+(g === "cancelled" ? ' is-cancel' : '')+'">' +
      '<div class="vd-top">' +
        '<span class="vd-thumb" style="background:'+prodTileBg(p ? p.category : "")+'">'+prodThumb(p)+'</span>' +
        '<div class="vd-info"><b>'+(o.sim ? '<span class="vd-sim">SIMULADA</span>' : '')+escapeHtml(p ? p.name : (o.title || "Produto"))+'</b>' +
          '<span>'+fmtInt(o.qty)+' un. · '+escapeHtml(o.client)+' · venda '+escapeHtml(o.packId || o.mlOrderId)+' · '+escapeHtml(o.date.split("-").reverse().join("/"))+'</span>' +
          (sh.city ? '<span>Destino: '+escapeHtml(sh.city)+(sh.state ? '/'+escapeHtml(String(sh.state).replace("BR-","")) : '')+'</span>' : '') + '</div>' +
        '<div class="vd-money"><b>'+fmtBRL(o.total)+'</b>'+(o.unitCost == null
          ? '<span class="sx-muted" title="Este anúncio não foi criado pelo Sellex, então o custo do fornecedor não é conhecido">custo não vinculado</span>'
          : '<span class="'+(profit >= 0 ? 'pos' : 'neg')+'">lucro '+fmtBRL(profit)+'</span>')+'</div>' +
      '</div>' +
      (g === "cancelled" ? '<p class="vd-cancel">Venda cancelada no Mercado Livre.</p>' :
      '<ol class="vd-steps">' + steps.map(function(s){ return '<li class="'+(s.ok?'ok':'')+'"><i>'+(s.ok?'<svg><use href="#check"/></svg>':'')+'</i>'+s.t+'</li>'; }).join("") + '</ol>' +
      (g === "toship" ? '<div class="vd-actions">' +
        (sh.id ? '<button type="button" class="sx-btn sx-btn--ghost sx-btn--sm" data-label="'+escapeHtml(sh.id)+'"'+(labelReady?'':' disabled title="O Mercado Livre libera a etiqueta quando o pagamento é aprovado"')+'><svg><use href="#truck"/></svg>Baixar etiqueta</button>' : '') +
        '<button type="button" class="sx-btn sx-btn--sm" data-supplier="'+escapeHtml(o.id)+'"><svg><use href="#arrow"/></svg>Pedir no fornecedor</button>' +
        '<button type="button" class="sx-btn sx-btn--ghost sx-btn--sm" data-c7="'+escapeHtml(o.id)+'"><svg><use href="#copy"/></svg>Copiar pedido</button>' +
        '<label class="vd-done"><input type="checkbox" data-c7done="'+escapeHtml(o.id)+'"'+(isDone?' checked':'')+'>Pedido feito no fornecedor'+(c7OrderNumber(o.id) ? ' · C7 nº '+escapeHtml(c7OrderNumber(o.id)) : '')+'</label>' +
      '</div>' : '')) +
      (o.sim ? '<div class="vd-simbar"><span>Simulação:</span>' +
        '<select class="sx-select" data-simship="'+escapeHtml(o.id)+'">' +
          [["ready_to_ship","Pronto para enviar"],["shipped","A caminho"],["delivered","Entregue"],["cancelled","Cancelada"]].map(function(x){
            var cur = o.status === "cancelado" ? "cancelled" : (sh.status || "ready_to_ship");
            return '<option value="'+x[0]+'"'+(x[0]===cur?' selected':'')+'>'+x[1]+'</option>'; }).join("") +
        '</select><button type="button" class="vd-simdel" data-simdel="'+escapeHtml(o.id)+'">Remover</button></div>' : '') +
    '</div>';
  }).join("") + (full.length > list.length ? '<div style="text-align:center"><button type="button" class="sx-btn sx-btn--ghost" id="vd-more">Mostrar mais ('+fmtInt(full.length - list.length)+' restantes)</button></div>' : '');
}
function initVendas(){
  document.getElementById("vd-tabs").addEventListener("click", function(e){
    var b = e.target.closest("[data-vd]"); if (!b) return;
    vd.tab = b.getAttribute("data-vd"); vd.limit = 40; renderVendas();
  });
  var page = document.getElementById("page-vendas");
  page.addEventListener("click", function(e){
    if (e.target.closest("#vendas-refresh")){ loadMlOrders(true); return; }
    if (e.target.closest("#vendas-simulate")){ simulateSale(); return; }
    if (e.target.closest("#vd-more")){ vd.limit = (vd.limit || 40) + 40; renderVendas(); return; }
    var sd = e.target.closest("[data-simdel]");
    if (sd){ simRemove(sd.getAttribute("data-simdel")); return; }
    var lb = e.target.closest("[data-label]");
    if (lb && !lb.disabled){ downloadMlLabel(lb, lb.getAttribute("data-label")); return; }
    var sup = e.target.closest("[data-supplier]");
    if (sup){
      var so = vdSource().find(function(x){ return x.id === sup.getAttribute("data-supplier"); });
      if (so) orderAtSupplier(so);
      return;
    }
    var c7 = e.target.closest("[data-c7]");
    if (c7){
      var o = vdSource().find(function(x){ return x.id === c7.getAttribute("data-c7"); });
      if (o) copyText(c7OrderText(o)).then(function(){ toast("Pedido copiado. Cole no fornecedor e anexe a etiqueta."); }).catch(function(){ toast("Não consegui copiar.", true); });
    }
  });
  page.addEventListener("change", function(e){
    var ss = e.target.closest("[data-simship]");
    if (ss){ simSetShip(ss.getAttribute("data-simship"), ss.value); toast("Venda simulada: " + ss.options[ss.selectedIndex].textContent + "."); return; }
    var cb = e.target.closest("[data-c7done]"); if (!cb) return;
    setC7Done(cb.getAttribute("data-c7done"), cb.checked);
    toast(cb.checked ? "Marcado: pedido feito no fornecedor." : "Desmarcado.");
    renderVendas();
  });
}

/* ================= clientes (área do administrador) ================= */
var cli = { users: [], loaded: false, loading: false, tab: "pending", q: "", busy: {} };
function isAdmin(){ return !!(account.user && account.user.app_metadata && account.user.app_metadata.role === "admin"); }
function loadClientes(){
  var client = sb(); if (!client || !isAdmin() || cli.loading) return;
  cli.loading = true; renderClientes();
  client.functions.invoke("sx-admin", { method: "POST", body: { action: "list" } }).then(function(r){
    cli.loading = false;
    if (r.data && r.data.ok){ cli.users = r.data.users || []; cli.loaded = true; cli.error = null; }
    else cli.error = "Não consegui carregar a lista agora.";
    renderClientes();
  }).catch(function(){ cli.loading = false; cli.error = "Sem conexão com o servidor."; renderClientes(); });
}
function cliFiltered(){
  var q = cli.q;
  return cli.users.filter(function(u){
    if (cli.tab === "pending" && !u.pending) return false;
    if (cli.tab === "approved" && u.pending) return false;
    return !q || (u.name + " " + u.email).toLowerCase().indexOf(q) > -1;
  });
}
function renderClientes(){
  var host = document.getElementById("cli-list"); if (!host) return;
  var total = cli.users.length, pend = cli.users.filter(function(u){ return u.pending; }).length;
  document.getElementById("cli-kpis").innerHTML = [
    { l: "Cadastros", v: total }, { l: "Aguardando liberação", v: pend, warn: pend > 0 }, { l: "Com acesso", v: total - pend }
  ].map(function(c){
    return '<div class="sx-card"><div class="sx-stat__label">'+c.l+'</div><div class="sx-stat__value"'+(c.warn?' style="color:#FFD66B"':'')+'>'+(cli.loaded?fmtInt(c.v):'—')+'</div></div>';
  }).join("");
  if (cli.loading && !cli.loaded){ host.innerHTML = '<div class="empty">Carregando clientes…</div>'; return; }
  if (cli.error && !cli.loaded){ host.innerHTML = '<div class="empty">'+escapeHtml(cli.error)+' <a href="#" id="cli-retry" style="color:var(--sx-blue-light)">Tentar de novo</a></div>'; return; }
  var list = cliFiltered();
  if (!list.length){
    host.innerHTML = '<div class="empty">' + (cli.tab === "pending" ? "Ninguém aguardando liberação." : "Nenhum cliente encontrado.") + '</div>';
    return;
  }
  host.innerHTML = '<div class="cli-rows">' + list.map(function(u){
    var busy = cli.busy[u.id];
    var status = u.admin ? '<span class="sx-badge sx-badge--success"><i class="sx-dot"></i>Administrador</span>'
      : u.pending ? '<span class="sx-badge sx-badge--warning"><i class="sx-dot"></i>Aguardando</span>'
      : '<span class="sx-badge sx-badge--success"><i class="sx-dot"></i>Liberado</span>';
    var act = u.admin ? '' : u.pending
      ? '<button class="sx-btn sx-btn--sm" type="button" data-cli-act="approve" data-id="'+u.id+'"'+(busy?' disabled':'')+'>'+(busy?'Liberando…':'Liberar acesso')+'</button>'
      : '<button class="sx-btn sx-btn--ghost sx-btn--sm" type="button" data-cli-act="block" data-id="'+u.id+'"'+(busy?' disabled':'')+'>'+(busy?'Bloqueando…':'Bloquear')+'</button>';
    return '<div class="cli-row">' +
      '<span class="sx-avatar cli-av">'+escapeHtml(initials(u.name || u.email))+'</span>' +
      '<div class="cli-main"><b>'+escapeHtml(u.name || u.email.split("@")[0])+'</b><span>'+escapeHtml(u.email)+'</span></div>' +
      '<div class="cli-meta"><span>Cadastro: '+escapeHtml(fmtDateBR(u.created_at))+'</span>' +
        '<span>'+(u.ml ? 'Mercado Livre: '+escapeHtml(u.ml.nickname || "conectado") : 'Mercado Livre não conectado')+'</span></div>' +
      '<div class="cli-status">'+status+'</div>' +
      '<div class="cli-act">'+act+'</div>' +
    '</div>';
  }).join("") + '</div>';
}
function cliAction(action, id){
  var client = sb(); if (!client) return;
  var u = cli.users.find(function(x){ return x.id === id; }); if (!u) return;
  if (action === "block" && !window.confirm("Bloquear o acesso de " + u.email + "? A pessoa volta a ver a tela de liberação.")) return;
  cli.busy[id] = true; renderClientes();
  client.functions.invoke("sx-admin", { method: "POST", body: { action: action, user_id: id } }).then(function(r){
    delete cli.busy[id];
    if (r.data && r.data.ok){
      u.pending = action === "block";
      toast(action === "approve" ? "Acesso liberado para " + u.email + "." : "Acesso de " + u.email + " bloqueado.");
    } else toast((r.data && r.data.message) || "Não consegui alterar agora. Tente de novo.", true);
    renderClientes();
  }).catch(function(){ delete cli.busy[id]; renderClientes(); toast("Sem conexão com o servidor.", true); });
}
function initClientes(){
  document.getElementById("cli-tabs").addEventListener("click", function(e){
    var b = e.target.closest("[data-cli]"); if (!b) return;
    cli.tab = b.getAttribute("data-cli");
    document.querySelectorAll("#cli-tabs .sx-tab").forEach(function(x){ x.setAttribute("aria-selected", x === b ? "true" : "false"); });
    renderClientes();
  });
  document.getElementById("cli-search").addEventListener("input", function(e){ cli.q = e.target.value.trim().toLowerCase(); renderClientes(); });
  document.getElementById("cli-refresh").addEventListener("click", loadClientes);
  document.getElementById("cli-copy").addEventListener("click", function(){
    var emails = cliFiltered().map(function(u){ return u.email; }).filter(Boolean);
    if (!emails.length){ toast("Nenhum e-mail nesta lista.", true); return; }
    copyText(emails.join(", ")).then(function(){ toast(emails.length + " e-mail(s) copiado(s)."); }).catch(function(){ toast("Não consegui copiar.", true); });
  });
  document.getElementById("page-clientes").addEventListener("click", function(e){
    var b = e.target.closest("[data-cli-act]");
    if (b && !b.disabled) cliAction(b.getAttribute("data-cli-act"), b.getAttribute("data-id"));
    if (e.target.closest("#cli-retry")){ e.preventDefault(); loadClientes(); }
  });
}

/* ================= configurações ================= */
function renderConfig(){
  document.getElementById("cfg-pause").checked = !!state.settings.pauseNoStock;
  document.getElementById("cfg-autoprice").checked = !!state.settings.autoPrice;
  document.getElementById("cfg-notify").checked = !!state.settings.notify;
  document.getElementById("cfg-margin").value = state.settings.defaultMargin;
  document.getElementById("cfg-tier").value = state.settings.c7Tier || "DROPSHIPPING";
}
function saveConfig(ev){
  ev.preventDefault();
  state.settings.pauseNoStock = document.getElementById("cfg-pause").checked;
  state.settings.autoPrice = document.getElementById("cfg-autoprice").checked;
  state.settings.notify = document.getElementById("cfg-notify").checked;
  state.settings.defaultMargin = Math.min(500, Math.max(0, parseFloat(document.getElementById("cfg-margin").value) || 0));
  var oldTier = state.settings.c7Tier;
  state.settings.c7Tier = document.getElementById("cfg-tier").value || "DROPSHIPPING";
  saveJSON(STORE_KEYS.settings, state.settings);
  if (catalog.loaded && oldTier !== state.settings.c7Tier){
    refreshProductsFromCatalog();
    saveJSON(STORE_KEYS.products, state.products);
    state.orders = loadOrders();
  }
  toast("Configurações salvas.");
}

/* ================= toast ================= */
function toast(msg, isError){
  var host = document.getElementById("toast-host");
  var el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = '<svg><use href="#'+(isError?"x":"check")+'"/></svg><span></span>';
  el.querySelector("span").textContent = msg;
  if (isError) el.querySelector("svg").style.color = "var(--sx-red)";
  host.appendChild(el);
  setTimeout(function(){ el.style.transition="opacity .3s"; el.style.opacity="0"; setTimeout(function(){ el.remove(); }, 300); }, 3200);
}

/* ================= navegação ================= */
function goToPage(name, keepScroll){
  document.querySelectorAll(".page").forEach(function(s){ s.classList.toggle("is-active", s.id==="page-"+name); });
  document.querySelectorAll(".sx-nav__item[data-page]").forEach(function(a){
    if (a.getAttribute("data-page")===name) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
  });
  if (name==="painel") renderPainel();
  if (name==="produtos") renderProdutos();
  if (name==="mineracao") renderMining();
  if (name==="pedidos"){ renderVendasDashboard(); renderPedidos(); renderMlOrdersBar(); loadMlOrders(); }
  if (name==="integracoes") renderIntegracoes();
  if (name==="config") renderConfig();
  if (name==="clientes") loadClientes();
  if (name==="vendas"){ renderVendas(); loadMlOrders(); }
  if (name==="anuncio") renderListingEditor();
  if (!keepScroll) window.scrollTo({top:0, behavior:"smooth"});
}

/* ================= init ================= */
function init(){
  var now = new Date();
  state.today = isoDate(now);

  var iconSelect = document.getElementById("f-icon");
  Object.keys(ICON_LABELS).sort(function(a,b){ return ICON_LABELS[a].localeCompare(ICON_LABELS[b],'pt-BR'); }).forEach(function(key){
    var opt = document.createElement("option");
    opt.value = key; opt.textContent = ICON_LABELS[key];
    iconSelect.appendChild(opt);
  });

  // os dados do lojista são carregados depois do login (loadUserState)
  state.products = [];
  state.channelsActive = defaultChannelsActive();
  state.settings = defaultSettings();
  state.orders = [];
  document.getElementById("today-label").textContent = now.toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'long'});

  document.querySelectorAll(".sx-nav__item[data-page]").forEach(function(a){
    a.addEventListener("click", function(e){ e.preventDefault(); goToPage(a.getAttribute("data-page")); });
  });
  document.addEventListener("click", function(e){
    var a = e.target.closest("[data-goto]");
    if (a){ e.preventDefault(); goToPage(a.getAttribute("data-goto")); return; }
    if (e.target.closest("#catalog-retry")){ e.preventDefault(); startCatalog(); }
  });

  document.getElementById("period-tabs").addEventListener("click", function(e){
    var btn = e.target.closest(".sx-tab");
    if (!btn) return;
    document.querySelectorAll("#period-tabs .sx-tab").forEach(function(b){ b.setAttribute("aria-selected", b===btn ? "true":"false"); });
    state.period = btn.getAttribute("data-period");
    renderPainel();
  });

  document.getElementById("produtos-search").addEventListener("input", renderProdutosGrid);
  document.getElementById("btn-new-product").addEventListener("click", function(){ openProductModal(null); });
  document.getElementById("produtos-period-tabs").addEventListener("click", function(e){
    var btn = e.target.closest(".sx-tab");
    if (!btn) return;
    document.querySelectorAll("#produtos-period-tabs .sx-tab").forEach(function(b){ b.setAttribute("aria-selected", b===btn ? "true":"false"); });
    state.produtosPeriod = btn.getAttribute("data-period");
    renderProdutos();
  });
  document.getElementById("produtos-grid").addEventListener("click", function(e){
    var editBtn = e.target.closest("[data-edit]");
    var delBtn = e.target.closest("[data-delete]");
    if (editBtn){
      var ep = productById(editBtn.getAttribute("data-edit"));
      if (ep && ep.catalogId) openListingEditor(ep.id, { from: "produtos" });
      else openProductModal(editBtn.getAttribute("data-edit"));
      return;
    }
    var openCard = e.target.closest(".product-card");
    if (openCard && !delBtn){
      var cp = productById(openCard.getAttribute("data-product"));
      if (cp && cp.catalogId) openListingEditor(cp.id, { from: "produtos" });
    }
    if (delBtn) deleteProduct(delBtn.getAttribute("data-delete"));
  });

  function miningChanged(){ state.mining.limit = MINING_PAGE; renderMining(); }
  document.getElementById("mining-search").addEventListener("input", function(e){ state.mining.search = e.target.value.trim().toLowerCase(); miningChanged(); });
  document.querySelectorAll("[data-mfilter]").forEach(function(cb){
    cb.addEventListener("change", function(){ state.mining[cb.getAttribute("data-mfilter")] = cb.checked; miningChanged(); });
  });
  document.getElementById("mining-category").addEventListener("change", function(e){ state.mining.category = e.target.value; miningChanged(); });
  document.getElementById("mining-more").addEventListener("click", function(){ state.mining.limit += MINING_PAGE; renderMining(); });
  document.getElementById("mining-price-min").addEventListener("input", function(e){ state.mining.priceMin = e.target.value===""? null : parseFloat(e.target.value); miningChanged(); });
  document.getElementById("mining-price-max").addEventListener("input", function(e){ state.mining.priceMax = e.target.value===""? null : parseFloat(e.target.value); miningChanged(); });
  document.querySelectorAll(".price-preset").forEach(function(btn){
    btn.addEventListener("click", function(){
      var parts = btn.getAttribute("data-preset").split("-").map(Number);
      state.mining.priceMin = parts[0]; state.mining.priceMax = parts[1]>=99999 ? null : parts[1];
      document.getElementById("mining-price-min").value = parts[0];
      document.getElementById("mining-price-max").value = parts[1]>=99999 ? "" : parts[1];
      document.querySelectorAll(".price-preset").forEach(function(b){ b.classList.toggle("is-active", b===btn); });
      miningChanged();
    });
  });
  document.getElementById("mining-sort").addEventListener("change", function(e){ state.mining.sort = e.target.value; miningChanged(); });
  document.getElementById("mining-view-grid").addEventListener("click", function(){ state.mining.view="grid"; syncMiningViewButtons(); renderMining(); });
  document.getElementById("mining-view-list").addEventListener("click", function(){ state.mining.view="list"; syncMiningViewButtons(); renderMining(); });
  document.getElementById("mining-clear").addEventListener("click", resetMiningFilters);
  document.getElementById("mining-chips").addEventListener("click", function(e){
    var clearBtn = e.target.closest("#mining-chip-clear");
    if (clearBtn){ resetMiningFilters(); return; }
    var chipBtn = e.target.closest("[data-chip]");
    if (!chipBtn) return;
    var key = chipBtn.getAttribute("data-chip");
    if (key==="price"){ state.mining.priceMin=null; state.mining.priceMax=null; document.getElementById("mining-price-min").value=""; document.getElementById("mining-price-max").value=""; }
    else if (key==="category"){ state.mining.category=""; document.getElementById("mining-category").value=""; }
    else { state.mining[key]=false; var cb=document.querySelector('[data-mfilter="'+key+'"]'); if (cb) cb.checked=false; }
    miningChanged();
  });
  document.getElementById("mining-grid").addEventListener("click", function(e){
    var addBtn = e.target.closest("[data-mining-add]");
    if (addBtn && !addBtn.disabled) addFromMining(addBtn.getAttribute("data-mining-add"));
  });
  document.getElementById("product-form").addEventListener("submit", saveProductForm);
  document.getElementById("f-price").addEventListener("input", updateModalCostHint);
  document.getElementById("modal-close").addEventListener("click", closeProductModal);
  document.getElementById("product-modal").addEventListener("click", function(e){ if (e.target.id==="product-modal") closeProductModal(); });

  document.getElementById("pedidos-status").addEventListener("change", renderPedidos);
  document.getElementById("pedidos-channel").addEventListener("change", renderPedidos);
  document.getElementById("pedidos-search").addEventListener("input", renderPedidos);
  document.getElementById("vendas-period-tabs").addEventListener("click", function(e){
    var btn = e.target.closest(".sx-tab");
    if (!btn) return;
    document.querySelectorAll("#vendas-period-tabs .sx-tab").forEach(function(b){ b.setAttribute("aria-selected", b===btn ? "true":"false"); });
    state.vendasPeriod = btn.getAttribute("data-period");
    renderVendasDashboard();
  });
  document.getElementById("pedidos-table").addEventListener("click", function(e){
    var lb = e.target.closest("[data-label]");
    if (lb && !lb.disabled){ downloadMlLabel(lb, lb.getAttribute("data-label")); return; }
    var sup = e.target.closest("[data-supplier]");
    if (sup){ var so = state.orders.find(function(x){ return x.id === sup.getAttribute("data-supplier"); }); if (so) orderAtSupplier(so); return; }
    var c7 = e.target.closest("[data-c7]");
    if (c7){
      var o = state.orders.find(function(x){ return x.id === c7.getAttribute("data-c7"); });
      if (!o) return;
      copyText(c7OrderText(o)).then(function(){ toast("Pedido copiado. Cole no fornecedor e anexe a etiqueta."); })
        .catch(function(){ toast("Não consegui copiar.", true); });
    }
  });
  document.getElementById("page-pedidos").addEventListener("click", function(e){
    if (e.target.closest("#pedidos-refresh")) loadMlOrders(true);
  });
  document.getElementById("pedidos-table").addEventListener("change", function(e){
    var sel = e.target.closest("[data-order-status]");
    if (sel) changeOrderStatus(sel.getAttribute("data-order-status"), sel.value);
  });

  document.getElementById("page-integracoes").addEventListener("click", function(e){
    var b = e.target.closest("[data-int]");
    if (!b || b.disabled) return;
    if (b.getAttribute("data-int") === "ml-connect") connectMl();
    if (b.getAttribute("data-int") === "ml-disconnect") disconnectMl();
    if (b.getAttribute("data-int") === "other") openQrModal(b.getAttribute("data-int-key"), b.getAttribute("data-int-name"));
  });
  document.getElementById("int-address").addEventListener("click", function(e){
    var one = e.target.closest("[data-copy]"), all = e.target.closest("[data-copy-all]");
    var btn = one || all; if (!btn) return;
    var text = one ? SUPPLIER_ADDRESS[+one.getAttribute("data-copy")].v : supplierAddressText();
    copyText(text).then(function(){ flashCopied(btn); toast(all ? "Endereço completo copiado." : "Copiado: " + text); })
      .catch(function(){ toast("Não consegui copiar. Selecione o texto e copie manualmente.", true); });
  });
  document.getElementById("auth-tabs").addEventListener("click", function(e){
    var b = e.target.closest("[data-auth-mode]"); if (b) setAuthMode(b.getAttribute("data-auth-mode"));
  });
  document.getElementById("auth-form").addEventListener("submit", submitAuth);
  document.getElementById("auth-forgot").addEventListener("click", function(){ setAuthMode("forgot"); document.getElementById("auth-email").focus(); });
  document.getElementById("auth-back").addEventListener("click", function(){ setAuthMode("login"); });
  document.getElementById("btn-logout").addEventListener("click", logout);

  document.getElementById("config-form").addEventListener("submit", saveConfig);
  initListingEditor();
  initQrModal();
  initClientes();
  initVendas();
  initPayModal();

  renderPainel();
}

// produtos e configurações ficam separados por conta (cada login tem os seus)
function loadUserState(uid){
  STORE_KEYS.products = "sx_products_v3:" + uid;
  STORE_KEYS.settings = "sx_settings_v3:" + uid;
  var savedProducts = loadJSON(STORE_KEYS.products, null);
  state.products = Array.isArray(savedProducts) ? savedProducts : [];
  // produtos "publicados" no modo teste voltam a ficar prontos para publicar de verdade
  var released = false;
  state.products.forEach(function(p){
    if (p.testPublish){ delete p.mlItemId; delete p.mlPermalink; delete p.publishedAt; p.status = "pronto"; p.testPublish = false; released = true; }
  });
  if (released) saveJSON(STORE_KEYS.products, state.products);
  state.settings = loadJSON(STORE_KEYS.settings, null) || defaultSettings();
  if (!state.settings.lastSync) state.settings.lastSync = defaultSettings().lastSync;
  if (!state.settings.c7Tier) state.settings.c7Tier = "DROPSHIPPING";
  saveJSON(STORE_KEYS.settings, state.settings);
  state.orders = loadOrders();
}
function currentPage(){
  var el = document.querySelector(".page.is-active");
  return el ? el.id.replace("page-","") : "painel";
}
function startCatalog(){
  renderMining();
  var ready = catalog.loaded ? Promise.resolve() : loadCatalog();
  ready.then(function(){
    if (refreshProductsFromCatalog()) saveJSON(STORE_KEYS.products, state.products);
    state.orders = loadOrders();
    renderPainel();
    var pg = currentPage();
    if (pg !== "painel") goToPage(pg, true);
  }).catch(function(){
    renderMining();
    renderProdutos();
    toast("Não consegui carregar o catálogo do fornecedor.", true);
  });
}

/* ================= ponte do modo demonstração =================
   Usada só por js/sellex-demo.js (gerador de métricas simuladas). */
window.SellexApp = {
  state: state,
  CHANNELS: CHANNELS,
  productById: productById,
  isoDate: isoDate,
  currentPage: currentPage,
  goToPage: goToPage,
  renderPainel: renderPainel,
  toast: toast,
  setDemoOrders: function(orders){
    state.orders = orders || [];
    if (orders && orders.length) saveJSON(DEMO_ORDERS_KEY, orders);
    else { try{ window.localStorage.removeItem(DEMO_ORDERS_KEY); }catch(e){} }
    renderVendasCount();
    renderPainel();
    var pg = currentPage();
    if (pg !== "painel") goToPage(pg, true);
  },
  clearDemoOrders: function(){ this.setDemoOrders([]); }
};

document.addEventListener("DOMContentLoaded", function(){ init(); startAuth(); });
})();
