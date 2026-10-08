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

var CLIENTES = ["Ana Souza","Carlos Mendes","Juliana Rocha","Pedro Almeida","Fernanda Lima","Bruno Castro",
  "Camila Duarte","Lucas Ferreira","Mariana Costa","Rafael Torres","Beatriz Nunes","Thiago Pereira",
  "Larissa Ramos","Gustavo Silva","Patrícia Gomes","Diego Martins","Isabela Freitas","André Barros"];

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
    inStock: true, withGtin: false, notImported: false, category: "",
    priceMin: null, priceMax: null,
    sort: "recent",
    view: "grid",
    limit: 48
  }
};

function generateOrders(products, todayStr, days){
  var rand = mulberry32(hashSeed(todayStr));
  var orders = [];
  var counter = 1;
  var activeProducts = products.filter(function(p){ return p.price > 0; });
  if (!activeProducts.length) return [];
  var totalWeight = activeProducts.reduce(function(a,p){ return a + (p.weight || 1); }, 0);

  for (var offset = days-1; offset >= 0; offset--){
    var d = new Date(todayStr + "T00:00:00");
    d.setDate(d.getDate() - offset);
    var iso = isoDate(d);
    var dow = d.getDay();
    var weekendFactor = (dow===0 || dow===6) ? 1.22 : 1.0;
    var growth = 0.62 + ((days-1-offset)/(days-1)) * 0.55;
    var noise = 0.7 + rand()*0.55;
    var count = Math.max(2, Math.round(6.4 * growth * weekendFactor * noise));

    for (var i=0;i<count;i++){
      var r = rand()*totalWeight, acc=0, chosen=activeProducts[0];
      for (var k=0;k<activeProducts.length;k++){ acc += (activeProducts[k].weight || 1); if (r<=acc){ chosen=activeProducts[k]; break; } }
      var qtyRoll = rand();
      var qty = qtyRoll<0.7 ? 1 : (qtyRoll<0.92 ? 2 : 3);
      var statusRoll = rand();
      var status = statusRoll<0.78 ? "concluido" : statusRoll<0.89 ? "enviado" : statusRoll<0.96 ? "processando" : "cancelado";
      var hour = 8 + Math.floor(rand()*14);
      var client = CLIENTES[Math.floor(rand()*CLIENTES.length)];
      orders.push({
        id: "sx" + (10000+counter),
        date: iso,
        hour: hour,
        channel: chosen.channel,
        productId: chosen.id,
        qty: qty,
        unitPrice: chosen.price,
        unitCost: chosen.cost != null ? chosen.cost : null,
        total: Math.round(chosen.price*qty*100)/100,
        status: status,
        client: client
      });
      counter++;
    }
  }
  return orders;
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
  if (p && p.cost != null && p.price > 0) return Math.max(0, (p.price - p.cost) / p.price * 100);
  var m = p && p.margin!=null ? p.margin : (state.settings.defaultMargin!=null ? state.settings.defaultMargin : 35);
  return Math.max(0, Math.min(95, m));
}
function profitOfOrder(o){
  if (o.status === "cancelado") return 0;
  if (o.unitCost != null) return o.total - o.unitCost * o.qty;
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
    var down = deltaOk && c.d < 0;
    var deltaText = deltaOk ? fmtPct(c.d) + " vs. período anterior" : "sem dados no período anterior";
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

  var order = Object.keys(totals).sort(function(a,b){ return totals[b]-totals[a]; });
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
    if (!agg[o.productId]) agg[o.productId] = {qty:0, revenue:0};
    agg[o.productId].qty += o.qty;
    agg[o.productId].revenue += o.total;
  });
  var rows = Object.keys(agg).map(function(id){ return {id:id, qty:agg[id].qty, revenue:agg[id].revenue}; })
    .sort(function(a,b){ return b.revenue-a.revenue; }).slice(0,5);

  var tbody = rows.map(function(r){
    var p = productById(r.id);
    if (!p) return "";
    return '<tr><td class="prod"><span>'+prodThumb(p)+'</span>'+escapeHtml(p.name)+'</td><td>'+fmtInt(r.qty)+'</td><td>'+fmtBRL(r.revenue)+'</td></tr>';
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
      '<td class="prod"><span>'+prodThumb(p)+'</span>'+(p?escapeHtml(p.name):"Produto removido")+'</td>' +
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
}

/* ================= produtos: dashboard + grid limpo ================= */
function statusOfProduct(p){
  if (!p.active) return {label:"Pausado", tone:"danger"};
  if (p.stock===0) return {label:"Sem estoque", tone:"danger"};
  if (p.stock<10) return {label:"Estoque baixo", tone:"warning"};
  return {label:"Ativo", tone:"success"};
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
      : (catalog.loaded ? 'Você ainda não tem produtos. <a href="#" data-goto="mineracao" style="color:var(--sx-blue-light)">Escolha produtos na Mineração</a>.' : 'Carregando seus produtos do C7 Drop…')) + '</div>';
    return;
  }

  grid.innerHTML = withSales.map(function(x){
    var p = x.p, s = x.sales;
    var st = statusOfProduct(p);
    var pct = maxRevenue>0 ? (s.revenue/maxRevenue*100) : 0;
    var unitProfit = p.cost != null ? p.price - p.cost : null;
    var ch = CHANNELS[p.channel] ? p.channel : "ml";
    return '<div class="product-card">' +
      '<div class="product-card__actions">' +
        '<button class="icon-btn" data-edit="'+p.id+'" aria-label="Editar"><svg><use href="#edit"/></svg></button>' +
        '<button class="icon-btn icon-btn--danger" data-delete="'+p.id+'" aria-label="Excluir"><svg><use href="#trash"/></svg></button>' +
      '</div>' +
      '<div class="product-card__img" style="background:'+prodTileBg(p.category)+'">'+iconSVG(p.icon)+(p.image ? productImg(p.image, p.name) : '')+'</div>' +
      '<div class="product-card__body">' +
        '<div class="product-card__price"><span class="now">'+fmtBRL(p.price)+'</span><span class="stock">'+fmtInt(p.stock)+' em estoque</span></div>' +
        '<div class="product-card__name" title="'+escapeHtml(p.name)+'">'+escapeHtml(p.name)+'</div>' +
        '<div class="product-card__chrow"><img src="'+CH_ICON[ch]+'" alt="">'+CHANNELS[ch].name+' · '+escapeHtml(p.category)+'</div>' +
        (p.cost != null
          ? '<div class="sx-muted" style="font-size:12.5px">Custo '+fmtBRL(p.cost)+' · lucro '+fmtBRL(unitProfit)+' por un. ('+fmtInt(productMarginPct(p))+'%)</div>'
          : '<div class="sx-muted" style="font-size:12.5px">Margem '+fmtInt(productMarginPct(p))+'%</div>') +
        '<div><span class="sx-badge sx-badge--'+st.tone+'"><i class="sx-dot"></i>'+st.label+'</span></div>' +
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
  hint.innerHTML = 'Custo no C7 Drop: <b>'+fmtBRL(p.cost)+'</b> · lucro de <b'+(lucro<0?' style="color:var(--sx-red)"':'')+'>'+fmtBRL(lucro)+'</b> por unidade. A margem é calculada pelo preço; o estoque vem do fornecedor.';
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
  state.orders = generateOrders(state.products, state.today, 90);
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
  state.orders = generateOrders(state.products, state.today, 90);
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
  var m = (state.settings.defaultMargin!=null ? state.settings.defaultMargin : 35) / 100;
  m = Math.min(0.9, Math.max(0, m));
  return Math.round((cost / (1 - m)) * 100) / 100;
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
    el.innerHTML = '<i class="sx-dot"></i>C7 Drop conectado · '+fmtInt(catalog.items.length)+' produtos · '+fmtInt(inStock)+' com estoque';
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
function matchesMining(row, imported){
  var m = state.mining;
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
  return copy;
}
function renderMiningChips(){
  var m = state.mining, chips = [];
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
      : '<div class="empty" style="grid-column:1/-1">Carregando o catálogo do C7 Drop…</div>';
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
  grid.innerHTML = shown.map(function(r){
    var added = !!imported[r.id];
    var cost = tierCost(r);
    var sale = suggestedSalePrice(cost.value);
    var noStock = !(r.stock > 0);
    var badges = '';
    if (noStock) badges += '<span class="mining-badge" style="color:#FF8A83">Esgotado</span>';
    if (r.gtin) badges += '<span class="mining-badge">GTIN</span>';
    var canAdd = !added && !noStock;
    return '<div class="mining-card">' +
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
  }).join("");
}
function productFromCatalog(r){
  var cost = tierCost(r).value;
  return {
    id: "c7_" + r.id,
    catalogId: r.id,
    name: r.name,
    icon: "box",
    image: r.image_url || null,
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
  state.products.push(p);
  saveJSON(STORE_KEYS.products, state.products);
  state.orders = generateOrders(state.products, state.today, 90);
  renderMining();
  renderSideSummary();
  toast('"'+r.name+'" adicionado aos seus produtos por '+fmtBRL(p.price)+' (custo '+fmtBRL(p.cost)+').');
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
function seedProductsFromCatalog(){
  state.products = catalog.items.filter(function(r){ return r.stock > 0; }).map(productFromCatalog);
  saveJSON(STORE_KEYS.products, state.products);
}
function syncMiningViewButtons(){
  document.getElementById("mining-view-grid").setAttribute("data-active", state.mining.view==="grid");
  document.getElementById("mining-view-list").setAttribute("data-active", state.mining.view==="list");
}
function resetMiningFilters(){
  state.mining = {search:state.mining.search, inStock:false, withGtin:false, notImported:false, category:"", priceMin:null, priceMax:null, sort:state.mining.sort, view:state.mining.view, limit:MINING_PAGE};
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
    var down = deltaOk && (c.invert ? c.d > 0 : c.d < 0);
    var deltaText = c.sub ? c.sub : (deltaOk ? fmtPct(c.d) + " vs. período anterior" : "sem dados no período anterior");
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
      var hay = (o.client+" "+(p?p.name:"")).toLowerCase();
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
      '<td class="prod"><span>'+prodThumb(p)+'</span>'+(p?escapeHtml(p.name):"Produto removido")+'</td>' +
      '<td>'+escapeHtml(o.client)+'</td>' +
      '<td><img class="mk" src="'+CH_ICON[o.channel]+'" alt="'+CHANNELS[o.channel].name+'"></td>' +
      '<td>'+fmtBRL(o.total)+'</td>' +
      '<td><select class="sx-select" data-order-status="'+o.id+'" style="padding:7px 32px 7px 10px;font-size:12.5px">' +
        Object.keys(STATUS_LABEL).map(function(s){ return '<option value="'+s+'"'+(s===o.status?" selected":"")+'>'+STATUS_LABEL[s]+'</option>'; }).join("") +
      '</select></td>' +
    '</tr>';
  }).join("");

  document.querySelector("#pedidos-table tbody").innerHTML = rows || '<tr><td colspan="6" class="empty">Nenhum pedido encontrado.</td></tr>';
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
  return sbClient;
}
var account = { user: null, name: "", email: "" };
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
function setAuthMode(mode){
  authMode = mode;
  document.querySelectorAll("#auth-tabs .sx-tab").forEach(function(b){ b.setAttribute("aria-selected", b.getAttribute("data-auth-mode")===mode ? "true" : "false"); });
  document.getElementById("auth-name-row").hidden = mode !== "signup";
  document.getElementById("auth-title").textContent = mode === "signup" ? "Criar conta" : "Entrar";
  document.getElementById("auth-sub").textContent = mode === "signup" ? "Comece a vender com o catálogo do seu fornecedor." : "Acesse seu painel de vendas.";
  document.getElementById("auth-submit").textContent = mode === "signup" ? "Criar conta" : "Entrar";
  document.getElementById("auth-password").setAttribute("autocomplete", mode === "signup" ? "new-password" : "current-password");
  showAuthMsg("");
}
function showAuthGate(message, ok){
  document.getElementById("auth-gate").hidden = false;
  if (message) showAuthMsg(message, ok);
}
function submitAuth(ev){
  ev.preventDefault();
  var client = sb();
  if (!client){ showAuthMsg("Não consegui carregar o login. Verifique sua internet e recarregue a página."); return; }
  var email = document.getElementById("auth-email").value.trim();
  var password = document.getElementById("auth-password").value;
  var name = document.getElementById("auth-name").value.trim();
  if (!email || !password){ showAuthMsg("Preencha e-mail e senha."); return; }
  if (authMode === "signup" && password.length < 6){ showAuthMsg("A senha precisa ter pelo menos 6 caracteres."); return; }
  var btn = document.getElementById("auth-submit");
  btn.disabled = true;
  showAuthMsg("");
  var here = /^https?:/.test(location.protocol) ? location.origin + location.pathname : undefined;
  var p = authMode === "signup"
    ? client.auth.signUp({ email: email, password: password, options: { data: { name: name || email.split("@")[0] }, emailRedirectTo: here } })
    : client.auth.signInWithPassword({ email: email, password: password });
  p.then(function(res){
    btn.disabled = false;
    if (res.error){ showAuthMsg(authErrorText(res.error)); return; }
    if (authMode === "signup" && !res.data.session){
      setAuthMode("login");
      showAuthMsg("Conta criada. Enviamos um link de confirmação para " + email + ". Confirme e depois entre aqui.", true);
      return;
    }
    // a sessão chega pelo onAuthStateChange
  }).catch(function(e){ btn.disabled = false; showAuthMsg(authErrorText(e)); });
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
  if (account.user && account.user.id === u.id) return;
  account.user = u;
  account.email = u.email || "";
  account.name = (u.user_metadata && u.user_metadata.name) || account.email.split("@")[0];
  document.getElementById("auth-gate").hidden = true;
  loadUserState(u.id);
  renderAccount();
  renderPainel();
  refreshMlStatus().then(function(){ handleMlReturn(); });
  startCatalog();
}
function onSignedOut(){
  account = { user: null, name: "", email: "" };
  ml.account = null; ml.loaded = false;
  state.products = []; state.orders = [];
  document.getElementById("auth-password").value = "";
  setAuthMode("login");
  showAuthGate();
}
function logout(){
  var client = sb();
  if (!client) return;
  client.auth.signOut().then(function(){ onSignedOut(); });
}
function startAuth(){
  var client = sb();
  if (!client){ showAuthGate("Não consegui carregar o login. Verifique sua internet e recarregue a página."); return; }
  client.auth.onAuthStateChange(function(event, session){
    if (session && session.user) onSignedIn(session);
    else if (event === "SIGNED_OUT") onSignedOut();
  });
  client.auth.getSession().then(function(res){
    var session = res && res.data && res.data.session;
    if (session) onSignedIn(session); else showAuthGate();
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
  var soon = [["shopee","Shopee"],["amazon","Amazon"],["shein","Shein"]].map(function(c){
    return '<div class="sx-card int-card is-soon">' +
      '<div class="int-head"><img class="int-logo" src="'+CH_ICON[c[0]]+'" alt=""><div style="flex:1"><div class="int-name">'+c[1]+'</div></div><span class="sx-badge"><i class="sx-dot"></i>Em breve</span></div>' +
      '<p class="int-desc">Integração em desenvolvimento.</p>' +
    '</div>';
  }).join("");
  host.innerHTML =
    '<div class="sx-card int-card">' +
      '<div class="int-head"><img class="int-logo" src="'+CH_ICON.ml+'" alt=""><div style="flex:1"><div class="int-name">Mercado Livre</div></div>'+badge+'</div>' +
      mlCard +
    '</div>' + soon;

  var c7;
  if (catalog.loaded){
    var inStock = catalog.items.filter(function(r){ return r.stock > 0; }).length;
    var last = catalog.items.reduce(function(m,r){ return r.list_synced_at && r.list_synced_at > m ? r.list_synced_at : m; }, "");
    c7 = '<div class="int-meta"><span><b>'+fmtInt(catalog.items.length)+'</b> produtos no catálogo · <b>'+fmtInt(inStock)+'</b> com estoque</span>' +
      (last ? '<span>Atualizado em '+escapeHtml(fmtDateBR(last))+'</span>' : '') +
      '<span>Sua faixa: <b>'+escapeHtml(({DROPSHIPPING:"Dropshipping",ATACADO:"Atacado",GRUPO_VIP:"Grupo VIP"})[state.settings.c7Tier] || "Dropshipping")+'</b></span></div>' +
      '<div class="int-actions"><a class="sx-btn sx-btn--ghost sx-btn--sm" href="#" data-goto="mineracao">Ver catálogo</a><a class="sx-btn sx-btn--ghost sx-btn--sm" href="#" data-goto="config">Trocar faixa</a></div>';
  } else {
    c7 = '<p class="int-desc">'+(catalog.error ? 'Não consegui carregar o catálogo agora.' : 'Carregando o catálogo…')+'</p>';
  }
  document.getElementById("int-suppliers").innerHTML =
    '<div class="sx-card int-card">' +
      '<div class="int-head"><span class="int-logo int-logo--txt">C7</span><div style="flex:1"><div class="int-name">C7 Drop</div></div>' +
        (catalog.loaded ? '<span class="sx-badge sx-badge--success"><i class="sx-dot"></i>Conectado</span>' : '<span class="sx-badge"><i class="sx-dot"></i>…</span>') + '</div>' +
      '<p class="int-desc">Catálogo, custo e estoque sincronizados automaticamente.</p>' + c7 +
    '</div>';
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
  state.settings.defaultMargin = Math.min(85, Math.max(0, parseFloat(document.getElementById("cfg-margin").value) || 0));
  var oldTier = state.settings.c7Tier;
  state.settings.c7Tier = document.getElementById("cfg-tier").value || "DROPSHIPPING";
  saveJSON(STORE_KEYS.settings, state.settings);
  if (catalog.loaded && oldTier !== state.settings.c7Tier){
    refreshProductsFromCatalog();
    saveJSON(STORE_KEYS.products, state.products);
    state.orders = generateOrders(state.products, state.today, 90);
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
  if (name==="produtos") renderProdutos();
  if (name==="mineracao") renderMining();
  if (name==="pedidos"){ renderVendasDashboard(); renderPedidos(); }
  if (name==="integracoes") renderIntegracoes();
  if (name==="config") renderConfig();
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
    if (editBtn) openProductModal(editBtn.getAttribute("data-edit"));
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
  document.getElementById("pedidos-table").addEventListener("change", function(e){
    var sel = e.target.closest("[data-order-status]");
    if (sel) changeOrderStatus(sel.getAttribute("data-order-status"), sel.value);
  });

  document.getElementById("page-integracoes").addEventListener("click", function(e){
    var b = e.target.closest("[data-int]");
    if (!b || b.disabled) return;
    if (b.getAttribute("data-int") === "ml-connect") connectMl();
    if (b.getAttribute("data-int") === "ml-disconnect") disconnectMl();
  });
  document.getElementById("auth-tabs").addEventListener("click", function(e){
    var b = e.target.closest("[data-auth-mode]"); if (b) setAuthMode(b.getAttribute("data-auth-mode"));
  });
  document.getElementById("auth-form").addEventListener("submit", submitAuth);
  document.getElementById("btn-logout").addEventListener("click", logout);

  document.getElementById("config-form").addEventListener("submit", saveConfig);

  renderPainel();
}

// produtos e configurações ficam separados por conta (cada login tem os seus)
function loadUserState(uid){
  STORE_KEYS.products = "sx_products_v2_c7:" + uid;
  STORE_KEYS.settings = "sx_settings_v2:" + uid;
  var savedProducts = loadJSON(STORE_KEYS.products, null);
  state.products = Array.isArray(savedProducts) ? savedProducts : [];
  state.settings = loadJSON(STORE_KEYS.settings, null) || defaultSettings();
  if (!state.settings.lastSync) state.settings.lastSync = defaultSettings().lastSync;
  if (!state.settings.c7Tier) state.settings.c7Tier = "DROPSHIPPING";
  saveJSON(STORE_KEYS.settings, state.settings);
  state.orders = generateOrders(state.products, state.today, 90);
}
function currentPage(){
  var el = document.querySelector(".page.is-active");
  return el ? el.id.replace("page-","") : "painel";
}
function startCatalog(){
  renderMining();
  var ready = catalog.loaded ? Promise.resolve() : loadCatalog();
  ready.then(function(){
    var seeded = false;
    if (loadJSON(STORE_KEYS.products, null) === null){ seedProductsFromCatalog(); seeded = true; }
    else if (refreshProductsFromCatalog()) saveJSON(STORE_KEYS.products, state.products);
    state.orders = generateOrders(state.products, state.today, 90);
    renderPainel();
    var pg = currentPage();
    if (pg !== "painel") goToPage(pg, true);
    if (seeded) toast(fmtInt(state.products.length) + " produtos com estoque do C7 Drop foram adicionados aos seus produtos.");
  }).catch(function(){
    renderMining();
    renderProdutos();
    toast("Não consegui carregar o catálogo do C7 Drop.", true);
  });
}

document.addEventListener("DOMContentLoaded", function(){ init(); startAuth(); });
})();
