-- Sellex: cópia na nuvem do que cada cliente faz no painel (produtos, ajustes, pedidos no fornecedor)
-- Serve para: o cliente usar em mais de um aparelho e o administrador analisar as contas.
create table if not exists public.sx_user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  products   jsonb not null default '[]'::jsonb,
  settings   jsonb,
  extra      jsonb,
  stats      jsonb,
  updated_at timestamptz not null default now()
);
alter table public.sx_user_state enable row level security;

drop policy if exists "sx_state_select_own" on public.sx_user_state;
drop policy if exists "sx_state_insert_own" on public.sx_user_state;
drop policy if exists "sx_state_update_own" on public.sx_user_state;
create policy "sx_state_select_own" on public.sx_user_state for select to authenticated using (auth.uid() = user_id);
create policy "sx_state_insert_own" on public.sx_user_state for insert to authenticated with check (auth.uid() = user_id);
create policy "sx_state_update_own" on public.sx_user_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- o administrador lê pela função sx-admin (chave de serviço), não por política pública.
