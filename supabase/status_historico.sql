-- ============================================================
-- OLSS — Histórico mensal de status de clientes
--
-- Como rodar: painel do Supabase → SQL Editor → cole este arquivo
-- inteiro → Run.
--
-- Guarda, por mês, a contagem de clientes em cada status
-- (Com contrato / Sem contrato / Em prospecção). O app grava
-- uma linha por mês e vai atualizando essa linha toda vez que
-- a Visão Geral é aberta durante aquele mês — quando o mês vira,
-- uma linha nova começa e a anterior fica congelada como histórico.
-- ============================================================

create table if not exists public.clientes_status_historico (
  id uuid primary key default gen_random_uuid(),
  mes_referencia text not null unique,
  total_clientes integer not null default 0,
  com_contrato integer not null default 0,
  sem_contrato integer not null default 0,
  em_prospeccao integer not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.clientes_status_historico enable row level security;

drop policy if exists "Acesso total para autenticados" on public.clientes_status_historico;
create policy "Acesso total para autenticados" on public.clientes_status_historico
  for all to authenticated using (true) with check (true);
