/*! Sellex — Gerador de métricas simuladas (modo demonstração)
 *
 *  Atalho: 5 cliques seguidos na logo do cabeçalho abrem a janela.
 *  Fecha no ×, com Esc ou clicando fora.
 *
 *  Gera pedidos fictícios no mesmo formato do app (state.orders) usando os
 *  produtos que o lojista já tem na conta. Tudo fica no navegador, em
 *  localStorage, e o botão "Limpar" devolve o painel aos dados reais.
 */
(function () {
  "use strict";

  var CFG = Object.assign({ cliques: 5, janela: 2500, trigger: ".sx-header__logo" }, window.SELLEX_DEMO || {});
  var CANAIS = [
    { id: "ml", nome: "Mercado Livre", peso: 34 },
    { id: "shopee", nome: "Shopee", peso: 28 },
    { id: "amazon", nome: "Amazon", peso: 22 },
    { id: "shein", nome: "Shein", peso: 16 }
  ];
  var NOMES = ["Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Larissa", "Marcos", "Natália", "Otávio", "Paula", "Rafael", "Sofia", "Thiago", "Vanessa", "Wesley"];
  var SOBRE = ["Silva", "Souza", "Oliveira", "Costa", "Pereira", "Almeida", "Lima", "Carvalho", "Ribeiro", "Martins", "Rocha", "Barbosa", "Teixeira", "Nunes"];

  var rnd = Math.random;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function ri(a, b) { return Math.floor(rnd() * (b - a + 1)) + a; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function brl(v) { return (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function num(v) { return (+v || 0).toLocaleString("pt-BR"); }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

  /* ---------- geração ---------- */
  function produtosBase() {
    var app = window.SellexApp;
    var lista = (app && app.state && app.state.products) ? app.state.products.filter(function (p) { return p && p.price > 0; }) : [];
    if (lista.length) return lista;
    return [
      { id: "demo1", name: "Fone Bluetooth Pro", price: 129.9, channel: "ml", margin: 40 },
      { id: "demo2", name: "Smartwatch Ultra", price: 199.9, channel: "shopee", margin: 35 },
      { id: "demo3", name: "Air Fryer 4L", price: 289.9, channel: "amazon", margin: 30 },
      { id: "demo4", name: "Escova Alisadora", price: 159.9, channel: "shein", margin: 45 }
    ];
  }

  function gerar(opt) {
    var o = Object.assign({ dias: 30, pedidosDia: 18, margem: 35, cancelamento: 6, crescimento: 38, semente: "", canais: ["ml", "shopee", "amazon", "shein"] }, opt || {});
    rnd = o.semente ? mulberry(hash(String(o.semente))) : Math.random;

    var canais = CANAIS.filter(function (c) { return o.canais.indexOf(c.id) >= 0; });
    if (!canais.length) canais = CANAIS.slice();
    var pesoTotal = canais.reduce(function (s, c) { return s + c.peso; }, 0);
    var produtos = produtosBase();
    var hoje = new Date(), pedidos = [], id = 10000 + ri(1000, 8999);

    for (var d = o.dias - 1; d >= 0; d--) {
      var data = new Date(hoje); data.setDate(hoje.getDate() - d);
      var prog = o.dias > 1 ? (o.dias - 1 - d) / (o.dias - 1) : 1;
      var fatorDia = [0.78, 1.08, 1.05, 1.02, 1, 1.12, 0.9][data.getDay()];
      var qtd = Math.max(0, Math.round(o.pedidosDia * (1 + (o.crescimento / 100) * prog) * fatorDia * (0.75 + rnd() * 0.5)));
      for (var i = 0; i < qtd; i++) {
        var r = rnd() * pesoTotal, canal = canais[0];
        for (var k = 0; k < canais.length; k++) { r -= canais[k].peso; if (r <= 0) { canal = canais[k]; break; } }
        var p = pick(produtos);
        var itens = rnd() < 0.82 ? 1 : ri(2, 3);
        var preco = Math.round((+p.price || 100) * (0.95 + rnd() * 0.12) * 100) / 100;
        var total = Math.round(preco * itens * 100) / 100;
        var margem = (p.margin != null ? p.margin : o.margem) / 100;
        var status = "concluido", u = rnd();
        if (u < o.cancelamento / 100) status = "cancelado";
        else if (d <= 1 && rnd() < 0.45) status = "processando";
        else if (d <= 4 && rnd() < 0.5) status = "enviado";
        pedidos.push({
          id: "ped_" + (id++), date: isoDate(data), hour: ri(8, 22),
          client: pick(NOMES) + " " + pick(SOBRE), channel: canal.id,
          productId: p.id, qty: itens, total: total,
          unitCost: Math.round(preco * (1 - margem) * 100) / 100,
          status: status
        });
      }
    }
    return pedidos;
  }

  function resumo(pedidos) {
    var v = pedidos.filter(function (o) { return o.status !== "cancelado"; });
    var fat = v.reduce(function (a, o) { return a + o.total; }, 0);
    var luc = v.reduce(function (a, o) { return a + (o.total - (o.unitCost || 0) * o.qty); }, 0);
    var canc = pedidos.filter(function (o) { return o.status === "cancelado"; }).reduce(function (a, o) { return a + o.total; }, 0);
    return { faturamento: fat, lucro: luc, cancelado: canc, pedidos: pedidos.length, ticket: v.length ? fat / v.length : 0 };
  }

  /* ---------- interface ---------- */
  var CSS = '' +
    '.sxd-ov{position:fixed;inset:0;z-index:9999;background:rgba(3,4,10,.74);backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding:24px;overflow:auto}' +
    '.sxd-ov.on{display:flex}' +
    '.sxd{width:min(820px,100%);border-radius:22px;padding:24px;color:#F3F5FF;font-family:inherit;' +
    'background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.05) 52%,transparent 68%),linear-gradient(135deg,#050409 0%,#08070F 45%,#10142A 78%,#1B2144 100%);' +
    'border:1px solid rgba(206,213,255,.3);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 40px 80px -30px rgba(0,0,0,.95)}' +
    '.sxd h3{font-size:22px;font-weight:500;letter-spacing:-.03em;margin:0}' +
    '.sxd .sub{color:#8C93B0;font-size:13.5px;margin-top:4px}' +
    '.sxd .top{display:flex;align-items:flex-start;gap:12px}' +
    '.sxd .x{margin-left:auto;background:none;border:1px solid rgba(206,213,255,.25);color:#C7CCE6;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:18px;line-height:1}' +
    '.sxd .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:18px}' +
    '.sxd label{display:block;font-size:12px;color:#8C93B0;margin-bottom:5px}' +
    '.sxd input,.sxd select{width:100%;font:400 14px inherit;color:#F3F5FF;padding:10px 12px;border-radius:10px;background:linear-gradient(135deg,#050409,#0A0C18);border:1px solid rgba(206,213,255,.18);outline:none}' +
    '.sxd input:focus,.sxd select:focus{border-color:rgba(143,163,255,.7);box-shadow:0 0 0 4px rgba(61,90,241,.16)}' +
    '.sxd .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
    '.sxd .chip{padding:8px 13px;border-radius:999px;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#050409,#0A0C18);border:1px solid rgba(206,213,255,.18);color:#8C93B0}' +
    '.sxd .chip[aria-pressed="true"]{color:#fff;border-color:rgba(188,199,255,.55);background:linear-gradient(135deg,#0B1233,#1B2C80 60%,#2E3F9A)}' +
    '.sxd .ac{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}' +
    '.sxd button.b{font:500 14px inherit;color:#fff;padding:12px 20px;border-radius:12px;cursor:pointer;border:1px solid rgba(210,218,255,.5);' +
    'background:linear-gradient(135deg,#0B1233 0%,#1B2C80 38%,#3D5AF1 75%,#8FA3FF 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}' +
    '.sxd button.b.gh{background:linear-gradient(135deg,#050409,#0A0C18 50%,#1B2248);border-color:rgba(206,213,255,.28)}' +
    '.sxd .res{margin-top:18px;border-top:1px solid rgba(255,255,255,.08);padding-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}' +
    '.sxd .res div b{display:block;font-size:19px;font-weight:500;letter-spacing:-.02em;margin-top:3px}' +
    '.sxd .res div span{font-size:11.5px;color:#8C93B0;text-transform:uppercase;letter-spacing:.06em}' +
    '.sxd .nota{font-size:12px;color:#5D6483;margin-top:14px}' +
    '@media (max-width:560px){.sxd{padding:18px;border-radius:16px}.sxd-ov{padding:12px}}';

  var ov, pedidos = null, canaisOn = CANAIS.map(function (c) { return c.id; }), salvador = null;
  if (window.claude && window.claude.use) window.claude.use("downloads").then(function (d) { salvador = d; }).catch(function () { });

  function aviso(msg) {
    if (window.SellexApp && window.SellexApp.toast) { window.SellexApp.toast(msg); return; }
    console.log("[demo]", msg);
  }

  function montar() {
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    ov = document.createElement("div"); ov.className = "sxd-ov";
    ov.innerHTML = '<div class="sxd" role="dialog" aria-modal="true" aria-label="Gerador de métricas">' +
      '<div class="top"><div><h3>Gerador de métricas</h3><div class="sub">Modo demonstração: preenche o painel com pedidos simulados.</div></div>' +
      '<button class="x" data-fechar aria-label="Fechar">×</button></div>' +
      '<div class="g">' +
      '<div><label for="sxd-dias">Período</label><select id="sxd-dias"><option value="1">Hoje</option><option value="7">7 dias</option><option value="30" selected>30 dias</option><option value="90">90 dias</option></select></div>' +
      '<div><label for="sxd-vol">Pedidos por dia</label><input id="sxd-vol" type="number" min="1" max="500" value="18"></div>' +
      '<div><label for="sxd-margem">Margem padrão (%)</label><input id="sxd-margem" type="number" min="1" max="90" value="35"></div>' +
      '<div><label for="sxd-canc">Cancelamentos (%)</label><input id="sxd-canc" type="number" min="0" max="50" value="6"></div>' +
      '<div><label for="sxd-cresc">Crescimento (%)</label><input id="sxd-cresc" type="number" min="-80" max="300" value="38"></div>' +
      '<div><label for="sxd-seed">Semente (opcional)</label><input id="sxd-seed" type="text" placeholder="repete o mesmo resultado"></div>' +
      '</div>' +
      '<div style="margin-top:14px"><label>Marketplaces</label><div class="chips" id="sxd-chips"></div></div>' +
      '<div class="ac">' +
      '<button class="b" id="sxd-gerar">Gerar dados</button>' +
      '<button class="b gh" id="sxd-json">Baixar JSON</button>' +
      '<button class="b gh" id="sxd-csv">Baixar CSV</button>' +
      '<button class="b gh" id="sxd-limpar">Limpar simulação</button>' +
      '</div><div class="res" id="sxd-res"></div>' +
      '<div class="nota">Pedidos fictícios, só para demonstração. Ficam salvos neste navegador até você clicar em Limpar. Atalho: 5 cliques seguidos na logo.</div></div>';
    document.body.appendChild(ov);

    var chips = ov.querySelector("#sxd-chips");
    CANAIS.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = c.nome;
      b.setAttribute("aria-pressed", "true"); b.setAttribute("data-mk", c.id);
      b.onclick = function () {
        var on = b.getAttribute("aria-pressed") === "true";
        if (on && canaisOn.length === 1) return;
        b.setAttribute("aria-pressed", String(!on));
        canaisOn = [].slice.call(chips.querySelectorAll('[aria-pressed="true"]')).map(function (x) { return x.getAttribute("data-mk"); });
      };
      chips.appendChild(b);
    });

    ov.addEventListener("click", function (e) { if (e.target === ov || e.target.closest("[data-fechar]")) fechar(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov.classList.contains("on")) fechar(); });
    ov.querySelector("#sxd-gerar").onclick = rodar;
    ov.querySelector("#sxd-json").onclick = function () { baixar("sellex-pedidos-" + isoDate(new Date()) + ".json", JSON.stringify(pedidos, null, 2), "application/json"); };
    ov.querySelector("#sxd-csv").onclick = function () {
      var app = window.SellexApp;
      var cab = ["pedido", "data", "cliente", "canal", "produto", "quantidade", "valor", "status"];
      var linhas = (pedidos || []).map(function (o) {
        var p = app && app.productById ? app.productById(o.productId) : null;
        return [o.id, o.date, o.client, o.channel, p ? p.name : o.productId, o.qty, o.total.toFixed(2).replace(".", ","), o.status]
          .map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(";");
      });
      baixar("sellex-pedidos-" + isoDate(new Date()) + ".csv", "﻿" + [cab.join(";")].concat(linhas).join("\n"), "text/csv");
    };
    ov.querySelector("#sxd-limpar").onclick = function () {
      pedidos = null;
      if (window.SellexApp) window.SellexApp.clearDemoOrders();
      ov.querySelector("#sxd-res").innerHTML = "";
      aviso("Simulação apagada. O painel voltou aos dados reais.");
    };
  }

  function baixar(nome, conteudo, tipo) {
    if (!pedidos || !pedidos.length) { aviso("Gere os dados primeiro."); return; }
    if (salvador) {
      salvador.save({ filename: nome, data: conteudo })
        .then(function () { aviso("Arquivo " + nome + " salvo."); })
        .catch(function () { aviso("Não consegui salvar o arquivo aqui."); });
      return;
    }
    var a = document.createElement("a");
    var url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    a.href = url; a.download = nome; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    aviso("Arquivo " + nome + " baixado.");
  }

  function rodar() {
    var v = function (id) { return ov.querySelector("#sxd-" + id).value; };
    pedidos = gerar({
      dias: +v("dias"), pedidosDia: +v("vol") || 10, margem: +v("margem") || 35,
      cancelamento: +v("canc") || 0, crescimento: +v("cresc") || 0,
      semente: v("seed").trim(), canais: canaisOn
    });
    if (window.SellexApp) window.SellexApp.setDemoOrders(pedidos);
    var r = resumo(pedidos);
    ov.querySelector("#sxd-res").innerHTML =
      [["Faturamento", brl(r.faturamento)], ["Lucro", brl(r.lucro)], ["Pedidos", num(r.pedidos)],
      ["Ticket médio", brl(r.ticket)], ["Cancelados", brl(r.cancelado)]]
        .map(function (x) { return '<div><span>' + x[0] + '</span><b>' + x[1] + '</b></div>'; }).join("");
    aviso(num(r.pedidos) + " pedidos simulados aplicados no painel.");
  }

  function abrir() { if (!ov) montar(); ov.classList.add("on"); }
  function fechar() { if (ov) ov.classList.remove("on"); }

  function ligar() {
    var alvo = document.querySelector(CFG.trigger) || document.querySelector("header img");
    if (!alvo) return;
    alvo.style.cursor = "pointer";
    var n = 0, t;
    alvo.addEventListener("click", function (e) {
      n++;
      clearTimeout(t); t = setTimeout(function () { n = 0; }, CFG.janela);
      if (n >= CFG.cliques) { e.preventDefault(); e.stopPropagation(); n = 0; abrir(); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ligar);
  else ligar();

  window.SellexDemo = { gerar: gerar, abrir: abrir, fechar: fechar, resumo: resumo };
})();
