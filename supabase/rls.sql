-- ============================================================
-- OLSS — Ativação de RLS (Row Level Security)
--
-- Como rodar: painel do Supabase → SQL Editor → cole este arquivo
-- inteiro → Run. Não precisa rodar em partes.
--
-- Regra: como os 3 usuários do sistema têm o mesmo nível de acesso
-- (sem hierarquia admin/técnico), a policy é simples — qualquer
-- usuário autenticado (logado) tem acesso total à tabela. Usuário
-- anônimo (não logado) não enxerga nada.
--
-- Sobre o aviso "RLS Policy Always True" no Security Advisor: ele é
-- esperado aqui e não indica falha. O linter marca todo `using (true)`
-- porque costuma ser engano quando a policy vai para o papel `anon` ou
-- `public`. Nestas policies o `to authenticated` é a parte que protege:
-- o acesso irrestrito vale só para quem está logado, e o papel `anon`
-- fica sem policy nenhuma — ou seja, sem acesso a linha alguma.
--
-- Para conferir a qual papel cada policy foi concedida:
--   select tablename, policyname, roles, cmd
--   from pg_policies where schemaname = 'public';
-- A coluna `roles` deve mostrar {authenticated}. Se aparecer {public},
-- a policy está exposta ao anônimo — rode este arquivo de novo.
-- ============================================================

alter table public.clientes enable row level security;
alter table public.relatorios enable row level security;
alter table public.plataformas enable row level security;
alter table public.lembretes enable row level security;
alter table public.categorias enable row level security;

drop policy if exists "Acesso total para autenticados" on public.clientes;
create policy "Acesso total para autenticados" on public.clientes
  for all to authenticated using (true) with check (true);

drop policy if exists "Acesso total para autenticados" on public.relatorios;
create policy "Acesso total para autenticados" on public.relatorios
  for all to authenticated using (true) with check (true);

drop policy if exists "Acesso total para autenticados" on public.plataformas;
create policy "Acesso total para autenticados" on public.plataformas
  for all to authenticated using (true) with check (true);

drop policy if exists "Acesso total para autenticados" on public.lembretes;
create policy "Acesso total para autenticados" on public.lembretes
  for all to authenticated using (true) with check (true);

drop policy if exists "Acesso total para autenticados" on public.categorias;
create policy "Acesso total para autenticados" on public.categorias
  for all to authenticated using (true) with check (true);

-- ============================================================
-- Depois de rodar isso, crie os 3 usuários (você, dono, esposa):
-- Painel do Supabase → Authentication → Users → Add User
--   - Preencha e-mail e senha
--   - Marque "Auto Confirm User" (senão o Supabase espera
--     confirmação por e-mail antes de deixar logar)
-- Não existe cadastro público no app — só entra quem você criar
-- manualmente aqui.
-- ============================================================
