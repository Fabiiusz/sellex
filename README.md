# Sellex — Sistema

Painel de vendedor multicanal ligado ao catálogo real do fornecedor C7 Drop (via Supabase).
Produtos e Mineração mostram os produtos reais do C7, com foto, custo da sua faixa e estoque.
Vendas e pedidos ainda são de demonstração, até a conexão com o Mercado Livre.

## Estrutura

```
index.html          página principal (abre direto no navegador, sem build)
css/
  sellex-ui.css      design system (cores, componentes)
  app-extra.css      estilos específicos do app (cards, mineração, dashboards)
js/
  app.js             toda a lógica: dados, cálculos e renderização
fonts/
  Geist-Variable.woff2
assets/
  sellex-logo.png, shopee.png, ml.png, amazon.png, shein.png
```

## Como usar

Não precisa de servidor nem build: basta abrir `index.html` no navegador,
ou publicar a pasta inteira em qualquer hospedagem estática (GitHub Pages,
Vercel, Netlify etc.).

Seus produtos escolhidos e as configurações ficam salvos no `localStorage` do navegador.
O catálogo vem da tabela `catalog_products` do Supabase (projeto `vcqntqhfyollatevvntq`),
atualizada sozinha a partir do C7 Drop. Precisa de internet para carregar.

## Login e Mercado Livre

- Cada lojista cria a própria conta (e-mail e senha, Supabase Auth). Produtos e configurações ficam separados por conta.
- Em **Integrações**, o botão "Conectar Mercado Livre" leva o lojista à tela de autorização do ML e traz de volta ao Sellex.
- Para funcionar, o servidor precisa destes segredos (Supabase > Edge Functions > Secrets):
  `ML_CLIENT_ID`, `ML_CLIENT_SECRET` e `APP_URL` (o endereço deste site, ex.: GitHub Pages).
- Endereço de retorno para cadastrar no app do Mercado Livre:
  `https://vcqntqhfyollatevvntq.supabase.co/functions/v1/ml-callback`

