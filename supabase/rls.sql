-- ============================================================
-- OLSS — Ativação de RLS (Row Level Security)
--
-- Como rodar: painel do Supabase → SQL Editor → cole este arquivo
-- inteiro → Run. Não precisa rodar em partes. Pode rodar quantas
-- vezes quiser: o script sempre leva as tabelas ao mesmo estado.
--
-- Regra: como os 3 usuários do sistema têm o mesmo nível de acesso
-- (sem hierarquia admin/técnico), a policy é simples — qualquer
-- usuário autenticado (logado) tem acesso total à tabela. Usuário
-- anônimo (não logado) não enxerga nada.
--
-- Por que o script apaga TODAS as policies antes de criar as suas:
-- policies permissivas na mesma tabela se somam com OR. Se sobrar
-- uma policy antiga concedida a `public`, ela continua liberando o
-- acesso mesmo depois de criar a policy correta — e derrubar só pelo
-- nome não basta, porque o nome antigo pode ser qualquer um.
--
-- Sobre o aviso "RLS Policy Always True" no Security Advisor: ele é
-- esperado aqui e não indica falha. O linter marca todo `using (true)`
-- porque costuma ser engano quando a policy vai para o papel `anon` ou
-- `public`. Nestas policies o `to authenticated` é a parte que protege:
-- o acesso irrestrito vale só para quem está logado, e o papel `anon`
-- fica sem policy nenhuma — ou seja, sem acesso a linha alguma.
-- ============================================================

-- 1) Garante a RLS ligada em todas as tabelas do app
alter table public.clientes                  enable row level security;
alter table public.relatorios                enable row level security;
alter table public.plataformas               enable row level security;
alter table public.lembretes                 enable row level security;
alter table public.categorias                enable row level security;
alter table public.clientes_status_historico enable row level security;

-- 2) Remove QUALQUER policy existente nessas tabelas, seja qual for o nome
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'clientes', 'relatorios', 'plataformas',
        'lembretes', 'categorias', 'clientes_status_historico'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 3) Cria a policy correta: acesso total, mas só para quem está logado
create policy "Acesso total para autenticados" on public.clientes
  for all to authenticated using (true) with check (true);

create policy "Acesso total para autenticados" on public.relatorios
  for all to authenticated using (true) with check (true);

create policy "Acesso total para autenticados" on public.plataformas
  for all to authenticated using (true) with check (true);

create policy "Acesso total para autenticados" on public.lembretes
  for all to authenticated using (true) with check (true);

create policy "Acesso total para autenticados" on public.categorias
  for all to authenticated using (true) with check (true);

create policy "Acesso total para autenticados" on public.clientes_status_historico
  for all to authenticated using (true) with check (true);

-- 4) Conferência — o resultado deve trazer 6 linhas, todas com
--    roles = {authenticated}. Qualquer {public} aqui é acesso anônimo.
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename;

-- ============================================================
-- Depois de rodar isso, crie os 3 usuários (você, dono, esposa):
-- Painel do Supabase → Authentication → Users → Add User
--   - Preencha e-mail e senha
--   - Marque "Auto Confirm User" (senão o Supabase espera
--     confirmação por e-mail antes de deixar logar)
-- Não existe cadastro público no app — só entra quem você criar
-- manualmente aqui.
-- ============================================================
